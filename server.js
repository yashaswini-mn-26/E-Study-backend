const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); // <-- REQUIRED FOR SOCKET.IO
const { Server } = require('socket.io'); // <-- REQUIRED FOR SOCKET.IO
require('dotenv').config();

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://e-studyy.vercel.app"
  ]
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', require('./routes/message'));
app.use('/api/users', require('./routes/Users'));

// --- SOCKET.IO SETUP ---
// We pass the Express 'app' into Node's native HTTP server
const server = http.createServer(app); 

// We pass that HTTP server into Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allow your React app to connect
    methods: ["GET", "POST"]
  }
});

// NEW: Keep track of who is online!
const onlineUsers = new Map(); // Maps userId -> socket.id

// When a user connects to the app
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. When a user logs in, they join a "Personal Room" named after their MongoDB User ID
  socket.on('join_room', (userId) => {
    socket.join(userId);
    // Add user to online list and tell everyone!
    onlineUsers.set(userId, socket.id);
    io.emit('update_online_status', Array.from(onlineUsers.keys()));
    console.log(`User ${userId} joined their personal room and is ONLINE`);
  });

  // 2. When a message is sent, forward it directly to the receiver's personal room
  socket.on('send_message', (messageData) => {
    socket.to(messageData.receiver).emit('receive_message', messageData);
  });

  // 3. NEW: Handle Call Signaling
  socket.on('call_user', (data) => {
    socket.to(data.receiverId).emit('incoming_call', data);
  });

  // 4. Handle Disconnects (Remove green dot when they leave)
  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
    // Find the user who disconnected and remove them
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('update_online_status', Array.from(onlineUsers.keys()));
        break;
      }
    }
  });
});
// -----------------------

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("MongoDB Connection Error:", err));

app.get('/', (req, res) => {
  res.send('E-Study Server is Running!');
});

const PORT = process.env.PORT || 5000;

// Must be server.listen, NOT app.listen!
server.listen(PORT, () => {
  console.log(`Server is flying on port ${PORT}`);
});