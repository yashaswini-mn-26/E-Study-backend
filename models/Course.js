const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  duration: { type: String, required: true }, // e.g., "12hrs 30 mins"
  youtubeId: { type: String, required: true }, // e.g., "rfscVS0vtbw"
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);