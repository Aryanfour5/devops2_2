const request = require("supertest");
const app = require("../app");

describe("API Endpoints", () => {
  test("GET /health should return healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });

  test("GET /api/users should return user list", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  test("POST /api/users should create new user", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Bob", email: "bob@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Bob");
    expect(res.body.email).toBe("bob@example.com");
  });

  test("POST /api/users should fail without email", async () => {
    const res = await request(app).post("/api/users").send({ name: "Invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("GET /api/sum/:a/:b should return sum", async () => {
    const res = await request(app).get("/api/sum/5/3");
    expect(res.status).toBe(200);
    expect(res.body.sum).toBe(8);
  });

  test("Application should export app module", () => {
    expect(app).toBeDefined();
  });
});
