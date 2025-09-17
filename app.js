const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const connectDB = require('./db');
const errorHandler = require('./middleware/errorHandler');

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

/* ---------- catch-all ---------- */
app.use(errorHandler);

/* ---------- DB ---------- */
connectDB();

module.exports = app;