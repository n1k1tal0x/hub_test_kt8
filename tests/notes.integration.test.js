const request = require("supertest");
const createApp = require("../src/app");
const store = require("../src/notesStore");

describe("Notes API — integration tests", () => {
  let app;

  beforeEach(() => {
    store.reset();
    app = createApp();
  });

  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("GET /notes returns an empty list initially", async () => {
    const res = await request(app).get("/notes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("POST /notes creates a note and it appears in GET /notes", async () => {
    const createRes = await request(app)
      .post("/notes")
      .send({ title: "First note", body: "Hello world" });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ title: "First note", body: "Hello world" });

    const listRes = await request(app).get("/notes");
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].title).toBe("First note");
  });

  test("POST /notes without title is rejected", async () => {
    const res = await request(app).post("/notes").send({ body: "no title here" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /notes/:id returns 404 for unknown id", async () => {
    const res = await request(app).get("/notes/999");
    expect(res.status).toBe(404);
  });

  test("GET /notes?search filters notes by title and body", async () => {
    await request(app).post("/notes").send({ title: "Groceries", body: "Buy milk" });
    await request(app).post("/notes").send({ title: "Workout plan", body: "Run 5km" });

    const res = await request(app).get("/notes").query({ search: "milk" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Groceries");
  });

  test("full lifecycle: create -> read -> update -> delete", async () => {
    const created = await request(app).post("/notes").send({ title: "Lifecycle" });
    const id = created.body.id;

    const read = await request(app).get(`/notes/${id}`);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe("Lifecycle");

    const updated = await request(app).put(`/notes/${id}`).send({ title: "Updated" });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Updated");

    const deleted = await request(app).delete(`/notes/${id}`);
    expect(deleted.status).toBe(204);

    const afterDelete = await request(app).get(`/notes/${id}`);
    expect(afterDelete.status).toBe(404);
  });
});
