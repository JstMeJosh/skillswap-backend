// Swap CRUD, ownership authorization, and the privacy guarantee that the public
// listing never leaks contact info (whatsapp).
jest.mock("../utils/sendMail");

const request = require("supertest");
const db = require("./db");
const { registerUser, bearer } = require("./helpers");

let app;

beforeAll(async () => {
  await db.connect();
  app = require("../server");
  await db.ready();
});

afterEach(async () => {
  await db.clear();
});

afterAll(async () => {
  await db.close();
});

const sampleSwap = {
  title: "Guitar lessons",
  skillOffered: "Guitar",
  skillWanted: "Spanish",
  description: "Weekly sessions",
};

async function createSwap(token, body = sampleSwap) {
  return request(app)
    .post("/api/swaps")
    .set("Authorization", bearer(token))
    .send(body);
}

describe("POST /api/swaps", () => {
  it("creates a swap for the authenticated user (201)", async () => {
    const { token } = await registerUser(app);
    const res = await createSwap(token);
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.title).toBe("Guitar lessons");
  });

  it("requires authentication (401)", async () => {
    const res = await request(app).post("/api/swaps").send(sampleSwap);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/swaps", () => {
  it("returns a paginated shape and never exposes whatsapp", async () => {
    const { token } = await registerUser(app);
    await createSwap(token);

    const res = await request(app).get("/api/swaps");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("swaps");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pages");
    expect(res.body).toHaveProperty("total");
    expect(res.body.swaps).toHaveLength(1);
    // Contact info must be hidden on the public marketplace.
    expect(res.body.swaps[0].whatsapp).toBeUndefined();
    // Author is populated with safe fields only.
    expect(res.body.swaps[0].user.name).toBeDefined();
    expect(res.body.swaps[0].user.whatsapp).toBeUndefined();
  });
});

describe("GET /api/swaps/mine", () => {
  it("returns only the caller's swaps", async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    await createSwap(a.token, { ...sampleSwap, title: "A's swap" });
    await createSwap(b.token, { ...sampleSwap, title: "B's swap" });

    const res = await request(app)
      .get("/api/swaps/mine")
      .set("Authorization", bearer(a.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("A's swap");
  });
});

describe("PUT /api/swaps/:id", () => {
  it("lets the owner update their swap", async () => {
    const { token } = await registerUser(app);
    const created = await createSwap(token);

    const res = await request(app)
      .put(`/api/swaps/${created.body._id}`)
      .set("Authorization", bearer(token))
      .send({ title: "Updated title" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated title");
  });

  it("forbids a non-owner from updating (403)", async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    const created = await createSwap(owner.token);

    const res = await request(app)
      .put(`/api/swaps/${created.body._id}`)
      .set("Authorization", bearer(other.token))
      .send({ title: "Hijacked" });

    expect(res.status).toBe(403);
  });

  it("ignores non-whitelisted fields like whatsapp/user", async () => {
    const { token } = await registerUser(app);
    const created = await createSwap(token);

    await request(app)
      .put(`/api/swaps/${created.body._id}`)
      .set("Authorization", bearer(token))
      .send({ title: "Legit", whatsapp: "+1000000000000" });

    // getMySwaps returns the full doc (incl. whatsapp) — confirm it's unchanged.
    const mine = await request(app)
      .get("/api/swaps/mine")
      .set("Authorization", bearer(token));
    expect(mine.body[0].title).toBe("Legit");
    expect(mine.body[0].whatsapp).toBe("+2348012345678");
  });

  it("returns 404 for a missing swap", async () => {
    const { token } = await registerUser(app);
    const res = await request(app)
      .put("/api/swaps/000000000000000000000000")
      .set("Authorization", bearer(token))
      .send({ title: "x" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/swaps/:id", () => {
  it("lets the owner delete their swap", async () => {
    const { token } = await registerUser(app);
    const created = await createSwap(token);
    const res = await request(app)
      .delete(`/api/swaps/${created.body._id}`)
      .set("Authorization", bearer(token));
    expect(res.status).toBe(200);
  });

  it("forbids a non-owner from deleting (403)", async () => {
    const owner = await registerUser(app);
    const other = await registerUser(app);
    const created = await createSwap(owner.token);
    const res = await request(app)
      .delete(`/api/swaps/${created.body._id}`)
      .set("Authorization", bearer(other.token));
    expect(res.status).toBe(403);
  });
});
