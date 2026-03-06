const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  isCompleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Task', TaskSchema);