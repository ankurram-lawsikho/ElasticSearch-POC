const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// GET /api/analytics/overview - Get overview analytics
router.get('/overview', async (req, res) => {
  try {
    const query = {
      aggs: {
        total_products: {
          value_count: { field: 'id' }
        },
        avg_price: {
          avg: { field: 'price' }
        },
        min_price: {
          min: { field: 'price' }
        },
        max_price: {
          max: { field: 'price' }
        },
        avg_rating: {
          avg: { field: 'rating' }
        },
        in_stock_count: {
          filter: { term: { inStock: true } },
          aggs: {
            count: { value_count: { field: 'id' } }
          }
        },
        out_of_stock_count: {
          filter: { term: { inStock: false } },
          aggs: {
            count: { value_count: { field: 'id' } }
          }
        }
      },
      size: 0
    };

    const response = await elasticsearchService.search(query);
    const aggs = response.aggregations;
    
    res.json({
      total_products: aggs.total_products.value,
      price_stats: {
        average: Math.round(aggs.avg_price.value * 100) / 100,
        min: aggs.min_price.value,
        max: aggs.max_price.value
      },
      average_rating: Math.round(aggs.avg_rating.value * 100) / 100,
      stock_status: {
        in_stock: aggs.in_stock_count.count.value,
        out_of_stock: aggs.out_of_stock_count.count.value
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/categories - Category distribution
router.get('/categories', async (req, res) => {
  try {
    const { size = 20 } = req.query;
    
    const query = {
      aggs: {
        categories: {
          terms: {
            field: 'category',
            size: parseInt(size),
            order: { _count: 'desc' }
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            avg_rating: { avg: { field: 'rating' } },
            in_stock: {
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

    const response = await elasticsearchService.search(query);
    
    res.json({
      categories: response.aggregations.categories.buckets.map(bucket => ({
        category: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        in_stock_count: bucket.in_stock.count.value,
        in_stock_percentage: Math.round((bucket.in_stock.count.value / bucket.doc_count) * 100)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/price-distribution - Price distribution analysis
router.get('/price-distribution', async (req, res) => {
  try {
    const query = {
      aggs: {
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 25, key: 'Under $25' },
              { from: 25, to: 50, key: '$25 - $50' },
              { from: 50, to: 100, key: '$50 - $100' },
              { from: 100, to: 200, key: '$100 - $200' },
              { from: 200, to: 500, key: '$200 - $500' },
              { from: 500, key: 'Over $500' }
            ]
          },
          aggs: {
            avg_rating: { avg: { field: 'rating' } },
            in_stock: {
              filter: { term: { inStock: true } },
              aggs: {
                count: { value_count: { field: 'id' } }
              }
            }
          }
        },
        price_histogram: {
          histogram: {
            field: 'price',
            interval: 50,
            min_doc_count: 1
          }
        }
      },
      size: 0
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      price_ranges: response.aggregations.price_ranges.buckets.map(bucket => ({
        range: bucket.key,
        count: bucket.doc_count,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        in_stock_count: bucket.in_stock.count.value
      })),
      histogram: response.aggregations.price_histogram.buckets.map(bucket => ({
        price: bucket.key,
        count: bucket.doc_count
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/rating-distribution - Rating distribution analysis
router.get('/rating-distribution', async (req, res) => {
  try {
    const query = {
      aggs: {
        rating_ranges: {
          range: {
            field: 'rating',
            ranges: [
              { to: 1, key: '0 - 1' },
              { from: 1, to: 2, key: '1 - 2' },
              { from: 2, to: 3, key: '2 - 3' },
              { from: 3, to: 4, key: '3 - 4' },
              { from: 4, to: 5, key: '4 - 5' }
            ]
          },
          aggs: {
            avg_price: { avg: { field: 'price' } },
            in_stock: {
              filter: { term: { inStock: true } },
              aggs: {
                count: { value_count: { field: 'id' } }
              }
            }
          }
        },
        top_rated: {
          terms: {
            field: 'name.keyword',
            size: 10,
            order: { avg_rating: 'desc' }
          },
          aggs: {
            avg_rating: { avg: { field: 'rating' } },
            avg_price: { avg: { field: 'price' } }
          }
        }
      },
      size: 0
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      rating_ranges: response.aggregations.rating_ranges.buckets.map(bucket => ({
        range: bucket.key,
        count: bucket.doc_count,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100,
        in_stock_count: bucket.in_stock.count.value
      })),
      top_rated: response.aggregations.top_rated.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count,
        avg_rating: Math.round(bucket.avg_rating.value * 100) / 100,
        avg_price: Math.round(bucket.avg_price.value * 100) / 100
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/trends - Time-based trends
router.get('/trends', async (req, res) => {
  try {
    const { interval = 'day', size = 30 } = req.query;
    
    const query = {
      aggs: {
        trends: {
          date_histogram: {
            field: 'createdAt',
            calendar_interval: interval,
            min_doc_count: 0
          },
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

    const response = await elasticsearchService.search(query);
    
    res.json({
      trends: response.aggregations.trends.buckets.map(bucket => ({
        date: bucket.key_as_string,
        timestamp: bucket.key,
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

// GET /api/analytics/search-analytics - Search performance analytics
router.get('/search-analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const query = {
      query: {
        range: {
          createdAt: {
            gte: `now-${days}d/d`
          }
        }
      },
      aggs: {
        search_terms: {
          terms: {
            field: 'name.keyword',
            size: 20,
            order: { _count: 'desc' }
          }
        },
        categories_searched: {
          terms: {
            field: 'category',
            size: 10
          }
        },
        price_ranges_searched: {
          range: {
            field: 'price',
            ranges: [
              { to: 50 },
              { from: 50, to: 100 },
              { from: 100, to: 200 },
              { from: 200 }
            ]
          }
        }
      },
      size: 0
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      period_days: parseInt(days),
      total_searches: response.hits.total.value,
      top_search_terms: response.aggregations.search_terms.buckets,
      categories_searched: response.aggregations.categories_searched.buckets,
      price_ranges_searched: response.aggregations.price_ranges_searched.buckets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
