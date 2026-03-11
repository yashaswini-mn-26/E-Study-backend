const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
// IMPORTANT: Change '../models/User' to '../models/Student' if that is what your file is named!
const User = require('../models/User'); 

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

// @route   GET /api/users
// @desc    Get all registered users for the Inbox contact list
router.get('/', auth, async (req, res) => {
  try {
    // Fetch all users but DO NOT send their passwords to the frontend
    const users = await User.find().select('-password'); 
    res.json(users);
  } catch (err) {
    console.error("Fetch Users Error:", err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;