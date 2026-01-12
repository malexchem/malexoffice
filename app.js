const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('./config');
const connectDB = require('./db');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/user');
const roleUtil = require('./utils/role'); // if you have this util

const app = express();

/* ---------- middleware ---------- */
app.use(cors());

app.use(bodyParser.json({ limit: config.BODY_LIMIT }));

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
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/records', require('./routes/record.routes'));
app.use('/api/records-two', require('./routes/record.routes2'));
app.use('/api/expenses', require('./routes/expense.routes'));
app.use('/api/deposits', require('./routes/deposit.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));

/* ---------- salary routes ---------- */
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/salary-cycles', require('./routes/salaryCycle.routes'));
app.use('/api/salary-payments', require('./routes/salaryPayment.routes'));


app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/marketer-reports', require('./routes/marketerReport.routes'));
app.use('/api/marketing-reports', require('./routes/marketingReport.routes'));

/* ---------- time management routes ---------- */
app.use('/api/time-records', require('./routes/timeRecord.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
// In your main app.js, add this line with other routes:
app.use('/api/cash-collections', require('./routes/cashCollection.routes'));
app.use('/api/cust', require('./routes/cust.routes'));
app.use('/api/inventory', require('./routes/InventoryRoutes'));


/* ---------- catch-all ---------- */
app.use(errorHandler);

/* ---------- DB ---------- */
connectDB();

module.exports = app;
