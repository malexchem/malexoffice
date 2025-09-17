module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).send({ error: err.message || 'Server error' });
};