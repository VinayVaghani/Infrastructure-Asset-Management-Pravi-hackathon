const dotenv = require('dotenv');
dotenv.config();

const app = require('../server/app');
const connectDB = require('../server/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (error) {
    console.error('Serverless MongoDB connection failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }

  return app(req, res);
};
