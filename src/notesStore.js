let notes = [];
let nextId = 1;

function reset() {
  notes = [];
  nextId = 1;
}

function getAll() {
  return notes;
}

function getById(id) {
  return notes.find((note) => note.id === id);
}

function create({ title, body }) {
  const note = { id: nextId++, title, body: body || "", createdAt: new Date().toISOString() };
  notes.push(note);
  return note;
}

function update(id, { title, body }) {
  const note = getById(id);
  if (!note) return null;
  if (title !== undefined) note.title = title;
  if (body !== undefined) note.body = body;
  return note;
}

function remove(id) {
  const index = notes.findIndex((note) => note.id === id);
  if (index === -1) return false;
  notes.splice(index, 1);
  return true;
}

module.exports = { reset, getAll, getById, create, update, remove };
