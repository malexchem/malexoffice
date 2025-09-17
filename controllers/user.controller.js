const User = require('../models/user');
const roleUtil = require('../utils/role');

exports.getAll = async (req, res, next) => {
  try { res.send(await User.find({})); } catch (e) { next(e); }
};

exports.getByEmail = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) return res.status(404).send({ error: 'User not found' });
    res.send({ user });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send();
    res.send(user);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'role'];
    const updates = Object.keys(req.body);
    const invalid = updates.filter((u) => !allowed.includes(u));
    if (invalid.length) return res.status(400).send({ error: `Invalid fields: ${invalid.join(',')}` });

    if (req.body.role) req.body.role = roleUtil(req.body.role);
    const user = await User.findOne({ name: req.params.name });
    if (!user) return res.status(404).send();

    updates.forEach((u) => (user[u] = req.body[u]));
    await user.save();
    res.send(user);
  } catch (e) { next(e); }
};

exports.createByAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(400).send({ error: 'Email already in use' });
    const user = await User.create({ name, email, password, role: roleUtil(role) });
    res.status(201).send({ user });
  } catch (e) { next(e); }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.send({ message: 'Password updated successfully' });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send();
    res.send(user);
  } catch (e) { next(e); }
};