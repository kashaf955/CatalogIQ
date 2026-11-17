import { IngestAbortedError } from "./httpError";

const jobs = new Map<string, AbortController>();

const createAbortedError = <T>(products: T[] = []) => new IngestAbortedError(products);

const throwIfAborted = <T>(signal: AbortSignal | undefined, products: T[] = []) => {
  if (signal?.aborted) {
    throw createAbortedError(products);
  }
};

const beginIngest = (catalogId: string) => {
  const existing = jobs.get(catalogId);
  if (existing) existing.abort();
  const controller = new AbortController();
  jobs.set(catalogId, controller);
  return controller;
};

const abortIngestJob = (catalogId: string) => {
  const controller = jobs.get(catalogId);
  if (!controller) return false;
  controller.abort();
  return true;
};

const endIngest = (catalogId: string, controller: AbortController) => {
  if (jobs.get(catalogId) === controller) {
    jobs.delete(catalogId);
  }
};

export {
  beginIngest,
  abortIngestJob,
  endIngest,
  throwIfAborted,
  createAbortedError,
};
