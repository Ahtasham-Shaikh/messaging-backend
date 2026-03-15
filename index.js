const express = require("express");
const cors = require("cors");
const config = require("./config");
const db = require("./config/db"); // Initialize MySQL Connection
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const setupWebSocket = require("./websockets");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Messaging Backend is running");
});

// Use API routes
app.use("/", authRoutes);
app.use("/users", userRoutes);

// Create Express HTTP server
const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

// Setup WebSockets
setupWebSocket(server);
