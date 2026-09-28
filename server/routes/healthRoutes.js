const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  res.status(200).json({
    success: true,
    message: 'InfraTrack Government Platform API is healthy',
    system: {
      status: 'OPERATIONAL',
      service: 'InfraTrack Backend Service',
      version: '1.0.0',
      database: dbStatus,
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
