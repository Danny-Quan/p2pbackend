const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const http = require("http");
const app = express();
dotenv.config({ path: "./config.env" });

const server = http.createServer(app);
const { Server } = require("socket.io");

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
  })
);

const userRotue = require("./Routes/userRoute");
const messageRoute = require("./Routes/messageRoute");

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then((con) => {
//     console.log("database connected");
//   })
//   .catch((err) => {
//     console.log("Error connecting to the database!");
//   });

app.use("/api/users", userRotue);
app.use("/api/messages", messageRoute);

app.get("/", (req, res) => {
  res.send("hello to the backend");
});

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();
let connectedUsers = {}; // Store all connected users

// Endpoint for admin to create a room
app.post("/create-room", (req, res) => {
  const { groupId } = req.body;
  if (!groupId) {
    return res.status(400).json({ error: "Group ID is required" });
  }

  if (rooms.has(groupId)) {
    return res.status(400).json({ error: "Group already exist" });
  }

  rooms.set(groupId, { users: new Set() });

  res.json({ groupId });
});

//connecting socket
io.on("connection", (socket) => {
  console.log("user connected with ID: " + socket.id);

  // Handle setting the username
  socket.on("set-username", (username) => {
    connectedUsers[socket.id] = { id: socket.id, username };
    io.emit("user-list", Object.values(connectedUsers));
  });

  socket.on("join_room", ({ username, groupId }, callback) => {
    if (!rooms.has(groupId)) {
      return callback({ error: "Group Id does not exist" });
    }
    // rooms.get(groupId).add(username);
    const room = rooms.get(groupId);
    room.users.add(username);

    socket.join(groupId);
    console.log(`User with ID: ${socket.id} joined room: ${groupId}`);
    io.to(groupId).emit("updateUsers", Array.from(room.users));

    callback({ success: "Joined Group" });
  });

  socket.on("leave_group", ({ groupId, username }) => {
    if (rooms.has(groupId)) {
      const room = rooms.get(groupId);
      room.users.delete(username);
      if (room.users.size === 0) {
        rooms.delete(groupId);
      } else {
        io.to(groupId).emit("updateUsers", Array.from(room.users));
      }
    }
    socket.leave(groupId);
    console.log(`${username} left room: ${groupId}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
    // console.log(data)
  });

  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    io.emit("user-list", Object.values(connectedUsers));

    rooms.forEach((room, groupId) => {
      room.users.forEach((user) => {
        if (user.socketId === socket.id) {
          room.users.delete(user);
          io.to(groupId).emit("updateUsers", Array.from(room.users));
          if (room.users.size === 0) {
            rooms.delete(groupId);
          }
        }
      });
    });
    console.log("Client disconnected");
  });

  // Handle private chat requests
  socket.on("request-private-chat", ({ toUsername, fromUsername }) => {
    const toUser = Object.values(connectedUsers).find(
      (user) => user.username === toUsername
    );
    if (toUser) {
      io.to(toUser.id).emit("private-chat-request", { fromUsername });
    }
  });

  // Handle acceptance of private chat requests
  socket.on("accept-private-chat", ({ toUsername, fromUsername }) => {
    const fromUser = Object.values(connectedUsers).find(
      (user) => user.username === fromUsername
    );
    const toUser = Object.values(connectedUsers).find(
      (user) => user.username === toUsername
    );

    if (fromUser && toUser) {
      const roomId = `${fromUser.id}-${toUser.id}`;
      // Ensure both users join the same room
      socket.join(roomId);
      io.to(fromUser.id).socketsJoin(roomId); // Make sure the sender joins the room

      // Notify both users that the chat has been accepted
      io.to(toUser.id).emit("private-chat-accepted", {
        chatUser: fromUsername,
        roomId,
      });
      io.to(fromUser.id).emit("private-chat-accepted", {
        chatUser: toUsername,
        roomId,
      });
    }
  });

  // Handle private messages
  socket.on("private-message", ({ roomId, fromUsername, message }) => {
    socket
      .to(roomId)
      .emit("receive-private-message", { fromUsername, message });
  });
});

server.listen(process.env.PORT || 5000, (err, data) => {
  console.log(`app running on port ${process.env.PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.log("there was an unhandled rejection");
  console.log(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
  console.log("there was an error");
});

process.on("unhaldledException", (err) => {
  console.log("there was an unhandled exception");
  console.log(err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});
