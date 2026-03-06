const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: String, required: true },
  actionText: { type: String, default: "Join" }
});

module.exports = mongoose.model('Event', EventSchema);