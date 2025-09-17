const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// POST /api/search - Advanced search with multiple query types
router.post('/', async (req, res) => {
  try {
    const { 
      query, 
      filters = {}, 
      page = 1, 
      size = 10, 
      sort = 'createdAt', 
      order = 'desc',
      searchType = 'multi_match'
    } = req.body;

    const from = (page - 1) * size;
    let searchQuery = {};

    // Build query based on search type
    switch (searchType) {
      case 'multi_match':
        searchQuery = {
          query: {
            multi_match: {
              query: query,
              fields: ['name^3', 'description^2', 'category', 'tags'],
              type: 'best_fields',
              fuzziness: 'AUTO'
            }
          }
        };
        break;
      
      case 'match_phrase':
        searchQuery = {
          query: {
            match_phrase: {
              name: {
                query: query,
                slop: 2
              }
            }
          }
        };
        break;
      
      case 'wildcard':
        searchQuery = {
          query: {
            wildcard: {
              name: {
                value: `*${query}*`,
                case_insensitive: true
              }
            }
          }
        };
        break;
      
      case 'fuzzy':
        searchQuery = {
          query: {
            fuzzy: {
              name: {
                value: query,
                fuzziness: 2
              }
            }
          }
        };
        break;
      
      default:
        searchQuery = {
          query: {
            match_all: {}
          }
        };
    }

    // Add filters
    if (Object.keys(filters).length > 0) {
      const filterQueries = [];
      
      if (filters.category) {
        filterQueries.push({
          term: { category: filters.category }
        });
      }
      
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        const priceRange = {};
        if (filters.priceMin !== undefined) priceRange.gte = filters.priceMin;
        if (filters.priceMax !== undefined) priceRange.lte = filters.priceMax;
        
        filterQueries.push({
          range: { price: priceRange }
        });
      }
      
      if (filters.rating) {
        filterQueries.push({
          range: { rating: { gte: filters.rating } }
        });
      }
      
      if (filters.inStock !== undefined) {
        filterQueries.push({
          term: { inStock: filters.inStock }
        });
      }
      
      if (filters.tags && filters.tags.length > 0) {
        filterQueries.push({
          terms: { tags: filters.tags }
        });
      }

      if (filterQueries.length > 0) {
        searchQuery = {
          query: {
            bool: {
              must: [searchQuery.query],
              filter: filterQueries
            }
          }
        };
      }
    }

    // Add pagination and sorting
    searchQuery.from = from;
    searchQuery.size = parseInt(size);
    searchQuery.sort = [{ [sort]: { order: order } }];

    const response = await elasticsearchService.search(searchQuery);
    
    res.json({
      products: response.hits.hits.map(hit => ({
        ...hit._source,
        _score: hit._score
      })),
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(response.hits.total.value / size),
      searchType: searchType,
      took: response.took
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/search/suggest - Autocomplete suggestions
router.get('/suggest', async (req, res) => {
  try {
    const { q, field = 'name' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const query = {
      suggest: {
        product_suggest: {
          prefix: q,
          completion: {
            field: `${field}.suggest`,
            size: 10
          }
        }
      },
      size: 0
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      suggestions: response.suggest.product_suggest[0].options.map(option => ({
        text: option.text,
        score: option.score
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/search/facets - Get search facets for filtering
router.get('/facets', async (req, res) => {
  try {
    const { q } = req.query;
    
    let query = {
      aggs: {
        categories: {
          terms: { field: 'category', size: 20 }
        },
        price_ranges: {
          range: {
            field: 'price',
            ranges: [
              { to: 50 },
              { from: 50, to: 100 },
              { from: 100, to: 200 },
              { from: 200, to: 500 },
              { from: 500 }
            ]
          }
        },
        ratings: {
          range: {
            field: 'rating',
            ranges: [
              { from: 4.5 },
              { from: 4.0, to: 4.5 },
              { from: 3.0, to: 4.0 },
              { from: 2.0, to: 3.0 },
              { to: 2.0 }
            ]
          }
        },
        tags: {
          terms: { field: 'tags', size: 20 }
        },
        in_stock: {
          terms: { field: 'inStock' }
        }
      },
      size: 0
    };

    if (q) {
      query.query = {
        multi_match: {
          query: q,
          fields: ['name^3', 'description^2', 'category', 'tags']
        }
      };
    } else {
      query.query = { match_all: {} };
    }

    const response = await elasticsearchService.search(query);
    
    res.json({
      facets: {
        categories: response.aggregations.categories.buckets,
        price_ranges: response.aggregations.price_ranges.buckets,
        ratings: response.aggregations.ratings.buckets,
        tags: response.aggregations.tags.buckets,
        in_stock: response.aggregations.in_stock.buckets
      },
      total: response.hits.total.value
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/search/related - Find related products
router.get('/related/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { size = 5 } = req.query;
    
    // First get the source product
    const sourceProduct = await elasticsearchService.getDocument(id);
    
    if (!sourceProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find related products based on category and tags
    const query = {
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  { term: { category: sourceProduct.category } },
                  { terms: { tags: sourceProduct.tags || [] } }
                ],
                minimum_should_match: 1
              }
            }
          ],
          must_not: [
            { term: { id: id } }
          ]
        }
      },
      size: parseInt(size)
    };

    const response = await elasticsearchService.search(query);
    
    res.json({
      related: response.hits.hits.map(hit => ({
        ...hit._source,
        _score: hit._score
      })),
      source: sourceProduct
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
