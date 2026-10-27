const jobs = new Map();

const createAbortedError = (products = []) => {
  const error = new Error("Ingest stopped");
  error.code = "INGEST_ABORTED";
  error.products = products;
  return error;
};

const throwIfAborted = (signal, products = []) => {
  if (signal?.aborted) {
    throw createAbortedError(products);
  }
};

const beginIngest = (catalogId) => {
  const existing = jobs.get(catalogId);
  if (existing) existing.abort();
  const controller = new AbortController();
  jobs.set(catalogId, controller);
  return controller;
};

const abortIngestJob = (catalogId) => {
  const controller = jobs.get(catalogId);
  if (!controller) return false;
  controller.abort();
  return true;
};

const endIngest = (catalogId, controller) => {
  if (jobs.get(catalogId) === controller) {
    jobs.delete(catalogId);
  }
};

module.exports = {
  beginIngest,
  abortIngestJob,
  endIngest,
  throwIfAborted,
  createAbortedError,
};
