const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/database");
const { PORT, FRONTEND_URL } = require("./src/config/env");
const authRoutes = require("./src/routes/authRoutes");
const cookieParser = require("cookie-parser");
const tenantRoutes = require("./src/routes/tenantRoutes");
const catalogRoutes = require("./src/routes/CatalogRoutes");
const {authenticate} = require("./src/middleware/auth");
const app = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
); 
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running!" });
});
app.use(authenticate);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/tenants", tenantRoutes);
app.use("/api/v1/catalogs", catalogRoutes);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
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
