const dotenv = require("dotenv");

dotenv.config();

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/catalogiq";
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;

module.exports = {
  PORT,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
};
