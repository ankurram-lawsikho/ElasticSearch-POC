const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// POST /api/aggregations/custom - Run custom aggregation query
router.post('/custom', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query parameter is required',
        example: {
          query: {
            aggs: {
              categories: {
                terms: { field: 'category', size: 10 }
              }
            },
            size: 0
          }
        }
      });
    }

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      query: query,
      execution_time: endTime - startTime,
      aggregations: response.aggregations,
      total_documents: response.hits.total.value
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aggregations/categories - Category distribution
router.get('/categories', async (req, res) => {
  try {
    const { size = 10, order = 'desc' } = req.query;

    const query = {
      aggs: {
        categories: {
          terms: { 
            field: 'category',
            size: parseInt(size),
            order: { _count: order }
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            avg_rating: { avg: { field: 'rating' } },
            min_price: { min: { field: 'price' } },
            max_price: { max: { field: 'price' } },
            in_stock_count: {
              filter: { term: { inStock: true } },
              aggs: {
                count: { value_count: { field: 'id' } }
              }
            }
          }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      execution_time: endTime - startTime,
      categories: response.aggregations.categories.buckets.map(bucket => ({
        category: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        min_price: bucket.min_price.value,
        max_price: bucket.max_price.value,
        in_stock_count: bucket.in_stock_count.count.value,
        in_stock_percentage: Math.round((bucket.in_stock_count.count.value / bucket.doc_count) * 100)
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aggregations/price-analysis - Price distribution analysis
router.get('/price-analysis', async (req, res) => {
  try {
    const { ranges = '50,100,200,500' } = req.query;
    const rangeValues = ranges.split(',').map(Number);

    const priceRanges = [];
    for (let i = 0; i < rangeValues.length; i++) {
      if (i === 0) {
        priceRanges.push({ to: rangeValues[i], key: `Under $${rangeValues[i]}` });
      } else {
        priceRanges.push({ 
          from: rangeValues[i-1], 
          to: rangeValues[i], 
          key: `$${rangeValues[i-1]} - $${rangeValues[i]}` 
        });
      }
    }
    priceRanges.push({ from: rangeValues[rangeValues.length - 1], key: `Over $${rangeValues[rangeValues.length - 1]}` });

    const query = {
      aggs: {
        price_ranges: {
          range: {
            field: 'price',
            ranges: priceRanges
          },
          aggs: {
            avg_rating: { avg: { field: 'rating' } },
            in_stock_count: {
              filter: { term: { inStock: true } },
              aggs: {
                count: { value_count: { field: 'id' } }
              }
            }
          }
        },
        price_stats: {
          stats: { field: 'price' }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      execution_time: endTime - startTime,
      price_ranges: response.aggregations.price_ranges.buckets.map(bucket => ({
        range: bucket.key,
        count: bucket.doc_count,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        in_stock_count: bucket.in_stock_count.count.value
      })),
      price_statistics: {
        count: response.aggregations.price_stats.count,
        average: Math.round(response.aggregations.price_stats.avg * 100) / 100,
        min: response.aggregations.price_stats.min,
        max: response.aggregations.price_stats.max,
        sum: response.aggregations.price_stats.sum
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aggregations/rating-analysis - Rating distribution
router.get('/rating-analysis', async (req, res) => {
  try {
    const query = {
      aggs: {
        rating_ranges: {
          range: {
            field: 'rating',
            ranges: [
              { to: 1, key: 'Poor (0-1)' },
              { from: 1, to: 2, key: 'Fair (1-2)' },
              { from: 2, to: 3, key: 'Good (2-3)' },
              { from: 3, to: 4, key: 'Very Good (3-4)' },
              { from: 4, to: 5, key: 'Excellent (4-5)' }
            ]
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            in_stock_count: {
              filter: { term: { inStock: true } },
              aggs: {
                count: { value_count: { field: 'id' } }
              }
            }
          }
        },
        rating_stats: {
          stats: { field: 'rating' }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      execution_time: endTime - startTime,
      rating_ranges: response.aggregations.rating_ranges.buckets.map(bucket => ({
        range: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        in_stock_count: bucket.in_stock_count.count.value
      })),
      rating_statistics: {
        count: response.aggregations.rating_stats.count,
        average: Math.round(response.aggregations.rating_stats.avg * 100) / 100,
        min: response.aggregations.rating_stats.min,
        max: response.aggregations.rating_stats.max
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aggregations/tags - Popular tags analysis
router.get('/tags', async (req, res) => {
  try {
    const { size = 20 } = req.query;

    const query = {
      aggs: {
        popular_tags: {
          terms: { 
            field: 'tags',
            size: parseInt(size),
            order: { _count: 'desc' }
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            avg_rating: { avg: { field: 'rating' } }
          }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      execution_time: endTime - startTime,
      popular_tags: response.aggregations.popular_tags.buckets.map(bucket => ({
        tag: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/aggregations/stock-analysis - Stock status analysis
router.get('/stock-analysis', async (req, res) => {
  try {
    const query = {
      aggs: {
        stock_status: {
          terms: { field: 'inStock' },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            avg_rating: { avg: { field: 'rating' } },
            categories: {
              terms: { field: 'category', size: 5 }
            }
          }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      execution_time: endTime - startTime,
      stock_analysis: response.aggregations.stock_status.buckets.map(bucket => ({
        status: bucket.key ? 'In Stock' : 'Out of Stock',
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        top_categories: bucket.categories.buckets.map(cat => ({
          category: cat.key,
          count: cat.doc_count
        }))
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/aggregations/complex - Complex multi-level aggregation
router.post('/complex', async (req, res) => {
  try {
    const { 
      category_filter,
      price_min,
      price_max,
      rating_min = 0
    } = req.body;

    // Build query with filters
    const mustQueries = [];
    const filters = [];

    if (category_filter) {
      filters.push({ term: { category: category_filter } });
    }

    if (price_min !== undefined || price_max !== undefined) {
      const priceRange = {};
      if (price_min !== undefined) priceRange.gte = price_min;
      if (price_max !== undefined) priceRange.lte = price_max;
      filters.push({ range: { price: priceRange } });
    }

    if (rating_min > 0) {
      filters.push({ range: { rating: { gte: rating_min } } });
    }

    const query = {
      query: {
        bool: {
          must: mustQueries,
          filter: filters
        }
      },
      aggs: {
        categories: {
          terms: { 
            field: 'category',
            size: 10
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            avg_rating: { avg: { field: 'rating' } },
            price_ranges: {
              range: {
                field: 'price',
                ranges: [
                  { to: 100, key: 'Budget' },
                  { from: 100, to: 300, key: 'Mid-range' },
                  { from: 300, key: 'Premium' }
                ]
              }
            },
            top_products: {
              top_hits: {
                sort: [{ rating: { order: 'desc' } }],
                size: 3,
                _source: ['name', 'price', 'rating', 'category']
              }
            }
          }
        },
        overall_stats: {
          stats: { field: 'price' }
        }
      },
      size: 0
    };

    const startTime = Date.now();
    const response = await elasticsearchService.search(query);
    const endTime = Date.now();

    res.json({
      filters_applied: {
        category_filter,
        price_min,
        price_max,
        rating_min
      },
      execution_time: endTime - startTime,
      total_documents: response.hits.total.value,
      categories: response.aggregations.categories.buckets.map(bucket => ({
        category: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        price_ranges: bucket.price_ranges.buckets.map(range => ({
          range: range.key,
          count: range.doc_count
        })),
        top_products: bucket.top_products.hits.hits.map(hit => ({
          name: hit._source.name,
          price: hit._source.price,
          rating: hit._source.rating,
          category: hit._source.category
        }))
      })),
      overall_statistics: {
        count: response.aggregations.overall_stats.count,
        average_price: Math.round(response.aggregations.overall_stats.avg * 100) / 100,
        min_price: response.aggregations.overall_stats.min,
        max_price: response.aggregations.overall_stats.max
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
