// Helpers for reading JSON from outside systems, whose shape is not known.

export type JsonObject = Record<string, unknown>;

export const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// value[key] when value is an object, otherwise undefined.
export const field = (value: unknown, key: string): unknown =>
  isObject(value) ? value[key] : undefined;

// value[key] as a string, or "" when it is missing or not text-like.
export const fieldText = (value: unknown, key: string): string => {
  const item = field(value, key);
  return typeof item === "string" || typeof item === "number" ? String(item) : "";
};
