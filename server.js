const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const swapRoutes = require("./routes/swapRoutes");
const requestRoutes = require("./routes/requestRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

app.use(helmet());
app.use(express.json());

// Allowed origins are env-driven (comma-separated) with sensible defaults.
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,https://skillswap-delta-eight.vercel.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rate limiting: a broad cap on the whole API, plus a tight cap on auth
// endpoints (login/register/forgot are the brute-force targets). Skipped under
// NODE_ENV=test so the test suite can make many calls deterministically.
const isTest = process.env.NODE_ENV === "test";
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

app.use("/api", generalLimiter);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected");
  })
  .catch((err) => {
    console.log("DB Connection failed", err);
  });

app.get("/", (req, res) => {
  res.json({ status: "SkillSwap API running" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/swaps", swapRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);

// Run a real listener only when started directly (`node server.js`).
// On Vercel (and in tests) the app is imported, so listening is skipped.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
