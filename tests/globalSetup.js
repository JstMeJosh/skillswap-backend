// Start a single in-memory MongoDB for the entire test run and expose its URI
// via process.env *before* any test file requires ../server (so the app
// connects here, not to a real database). One mongod for the whole run — far
// more reliable than a cold start per suite. The launchTimeout is generous
// because the first startup on a cold/slow machine can exceed the 10s default.
const { MongoMemoryServer } = require("mongodb-memory-server");

module.exports = async () => {
  const instance = await MongoMemoryServer.create({
    instance: { launchTimeout: 60000 },
  });
  global.__MONGOINSTANCE = instance;
  process.env.MONGO_URI = instance.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
  process.env.CLIENT_URL = "http://localhost:5173";
  process.env.NODE_ENV = "test";
};
