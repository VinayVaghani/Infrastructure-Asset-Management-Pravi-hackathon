const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/infratrack';
  const fallbackUri = 'mongodb://127.0.0.1:27017/infratrack';

  try {
    const conn = await mongoose.connect(primaryUri, { autoIndex: true });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (primaryError) {
    console.warn(`[Database Warning] Primary connection failed (${primaryError.message}). Attempting local fallback: ${fallbackUri}`);
    try {
      const conn = await mongoose.connect(fallbackUri, { autoIndex: true });
      console.log(`[Database] Fallback MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (fallbackError) {
      console.error(`[Database Error] Both primary and fallback connections failed: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
