const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');
const crypto = require('crypto');

const router = express.Router();

// GET /api/products - Get all products with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, size = 10, sort = 'createdAt', order = 'desc' } = req.query;
    const from = (page - 1) * size;

    const query = {
      query: { match_all: {} },
      from: parseInt(from),
      size: parseInt(size),
      sort: [{ [sort]: { order: order } }]
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      products: response.hits.hits.map(hit => ({
        ...hit._source,
        _score: hit._score
      })),
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(response.hits.total.value / size)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await elasticsearchService.getDocument(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
  try {
    const product = {
      id: crypto.randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await elasticsearchService.indexDocument(product);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const existingProduct = await elasticsearchService.getDocument(req.params.id);
    
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = {
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };

    await elasticsearchService.updateDocument(req.params.id, updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const result = await elasticsearchService.deleteDocument(req.params.id);
    
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/bulk - Bulk create products
router.post('/bulk', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    const productsWithIds = products.map(product => ({
      id: crypto.randomUUID(),
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const response = await elasticsearchService.bulkIndex(productsWithIds);
    
    res.json({
      message: 'Bulk insert completed',
      total: productsWithIds.length,
      errors: response.errors,
      items: response.items.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/stats - Get index statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await elasticsearchService.getIndexStats();
    
    res.json({
      total_documents: stats.total.docs.count,
      index_size: stats.total.store.size_in_bytes,
      shards: {
        total: stats.shards.total,
        successful: stats.shards.successful,
        failed: stats.shards.failed
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
