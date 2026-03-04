const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("./db");

module.exports = function initSockets(server, app) {
  const io = new Server(server, {
    cors: { origin: "http://localhost:3000", credentials: true },
  });

  const userSockets = new Map();
  app.set("io", io);
  app.set("userSockets", userSockets);

  io.on("connection", (socket) => {
    let token;
    if (socket.handshake.headers.cookie) {
      token = socket.handshake.headers.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("jwtToken="))
        ?.split("=")[1];
    }

    if (!token) return socket.disconnect();

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return socket.disconnect();
    }

    socket.userId = user.id;

    if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
    userSockets.get(user.id).add(socket.id);

    socket.on("message:send", async ({ recipientId, content }) => {
      try {
        const msg = await db.one("INSERT INTO messages(sender_id, recipient_id, content) VALUES ($1,$2,$3) RETURNING id, sender_id, recipient_id, content, timestamp", [
          socket.userId,
          recipientId,
          content,
        ]);

        const sockets = userSockets.get(recipientId);
        if (sockets) sockets.forEach((socketId) => io.to(socketId).emit("message:receive", msg));

        io.to(socket.id).emit("message:receive", msg);
      } catch (error) {
        console.error(error);
        io.to(socket.id).emit("message:error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      userSockets.get(socket.userId)?.delete(socket.id);
      if (userSockets.get(socket.userId)?.size === 0) userSockets.delete(socket.userId);
    });
  });

  return io;
};
