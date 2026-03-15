const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");
const config = require("../config");

const setupWebSocket = (server) => {
  // Initialize WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    // Parse token from query parameters (e.g., ws://localhost:3001/?token=YOUR_TOKEN)
    const parameters = url.parse(req.url, true);
    const token = parameters.query.token;

    if (!token) {
      console.log("WebSocket connection rejected: No token provided");
      ws.close(1008, "Token required"); // Close with Policy Violation code
      return;
    }

    // Verify the JWT token before allowing further operations
    jwt.verify(token, config.jwtSecret, (err, user) => {
      if (err) {
        console.log("WebSocket connection rejected: Invalid token");
        ws.close(1008, "Invalid token");
        return;
      }

      // Attach user information to the WebSocket object for later use
      ws.user = user;
      console.log(
        `New WebSocket connection: ${req.socket.remoteAddress} (User: ${user.name})`,
      );

      ws.on("message", (message) => {
        console.log(`Received message from ${user.name}: ${message}`);

        // Broadcast message to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            // Optionally, include sender metadata in the outgoing message
            client.send(
              JSON.stringify({
                type: "message",
                sender: user.name,
                content: message.toString(),
              }),
            );
          }
        });
      });

      ws.on("close", () => {
        console.log(`Client disconnected (User: ${user.name})`);
      });

      // Send a welcome message to the newly connected client
      ws.send(
        JSON.stringify({
          type: "system",
          content: `Welcome to the messaging server, ${user.name}!`,
        }),
      );
    });
  });

  return wss;
};

module.exports = setupWebSocket;
