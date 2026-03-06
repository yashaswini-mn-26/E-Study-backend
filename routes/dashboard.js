const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Enrollment = require('../models/Enrollment');
const Task = require('../models/Task');
const Event = require('../models/Event');
const Course = require('../models/Course'); // Assuming you make a standard Event model

// Middleware to protect the route
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

// @route   GET /api/dashboard
// @desc    Get real-time dashboard data for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    // 1. Fetch the user's enrolled courses and populate the course details
    const enrollments = await Enrollment.find({ student: req.user.id })
      .populate('course', ['title', 'thumbnail', 'authorName', 'authorRole'])
      .limit(4);

    // 2. Fetch the user's tasks
    const tasks = await Task.find({ student: req.user.id, isCompleted: false })
      .sort({ dueDate: 1 })
      .limit(5);

    // 3. Fetch upcoming global events
    const events = await Event.find()
      .sort({ date: 1 })
      .limit(3);

    // 4. Send the dynamic data to React
    res.json({
      enrolledCourses: enrollments,
      tasks: tasks,
      events: events
    });

  } catch (err) {
    console.error("Dashboard Fetch Error:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;