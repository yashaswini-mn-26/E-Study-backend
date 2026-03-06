const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // This ensures no two students use the same email!
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: "/yashaswini.png" // We can use your default avatar for new signups!
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);