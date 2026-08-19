// Per-suite mongoose connection lifecycle. The shared in-memory MongoDB is
// started once in tests/globalSetup.js, which also sets MONGO_URI *before* any
// suite requires ../server — so the app connects to the ephemeral database.
const mongoose = require("mongoose");

// Kept for symmetry with existing suites; env is already set by globalSetup.
// Idempotent defaults in case a suite is run in isolation.
async function connect() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
  process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  process.env.NODE_ENV = "test";
}

// Wait for whoever called mongoose.connect() (server.js) to finish connecting.
async function ready() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connection.asPromise();
}

// Wipe every collection between tests so cases stay independent.
async function clear() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

// Close this suite's connection. The mongod itself is stopped in globalTeardown.
async function close() {
  await mongoose.connection.close();
}

module.exports = { connect, ready, clear, close };
