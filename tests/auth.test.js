// Auth flow: register, login, forgot/reset password, and the protect middleware.
// Email sending is mocked so no real mail is attempted.
jest.mock("../utils/sendMail");

const request = require("supertest");
const db = require("./db");
const { registerUser } = require("./helpers");

let app;
let User;

beforeAll(async () => {
  await db.connect();
  app = require("../server");
  User = require("../models/User");
  await db.ready();
});

afterEach(async () => {
  await db.clear();
});

afterAll(async () => {
  await db.close();
});

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token with a sanitized user (_id, no password)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "Password123",
      whatsapp: "+2348012345678",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user._id).toBeDefined();
    expect(res.body.user.email).toBe("ada@example.com");
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.resetPasswordToken).toBeUndefined();
  });

  it("rejects a duplicate email", async () => {
    await registerUser(app, { email: "dupe@example.com" });
    const res = await request(app).post("/api/auth/register").send({
      name: "Someone",
      email: "dupe@example.com",
      password: "Password123",
      whatsapp: "+2348012345678",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("rejects a password with no digit", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Weak Pw",
      email: "weak@example.com",
      password: "onlyletters",
      whatsapp: "+2348012345678",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/number/i);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and returns _id, no password", async () => {
    await registerUser(app, { email: "login@example.com", password: "Password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user._id).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects a wrong password with 401", async () => {
    await registerUser(app, { email: "wrong@example.com", password: "Password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong@example.com", password: "Nope12345" });
    expect(res.status).toBe(401);
  });

  it("rejects an unknown email with 401 (no user enumeration)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "Password123" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/forgotpassword", () => {
  it("returns the same generic message whether or not the email exists", async () => {
    await registerUser(app, { email: "real@example.com" });

    const existing = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "real@example.com" });
    const missing = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(existing.status).toBe(200);
    expect(missing.status).toBe(200);
    expect(missing.body.message).toBe(existing.body.message);
  });

  it("rejects a malformed email with 400", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/auth/resetpassword/:resetToken", () => {
  it("rejects an invalid/expired token with 400", async () => {
    const res = await request(app)
      .put("/api/auth/resetpassword/deadbeeftoken")
      .send({ password: "NewPassword123" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or expired/i);
  });

  it("resets the password with a valid token, then the new password logs in", async () => {
    const { user } = await registerUser(app, { email: "reset@example.com" });

    // Mint a real reset token the same way forgotPassword does.
    const doc = await User.findById(user._id);
    const rawToken = doc.getResetPasswordToken();
    await doc.save({ validateBeforeSave: false });

    const reset = await request(app)
      .put(`/api/auth/resetpassword/${rawToken}`)
      .send({ password: "BrandNew123" });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset@example.com", password: "BrandNew123" });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
  });
});

describe("protect middleware", () => {
  it("blocks a protected route without a token (401)", async () => {
    const res = await request(app).get("/api/swaps/mine");
    expect(res.status).toBe(401);
  });

  it("blocks a protected route with a malformed token (401)", async () => {
    const res = await request(app)
      .get("/api/swaps/mine")
      .set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });
});
