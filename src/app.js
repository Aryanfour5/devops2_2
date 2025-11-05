const express = require("express");
const app = express();

app.use(express.json());

// API endpoints
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

app.get("/api/users", (req, res) => {
  res.json([
    { id: 1, name: "John", email: "john@example.com" },
    { id: 2, name: "Jane", email: "jane@example.com" },
  ]);
});

app.post("/api/users", (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email required" });
  }

  res.status(201).json({
    id: 3,
    name,
    email,
    createdAt: new Date(),
  });
});

app.get("/api/sum/:a/:b", (req, res) => {
  const a = parseInt(req.params.a);
  const b = parseInt(req.params.b);
  res.json({ a, b, sum: a + b });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
