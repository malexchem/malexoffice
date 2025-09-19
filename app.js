const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const connectDB = require('./db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/user');

const app = express();

/* ---------- middleware ---------- */
app.use(cors(config.CORS_OPTIONS));
app.use(bodyParser.json({ limit: config.BODY_LIMIT }));

/* ---------- routes ---------- */
app.use('/api/users', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/records', require('./routes/record.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/deposits', require('./routes/deposit.routes'));

// User Registration
app.post('/api/users/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Normalize role value to ensure it matches the enum values
    const normalizedRole = role.toLowerCase().replace('storemanager', 'storeManager');

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('Registration failed: Email already in use!!');
      return res.status(400).send({ error: 'Email already in use!!' });
    }

    // Create user with plain password
    const user = new User({
      name,
      email,
      password, // Save the password as it is
      role: normalizedRole
    });

    await user.save();
    
    // Generate auth token
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET || 'your-secret-key');
    user.tokens = user.tokens.concat({ token });
    await user.save();

    console.log(`Registration successful: ${user.name} (${user.email})`);
    res.status(201).send({ user, token });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(400).send({ error: error.message });
  }
});

/* ---------- catch-all ---------- */
app.use(errorHandler);

/* ---------- DB ---------- */
connectDB();

module.exports = app;