function socketController(io) {
  io.on("connection", (socket) => {
    console.log("🔌 New user connected");

    // Listen for chat messages
    socket.on("chatMessage", (msg) => {
      io.emit("chatMessage", msg); // Broadcast to everyone
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected");
    });
  });
}

module.exports = socketController;
