const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto'); // Built-in Node tool for tokens
const nodemailer = require('nodemailer'); // For sending emails

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  try {
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

// --- SIGNUP ROUTE ---
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    user = new User({ name, email, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { name: user.name, email: user.email } });

  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// --- LOGIN ROUTE ---
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

// --- GET ME ROUTE ---
router.get('/me', async (req, res) => {
  try {
    const token = req.header('x-auth-token'); 
    if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid" });
  }
});


const getTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // Development: Mailtrap (Safe testing)
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: process.env.MAILTRAP_PORT,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  } else {
    // Production/Default: Gmail via Port 587 (Bypasses firewall blocks)
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,       // <-- MUST be false when using port 587
      requireTLS: true,    // <-- Forces secure connection
      auth: {
        user: process.env.EMAIL_USER, // Your real Gmail address
        pass: process.env.EMAIL_PASS, // Your 16-letter Google App Password
      },
    });
  }
};
// --- FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Generic message to avoid revealing if user exists
      return res.json({
        msg: "If an account exists with this email, a reset link has been sent."
      });
    }

    // 1. Generate token & hash
    const resetToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 2. Store in DB
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // 3. Construct reset URL using environment variable
    const frontendURL = process.env.FRONTEND_URL || 'https://e-studyy.vercel.app';
    const resetUrl = `${frontendURL}/reset-password/${resetToken}`;

    // 4. Send email
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'E-Study Password Reset',
      html: `
        <h3>Password Reset Request</h3>
        <p>Click the link below to reset your password. This link is valid for 10 minutes.</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    res.json({
      msg: "If an account exists with this email, a reset link has been sent."
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ msg: "Unable to send reset email. Please try again later." });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;

    // 1. Hash the token from URL
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // 2. Find user with token and check expiry
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset token." });
    }

    // 3. Hash new password & save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Clear reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ msg: "Password updated successfully!" });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ msg: "Server error during password reset." });
  }
});

module.exports = router;