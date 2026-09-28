const express = require('express');
const cors = require('cors');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const apiRoutes = require('./routes');

const app = express();

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, same-origin)
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Serve local upload files
const uploadsPath = path.resolve(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Master API Routes (supports both /api/* and rewritten /* requests)
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    project: 'InfraTrack - Government Infrastructure Asset Lifecycle Management Platform',
    status: 'ONLINE',
    documentation: '/api/health',
  });
});

// Centralized Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
