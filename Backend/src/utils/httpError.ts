// An error that carries the HTTP status the API should answer with.
export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// Thrown when a person stops an ingest; carries what was saved so far.
export class IngestAbortedError<T = unknown> extends Error {
  readonly code = "INGEST_ABORTED";
  products: T[];

  constructor(products: T[] = []) {
    super("Ingest stopped");
    this.name = "IngestAbortedError";
    this.products = products;
  }
}

// Caught values are `unknown` in TypeScript; these read them safely.
// Any numeric `status` counts, not only HttpError's: Express's body parser
// and multer throw errors with their own status (e.g. 400 for bad JSON).
export const errorStatus = (error: unknown): number => {
  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: unknown }).status
      : undefined;
  return typeof status === "number" && status > 0 ? status : 500;
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// MongoDB duplicate-key errors (unique index) have code 11000.
export const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: unknown }).code === 11000;
