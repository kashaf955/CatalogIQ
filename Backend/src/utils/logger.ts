const SECRET_KEYS = /token|secret|password|authorization/i;

const redactText = (value: unknown) =>
  String(value)
    .replace(/(Bearer\s+)\S+/gi, "$1[redacted]")
    .replace(/(accessToken=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(X-Auth-Token:\s*)\S+/gi, "$1[redacted]");

const redactValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = SECRET_KEYS.test(key) ? "[redacted]" : redactValue(item);
    }
    return next;
  }
  return value;
};

interface ErrorLike {
  message?: string;
  stack?: string;
  status?: number;
  code?: string | number;
  cause?: { message?: string };
}

const asErrorLike = (error: unknown): ErrorLike =>
  error && typeof error === "object" ? (error as ErrorLike) : {};

const extraOf = (error: ErrorLike) => {
  const extra: Record<string, unknown> = {};
  if (error.status) extra.status = error.status;
  if (error.code) extra.code = error.code;
  if (error.cause?.message) extra.cause = error.cause.message;
  return extra;
};

const logError = (scope: string, error: unknown, details: Record<string, unknown> = {}) => {
  const info = asErrorLike(error);
  const extra = redactValue({ ...extraOf(info), ...details }) as Record<string, unknown>;
  console.error(`[${scope}] ${redactText(info.message || String(error))}`);
  if (Object.keys(extra).length > 0) {
    console.error(`[${scope}]`, extra);
  }
  if (info.stack) {
    console.error(info.stack);
  }
};

export { logError };
