import axios from "axios";
import type {
  CompetitorSite,
  ImportSummary,
  Manufacturer,
  ManufacturerProduct,
  MatchResult,
  OurProduct,
  OverviewStats,
  ProcessingRun,
  StandardProductFields,
  UploadPreview,
} from "./types";

export const http = axios.create({ baseURL: "/api" });

export const overviewApi = {
  get: () => http.get<OverviewStats>("/overview").then((r) => r.data),
};

export const ourCatalogApi = {
  list: (params?: { brand?: string; category?: string; search?: string }) =>
    http.get<OurProduct[]>("/our-catalog", { params }).then((r) => r.data),
  create: (body: StandardProductFields) =>
    http.post<OurProduct>("/our-catalog", body).then((r) => r.data),
  remove: (id: string) => http.delete(`/our-catalog/${id}`),
  previewUpload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<UploadPreview>("/our-catalog/upload/preview", form).then((r) => r.data);
  },
  importUpload: (file: File, fieldMap: Record<string, string>) => {
    const form = new FormData();
    form.append("file", file);
    form.append("fieldMap", JSON.stringify(fieldMap));
    return http.post<ImportSummary>("/our-catalog/upload/import", form).then((r) => r.data);
  },
};

export const manufacturersApi = {
  list: () => http.get<Manufacturer[]>("/manufacturers").then((r) => r.data),
  create: (name: string) => http.post<Manufacturer>("/manufacturers", { name }).then((r) => r.data),
  remove: (id: string) => http.delete(`/manufacturers/${id}`),
  brands: (id: string) =>
    http.get<{ brand: string; count: number }[]>(`/manufacturers/${id}/brands`).then((r) => r.data),
  previewUpload: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<UploadPreview>(`/manufacturers/${id}/upload/preview`, form).then((r) => r.data);
  },
  importUpload: (id: string, file: File, fieldMap: Record<string, string>, brandColumn?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("fieldMap", JSON.stringify(fieldMap));
    if (brandColumn) form.append("brandColumn", brandColumn);
    return http.post<ImportSummary>(`/manufacturers/${id}/upload/import`, form).then((r) => r.data);
  },
};

export const manufacturerProductsApi = {
  list: (params?: { manufacturer?: string; brand?: string; status?: string; search?: string }) =>
    http.get<ManufacturerProduct[]>("/manufacturer-products", { params }).then((r) => r.data),
};

export const competitorsApi = {
  list: () => http.get<CompetitorSite[]>("/competitors").then((r) => r.data),
  create: (body: Pick<CompetitorSite, "name" | "baseUrl" | "selectors">) =>
    http.post<CompetitorSite>("/competitors", body).then((r) => r.data),
  remove: (id: string) => http.delete(`/competitors/${id}`),
  scrape: (id: string, matchResultIds: string[]) =>
    http
      .post<{ processingRunId: string; attempted: number; found: number; errors: string[] }>(
        `/competitors/${id}/scrape`,
        { matchResultIds }
      )
      .then((r) => r.data),
};

export const matchingApi = {
  run: (manufacturerId: string, brands: string[]) =>
    http
      .post<{ processingRunId: string; manufacturerProductsProcessed: number; matchResultsWritten: number }>(
        "/matching/run",
        { manufacturerId, brands }
      )
      .then((r) => r.data),
};

export const comparisonApi = {
  list: (params: {
    manufacturer?: string;
    brand?: string;
    matchStatus?: string;
    reviewStatus?: string;
    category?: string;
    search?: string;
  }) => http.get<MatchResult[]>("/comparison", { params }).then((r) => r.data),
};

export const reviewQueueApi = {
  list: (params?: { manufacturer?: string; brand?: string }) =>
    http.get<MatchResult[]>("/review-queue", { params }).then((r) => r.data),
  decide: (id: string, action: "approve" | "reject" | "variant" | "needs-info", notes?: string) =>
    http.patch<MatchResult>(`/review-queue/${id}/${action}`, { notes }).then((r) => r.data),
};

export const processingRunsApi = {
  list: () => http.get<ProcessingRun[]>("/processing-runs").then((r) => r.data),
};

export const exportsApi = {
  updateCsvUrl: (params: { manufacturer?: string; brand?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][]
    ).toString();
    return `/api/exports/update-csv${query ? `?${query}` : ""}`;
  },
};
