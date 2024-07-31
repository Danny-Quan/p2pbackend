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

// Endpoint for admin to create a room
app.post('/create-room', (req, res) => {
  const { groupId } = req.body;
  if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
  }

  if (rooms.has(groupId)) {
      return res.status(400).json({ error: 'Group already exist' });
  }

  rooms.set(groupId, { users: new Set() });

  res.json({ groupId });
});

//connecting socket
io.on("connection", (socket) => {
  console.log("user connected with ID: " + socket.id);

  socket.on("join_room", ({ username, groupId },callback) => {
    if (!rooms.has(groupId)) {
      return callback({ error: 'Group Id does not exist' });
    }
    // rooms.get(groupId).add(username);
    const room = rooms.get(groupId);
    room.users.add(username);

    socket.join(groupId);
    console.log(`User with ID: ${socket.id} joined room: ${groupId}`);
    io.to(groupId).emit("updateUsers", Array.from(room.users));

    callback({success:'Joined Group'})
  });

  
  socket.on('leave_group', ({ groupId, username }) => {
    if (rooms.has(groupId)) {
      const room = rooms.get(groupId);
      room.users.delete(username);
      if (room.users.size === 0) {
          rooms.delete(groupId);
      } else {
          io.to(groupId).emit('updateUsers', Array.from(room.users));
      }
  }
  socket.leave(groupId);
  console.log(`${username} left room: ${groupId}`);
});


  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
    // console.log(data)
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, groupId) => {
        room.users.forEach((user) => {
            if (user.socketId === socket.id) {
                room.users.delete(user);
                io.to(groupId).emit('updateUsers', Array.from(room.users));
                if (room.users.size === 0) {
                    rooms.delete(groupId);
                }
            }
        });
    });
    console.log('Client disconnected');
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
