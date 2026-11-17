import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { connectDB } from "./src/config/database";
import {
  PORT,
  FRONTEND_URL,
  TRUST_PROXY,
  assertTokenEncryptionKey,
} from "./src/config/env";
import authRoutes from "./src/routes/authRoutes";
import cookieParser from "cookie-parser";
import { errorMessage, errorStatus } from "./src/utils/httpError";
import tenantRoutes from "./src/routes/tenantRoutes";
import catalogRoutes from "./src/routes/CatalogRoutes";
import productRoutes from "./src/routes/productRoutes";
import matchRoutes from "./src/routes/matchRoutes";
import exportRoutes from "./src/routes/exportRoutes";
const app = express();

// Number of proxies in front of the API, so rate limits see the real client IP.
app.set("trust proxy", TRUST_PROXY);

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
); 
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Backend is running!" });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/catalogs", catalogRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/matches", matchRoutes);
app.use("/api/v1/export", exportRoutes);
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = errorStatus(err);
  console.error(`[http] ${req.method} ${req.originalUrl} ${status}: ${errorMessage(err)}`);
  if (err instanceof Error && err.stack) console.error(err.stack);
  res.status(status).json({
    message: (err instanceof Error && err.message) || "Internal server error",
  });
});

const port = PORT || 3000;

assertTokenEncryptionKey();

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
