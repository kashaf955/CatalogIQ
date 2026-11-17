// Request values (query string, JSON body) can be strings, arrays or objects.
// Reading them through these helpers keeps an object such as {"$ne": null}
// from reaching a MongoDB filter as a query operator.

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const asInt = (value: unknown, fallback: number): number => {
  const parsed = parseInt(asString(value) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item !== "")
    : [];
