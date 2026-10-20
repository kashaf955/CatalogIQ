const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/database");
const { PORT, FRONTEND_URL } = require("./src/config/env");
const authRoutes = require("./src/routes/authRoutes");
const cookieParser = require("cookie-parser");
const tenantRoutes = require("./src/routes/tenantRoutes");
const catalogRoutes = require("./src/routes/CatalogRoutes");
const productRoutes = require("./src/routes/productRoutes");
const app = express();

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

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running!" });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/catalogs", catalogRoutes);
app.use("/api/v1/products", productRoutes);
app.use((err, req, res, _next) => {
  console.error(`[http] ${req.method} ${req.originalUrl} ${err.status || 500}: ${err.message}`);
  if (err.stack) console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

const port = PORT || 3000;

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
