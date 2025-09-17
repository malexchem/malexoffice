const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { JWT_SECRET, MAX_TOKENS } = require('../config');
const roleUtil = require('../utils/role');

const signToken = (_id) => jwt.sign({ _id }, JWT_SECRET);

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).send({ error: 'Email already in use' });

    const user = await User.create({ name, email, password, role: roleUtil(role) });
    const token = signToken(user._id);
    user.tokens.push({ token });
    await user.save();

    res.status(201).send({ user, token });
  } catch (e) { next(e); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== password) return res.status(400).send({ error: 'Invalid credentials' });

    const token = signToken(user._id);
    user.tokens.push({ token });
    if (user.tokens.length > MAX_TOKENS) user.tokens = user.tokens.slice(-MAX_TOKENS);
    await user.save();

    res.send({ user, token });
  } catch (e) { next(e); }
};

exports.logout = async (req, res, next) => {
  try {
    req.user.tokens = req.user.tokens.filter((t) => t.token !== req.token);
    await req.user.save();
    res.send();
  } catch (e) { next(e); }
};