const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/infratrack';
  const fallbackUri = 'mongodb://127.0.0.1:27017/infratrack';

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      autoIndex: true,
    };

    cached.promise = mongoose
      .connect(primaryUri, opts)
      .then((conn) => {
        console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch(async (primaryError) => {
        console.warn(`[Database Warning] Primary connection failed (${primaryError.message}). Attempting local fallback: ${fallbackUri}`);
        try {
          const conn = await mongoose.connect(fallbackUri, opts);
          console.log(`[Database] Fallback MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
          return conn;
        } catch (fallbackError) {
          console.error(`[Database Error] Connection failed: ${fallbackError.message}`);
          cached.promise = null;
          throw fallbackError;
        }
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
