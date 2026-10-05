import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to sanitize user object
const formatUser = (user) => {
  const isSubscribed = Boolean(
    user.isSubscribed &&
    user.subscriptionExpiryDate &&
    new Date(user.subscriptionExpiryDate) > new Date()
  );

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isSubscribed,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionExpiryDate: user.subscriptionExpiryDate,
    createdAt: user.createdAt,
  };
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      isSubscribed: false,
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: formatUser(newUser),
      message: 'Account registered successfully.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: formatUser(user),
      message: 'Logged in successfully.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ user: formatUser(user) });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile.' });
  }
});

export default router;
