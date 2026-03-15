const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");
const config = require("../config");

// Optional: You can keep tracked users in a Map for quick lookups
// const connectedUsers = new Map(); // e.g., connectedUsers.set(user.name, ws);

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
        try {
          // Parse the incoming message as JSON
          const parsedMessage = JSON.parse(message.toString());
          console.log(`Parsed message from ${user.name}:`, parsedMessage);

          if (parsedMessage.type === "direct_message") {
            const { recipient, content } = parsedMessage;

            // Find the recipient in the connected clients
            let recipientFound = false;

            wss.clients.forEach((client) => {
              if (
                client.readyState === ws.OPEN &&
                client.user &&
                client.user.name === recipient
              ) {
                // Send the message only to the targeted recipient
                client.send(
                  JSON.stringify({
                    type: "direct_message",
                    sender: user.name, // The user who sent the message
                    content: content,
                    timestamp: new Date().toISOString(),
                  }),
                );
                recipientFound = true;
              }
            });

            if (!recipientFound) {
              // Optionally notify the sender that the recipient is offline
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: `User ${recipient} is currently offline.`,
                }),
              );
            }
          } else if (parsedMessage.type === "broadcast") {
            // Optional: Keep the broadcast feature for group chats or testing
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "broadcast",
                    sender: user.name,
                    content: parsedMessage.content,
                  }),
                );
              }
            });
          }
        } catch (error) {
          console.error("Error processing message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format. Expected JSON.",
            }),
          );
        }
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
