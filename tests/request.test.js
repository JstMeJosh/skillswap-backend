// Swap-request workflow: creation guards, incoming/outgoing views, the
// role-based accept/decline/cancel transitions, and the privacy contract that
// contact info is revealed only once a request is accepted.
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

// Build the common fixture: an owner with a swap, and a separate requester.
async function scenario() {
  const owner = await registerUser(app, { whatsapp: "+2348011111111" });
  const requester = await registerUser(app, { whatsapp: "+2348022222222" });
  const swapRes = await request(app)
    .post("/api/swaps")
    .set("Authorization", bearer(owner.token))
    .send({
      title: "Piano lessons",
      skillOffered: "Piano",
      skillWanted: "Guitar",
      description: "Trade lessons",
    });
  return { owner, requester, swap: swapRes.body };
}

function sendRequest(swapId, token, message) {
  return request(app)
    .post(`/api/swaps/${swapId}/requests`)
    .set("Authorization", bearer(token))
    .send(message ? { message } : {});
}

describe("POST /api/swaps/:id/requests", () => {
  it("creates a pending request (201)", async () => {
    const { requester, swap } = await scenario();
    const res = await sendRequest(swap._id, requester.token, "Keen to learn!");
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
  });

  it("rejects requesting your own swap (400)", async () => {
    const { owner, swap } = await scenario();
    const res = await sendRequest(swap._id, owner.token);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/your own swap/i);
  });

  it("rejects a duplicate active request (409)", async () => {
    const { requester, swap } = await scenario();
    await sendRequest(swap._id, requester.token);
    const dup = await sendRequest(swap._id, requester.token);
    expect(dup.status).toBe(409);
  });

  it("returns 404 for a missing swap", async () => {
    const { requester } = await scenario();
    const res = await sendRequest("000000000000000000000000", requester.token);
    expect(res.status).toBe(404);
  });
});

describe("GET incoming/outgoing (contact hidden while pending)", () => {
  it("owner sees the incoming request with the requester's whatsapp hidden", async () => {
    const { owner, requester, swap } = await scenario();
    await sendRequest(swap._id, requester.token);

    const res = await request(app)
      .get("/api/requests/incoming")
      .set("Authorization", bearer(owner.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].requester.name).toBeDefined();
    expect(res.body[0].requester.whatsapp).toBeUndefined();
  });

  it("requester sees the outgoing request with the owner's whatsapp hidden", async () => {
    const { requester, swap } = await scenario();
    await sendRequest(swap._id, requester.token);

    const res = await request(app)
      .get("/api/requests/outgoing")
      .set("Authorization", bearer(requester.token));

    expect(res.status).toBe(200);
    expect(res.body[0].owner.whatsapp).toBeUndefined();
  });
});

describe("PATCH /api/requests/:id transitions", () => {
  it("owner accepts → status accepted and BOTH parties' whatsapp revealed", async () => {
    const { owner, requester, swap } = await scenario();
    const created = await sendRequest(swap._id, requester.token);

    const res = await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(owner.token))
      .send({ status: "accepted" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
    expect(res.body.requester.whatsapp).toBe("+2348022222222");
    expect(res.body.owner.whatsapp).toBe("+2348011111111");

    // And the reveal persists on subsequent reads.
    const incoming = await request(app)
      .get("/api/requests/incoming")
      .set("Authorization", bearer(owner.token));
    expect(incoming.body[0].requester.whatsapp).toBe("+2348022222222");
  });

  it("forbids the requester from accepting (403)", async () => {
    const { requester, swap } = await scenario();
    const created = await sendRequest(swap._id, requester.token);
    const res = await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(requester.token))
      .send({ status: "accepted" });
    expect(res.status).toBe(403);
  });

  it("forbids the owner from cancelling (403)", async () => {
    const { owner, requester, swap } = await scenario();
    const created = await sendRequest(swap._id, requester.token);
    const res = await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(owner.token))
      .send({ status: "cancelled" });
    expect(res.status).toBe(403);
  });

  it("rejects transitioning a non-pending request (409)", async () => {
    const { owner, requester, swap } = await scenario();
    const created = await sendRequest(swap._id, requester.token);
    await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(owner.token))
      .send({ status: "accepted" });

    const again = await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(owner.token))
      .send({ status: "declined" });
    expect(again.status).toBe(409);
  });

  it("lets a requester re-open a declined request", async () => {
    const { owner, requester, swap } = await scenario();
    const created = await sendRequest(swap._id, requester.token);
    await request(app)
      .patch(`/api/requests/${created.body._id}`)
      .set("Authorization", bearer(owner.token))
      .send({ status: "declined" });

    // Re-requesting after a decline should succeed (re-opened to pending).
    const reopened = await sendRequest(swap._id, requester.token);
    expect(reopened.status).toBe(201);
    expect(reopened.body.status).toBe("pending");
  });
});
