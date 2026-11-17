import type { CatalogType, ConnectionKind } from "../types/api";

export const typeLabel: Record<CatalogType, string> = {
  our_catalog: "Company catalog",
  manufacturer: "Manufacturer",
  competitor: "Competitor",
};

export const kindLabel: Record<ConnectionKind, string> = {
  api: "API",
  csv: "CSV",
  excel: "Excel",
  feed: "Feed",
  website: "Website",
};

export const connectionLabel = (kind?: ConnectionKind) =>
  kind ? kindLabel[kind] : undefined;
