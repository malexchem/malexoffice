module.exports = (role) =>
  role?.toLowerCase().replace(/\s+/g, '').replace('storemanager', 'storeManager');