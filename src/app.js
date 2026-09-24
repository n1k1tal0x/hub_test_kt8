const express = require("express");
const store = require("./notesStore");

function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/notes", (req, res) => {
    const { search } = req.query;
    let notes = store.getAll();
    if (search) {
      const needle = String(search).toLowerCase();
      notes = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(needle) ||
          note.body.toLowerCase().includes(needle)
      );
    }
    res.json(notes);
  });

  app.get("/notes/:id", (req, res) => {
    const note = store.getById(Number(req.params.id));
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  });

  app.post("/notes", (req, res) => {
    const { title, body } = req.body || {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Field 'title' is required" });
    }
    const note = store.create({ title, body });
    res.status(201).json(note);
  });

  app.put("/notes/:id", (req, res) => {
    const { title, body } = req.body || {};
    const note = store.update(Number(req.params.id), { title, body });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  });

  app.delete("/notes/:id", (req, res) => {
    const removed = store.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "Note not found" });
    res.status(204).end();
  });

  return app;
}

module.exports = createApp;
