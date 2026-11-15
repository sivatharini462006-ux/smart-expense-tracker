const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Generate JWT Helper
const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 1. Register New User
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, currency) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, 'INR']
    );

    const userId = result.insertId;
    const token = generateToken(userId, email.toLowerCase().trim());

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        currency: 'INR'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Login User
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Query user
    const [users] = await pool.query(
      'SELECT id, name, email, password, currency FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user.id, user.email);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Get Current User Profile (Protected)
exports.getProfile = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, currency, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Profile (Name & Currency)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, currency } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.'
      });
    }

    await pool.query(
      'UPDATE users SET name = ?, currency = ? WHERE id = ?',
      [name.trim(), currency || 'INR', req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: req.user.id,
        name: name.trim(),
        currency: currency || 'INR'
      }
    });
  } catch (error) {
    next(error);
  }
};