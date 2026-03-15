const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");
const config = require("../config");
const db = require("../config/db");

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
        `New WebSocket connection: ${req.socket.remoteAddress} (User: ${user.name}, ID: ${user.id})`,
      );

      ws.on("message", async (message) => {
        try {
          // Parse the incoming message as JSON
          const parsedMessage = JSON.parse(message.toString());
          console.log(`Parsed message from ${user.name}:`, parsedMessage);

          if (parsedMessage.type === "direct_message") {
            const { recipient, content } = parsedMessage;

            // 1. Find recipient ID from the database using username
            const [users] = await db.execute(
              "SELECT id FROM users WHERE username = ?",
              [recipient],
            );

            if (users.length === 0) {
              return ws.send(
                JSON.stringify({
                  type: "error",
                  message: `User ${recipient} does not exist.`,
                }),
              );
            }

            const receiverId = users[0].id;
            const senderId = user.id;

            // 2. Store the message in the database
            await db.execute(
              "INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
              [senderId, receiverId, content],
            );

            // 3. Find the recipient in the connected clients to deliver in real-time
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
              console.log(`User ${recipient} is offline. Message saved to DB.`);
            }
          } else if (parsedMessage.type === "broadcast") {
            // Broadcast feature (Optional: doesn't save to DB for now unless requested)
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
              message: "Invalid message format or server error.",
            }),
          );
        }
      });

      ws.on("close", () => {
        console.log(`Client disconnected (User: ${user.name})`);
      });
    });
  });

  return wss;
};

module.exports = setupWebSocket;
