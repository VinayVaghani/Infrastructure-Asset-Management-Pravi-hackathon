const dotenv = require('dotenv');

// Load environment variables before DB and app
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database and start listening
connectDB()
  .then(() => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`=======================================================`);
      console.log(`🏛️  INFRATRACK GOVERNMENT ASSET PLATFORM (API SERVER)`);
      console.log(`📡 Port: ${PORT} | Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
        console.error(`Please stop any other running instances of the server before starting.`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
