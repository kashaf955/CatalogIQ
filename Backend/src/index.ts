import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";
import productRoutes from "./routes/productRoutes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/products", productRoutes);

const port = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`CatalogIQ backend listening on port ${port}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
