const SECRET_KEYS = /token|secret|password|authorization/i;

const redactText = (value) =>
  String(value)
    .replace(/(Bearer\s+)\S+/gi, "$1[redacted]")
    .replace(/(accessToken=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(X-Auth-Token:\s*)\S+/gi, "$1[redacted]");

const redactValue = (value) => {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      next[key] = SECRET_KEYS.test(key) ? "[redacted]" : redactValue(item);
    }
    return next;
  }
  return value;
};

const extraOf = (error) => {
  const extra = {};
  if (error?.status) extra.status = error.status;
  if (error?.code) extra.code = error.code;
  if (error?.cause?.message) extra.cause = error.cause.message;
  return extra;
};

const logError = (scope, error, details = {}) => {
  const extra = redactValue({ ...extraOf(error), ...details });
  console.error(`[${scope}] ${redactText(error?.message || String(error))}`);
  if (Object.keys(extra).length > 0) {
    console.error(`[${scope}]`, extra);
  }
  if (error?.stack) {
    console.error(error.stack);
  }
};

module.exports = { logError };
