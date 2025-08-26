const Message = require("../models/Message");

function socketController(io) {
  io.on("connection", (socket) => {
    socket.on("joinChat", ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join("_");
      socket.join(room);
    });

    socket.on("chatMessage", async ({ senderId, receiverId, text }) => {
      const room = [senderId, receiverId].sort().join("_");

      // Save to DB
      const newMsg = new Message({ sender: senderId, receiver: receiverId, text });
      await newMsg.save();

      // Emit only inside the room
      io.to(room).emit("chatMessage", { senderId, receiverId, text });
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected");
    });
  });
}

module.exports = socketController;
