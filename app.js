


const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('./config');
const connectDB = require('./db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/user');
const roleUtil = require('./utils/roleUtil'); // if you have this util

const app = express();

/* ---------- middleware ---------- */
app.use(cors(config.CORS_OPTIONS));
app.use(bodyParser.json({ limit: config.BODY_LIMIT }));

// Log every incoming request
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[REQUEST] ${now} | ${req.method} ${req.originalUrl}`);
  next();
});

/* ---------- routes ---------- */

// Create user by admin
app.post('/api/users/createByAdmin', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    console.log(`[INFO] Admin request to create user: ${email}`);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`[WARN] Failed to create user - email already in use: ${email}`);
      return res.status(400).send({ error: 'Email already in use!!!' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: roleUtil ? roleUtil(role) : role // fallback if no util
    });

    console.log(`[SUCCESS] User created by admin: ID=${user._id}, Email=${user.email}`);
    res.status(201).send({ user });

  } catch (e) {
    console.error(`[ERROR] Failed to create user by admin: ${e.message}`);
    next(e);
  }
});

/* ---------- other routes ---------- */
app.use('/api/records', require('./routes/record.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/deposits', require('./routes/deposit.routes'));

/* ---------- catch-all ---------- */
app.use(errorHandler);

/* ---------- DB ---------- */
connectDB();

module.exports = app;
