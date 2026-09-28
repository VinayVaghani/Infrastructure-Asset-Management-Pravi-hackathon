const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT token
 * @param {string} userId - Mongo ID of the user
 * @param {string} role - Role of the user
 * @returns {string} - JWT string
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'infratrack_jwt_super_secret_key_change_in_production_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

module.exports = generateToken;
