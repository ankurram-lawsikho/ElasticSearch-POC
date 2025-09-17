require('newrelic');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const elasticsearchService = require('./services/elasticsearchService');
const productRoutes = require('./routes/products');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const performanceRoutes = require('./routes/performance');
const uploadRoutes = require('./routes/upload');
const analyzerRoutes = require('./routes/analyzers');
const aggregationRoutes = require('./routes/aggregations');
const { setupSwagger } = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await elasticsearchService.healthCheck();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      elasticsearch: health
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analyzers', analyzerRoutes);
app.use('/api/aggregations', aggregationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Elasticsearch PoC Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Swagger JSON: http://localhost:${PORT}/swagger.json`);
  
  // Initialize Elasticsearch connection
  try {
    await elasticsearchService.initialize();
    console.log('✅ Elasticsearch connection established');
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch:', error.message);
    console.log('💡 Make sure Elasticsearch is running on localhost:9200');
  }
});

module.exports = app;
