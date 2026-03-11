const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Ensure this matches your User model name (either 'user' or 'student')
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', 
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('message', MessageSchema);