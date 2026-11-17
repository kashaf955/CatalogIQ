import dns from "dns";
import net from "net";
import { Agent, fetch } from "undici";
import { HttpError } from "./httpError";

const MAX_REDIRECTS = 5;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

// Addresses a customer-supplied URL must never reach: this server, the private
// network it sits on, and the cloud metadata service.
const blocked = new net.BlockList();
([
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as [string, number][]).forEach(([address, prefix]) => blocked.addSubnet(address, prefix, "ipv4"));
([
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as [string, number][]).forEach(([address, prefix]) => blocked.addSubnet(address, prefix, "ipv6"));

const isPrivateAddress = (address: string) => {
  const family = net.isIP(address);
  if (!family) return true;
  return blocked.check(address, family === 6 ? "ipv6" : "ipv4");
};

const blockedUrlError = () => {
  const error = new HttpError("This URL points to a private address and cannot be used", 400);
  return error;
};

const assertPublicUrl = async (value: string): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    const error = new HttpError("URL is invalid", 400);
    throw error;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    const error = new HttpError("URL must be http or https", 400);
    throw error;
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw blockedUrlError();
    return parsed;
  }

  let addresses;
  try {
    addresses = await dns.promises.lookup(host, { all: true });
  } catch {
    const error = new HttpError(`Could not find ${host}`, 400);
    throw error;
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw blockedUrlError();
  }
  return parsed;
};

// Checked again when connecting, so a hostname cannot pass assertPublicUrl and
// then resolve to a private address.
const publicLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "");
    if (addresses.some(({ address }) => isPrivateAddress(address))) {
      return callback(blockedUrlError(), "");
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};

const dispatcher = new Agent({ connect: { lookup: publicLookup } });

// fetch for customer-supplied URLs. Every redirect is checked too, and auth
// headers are dropped when a redirect leaves the original site.
interface SafeFetchOptions {
  // Dropped when a redirect leaves the original site (e.g. auth headers).
  headers?: Record<string, string>;
  // Always sent (e.g. Accept, User-Agent).
  publicHeaders?: Record<string, string>;
  signal?: AbortSignal;
}

const safeFetch = async (
  url: string,
  { headers = {}, publicHeaders = {}, signal }: SafeFetchOptions = {}
) => {
  let current = url;
  let sensitive = headers;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = await assertPublicUrl(current);
    const response = await fetch(parsed.toString(), {
      headers: { ...publicHeaders, ...sensitive },
      redirect: "manual",
      signal,
      dispatcher,
    });

    const location = response.headers.get("location");
    if (!REDIRECTS.has(response.status) || !location) return response;

    await response.body?.cancel();
    const next = new URL(location, parsed);
    if (next.origin !== parsed.origin) sensitive = {};
    current = next.toString();
  }

  const error = new HttpError("Too many redirects", 502);
  throw error;
};

export { assertPublicUrl, safeFetch, isPrivateAddress };
