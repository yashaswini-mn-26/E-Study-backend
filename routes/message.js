const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User'); // Adjust if your file is named Student.js

// Middleware to protect routes (reuse your existing one if you have it exported)
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
};

// @route   GET /api/messages/inbox
// @desc    Get all messages received by the logged-in user
router.get('/inbox', auth, async (req, res) => {
  try {
    const messages = await Message.find({ receiver: req.user.id })
      .populate('sender', ['name', 'avatar', 'email']) // Get sender's details
      .sort({ createdAt: -1 }); // Newest first
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/messages
// @desc    Send a new message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverEmail, subject, content } = req.body;

    // 1. Find the receiver by their email
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ msg: 'User with that email not found' });
    }

    // 2. Create the message
    const newMessage = new Message({
      sender: req.user.id,
      receiver: receiver.id,
      subject,
      content
    });

    const message = await newMessage.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark a message as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    let message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Make sure the person reading it is the actual receiver
    if (message.receiver.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    message.isRead = true;
    await message.save();
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// @route   GET /api/messages/conversation/:userId
// @desc    Get chat history between logged-in user and another user
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 }); // Oldest first for chat UI

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;