import "dotenv/config";
import http from "http";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { ZodError } from "zod";
import { connectDB } from "./config/db";
import { initSocket } from "./queue/socket";

import ourCatalogRoutes from "./routes/ourCatalog";
import manufacturerRoutes from "./routes/manufacturers";
import manufacturerProductRoutes from "./routes/manufacturerProducts";
import competitorRoutes from "./routes/competitors";
import matchingRoutes from "./routes/matching";
import comparisonRoutes from "./routes/comparison";
import reviewQueueRoutes from "./routes/reviewQueue";
import processingRunRoutes from "./routes/processingRuns";
import exportRoutes from "./routes/exports";
import overviewRoutes from "./routes/overview";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/overview", overviewRoutes);
app.use("/api/our-catalog", ourCatalogRoutes);
app.use("/api/manufacturers", manufacturerRoutes);
app.use("/api/manufacturer-products", manufacturerProductRoutes);
app.use("/api/competitors", competitorRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/comparison", comparisonRoutes);
app.use("/api/review-queue", reviewQueueRoutes);
app.use("/api/processing-runs", processingRunRoutes);
app.use("/api/exports", exportRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error(err);
  res.status(500).json({ error: message });
});

const port = process.env.PORT || 4000;
const httpServer = http.createServer(app);
initSocket(httpServer);

connectDB()
  .then(() => {
    httpServer.listen(port, () => console.log(`CatalogIQ backend listening on port ${port}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
