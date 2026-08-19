const request = require("supertest");

let counter = 0;

// Register a fresh, valid user through the real API and return the issued
// token plus the sanitized user. Each call uses a unique email so tests can
// create several users without colliding on the unique index.
async function registerUser(app, overrides = {}) {
  counter += 1;
  const payload = {
    name: `User ${counter}`,
    email: `user${counter}@example.com`,
    password: "Password123",
    whatsapp: "+2348012345678",
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(payload);
  return { res, token: res.body.token, user: res.body.user, password: payload.password };
}

const bearer = (token) => `Bearer ${token}`;

module.exports = { registerUser, bearer };
