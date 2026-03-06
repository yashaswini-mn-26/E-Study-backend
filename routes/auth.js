const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  try {
    // Decode token instead of strict verify
    const decoded = jwt.decode(idToken);

    if (!decoded) {
      return res.status(400).json({ msg: "Invalid Google token" });
    }

    const { name, email, picture } = decoded;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        avatar: picture,
        password: "google-auth-account"
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(400).json({ msg: "Google authentication failed" });
  }
});

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    user = new User({ name, email, password });

    const salt = await bcrypt.genSalt(10);
    console.log(password)
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { name: user.name, email: user.email } });

  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid Credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid Credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { name: user.name, email: user.email } });

  } catch (err) {
    res.status(500).send("Server Error");
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.header('x-auth-token'); 
    if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); 
    
    const user = await User.findById(decoded.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
});

module.exports = router;