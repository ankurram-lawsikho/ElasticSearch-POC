const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// POST /api/performance/load-test - Run load test
router.post('/load-test', async (req, res) => {
  try {
    const { 
      queries = [], 
      iterations = 10, 
      concurrent = 5,
      testType = 'search' 
    } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ 
        error: 'Queries array is required and must not be empty' 
      });
    }

    const results = {
      testType,
      iterations,
      concurrent,
      totalQueries: queries.length,
      startTime: new Date().toISOString(),
      results: []
    };

    // Run performance tests
    for (let i = 0; i < iterations; i++) {
      const iterationResults = [];
      
      for (const query of queries) {
        const startTime = Date.now();
        
        try {
          let response;
          switch (testType) {
            case 'search':
              response = await elasticsearchService.search(query);
              break;
            case 'index':
              response = await elasticsearchService.indexDocument(query);
              break;
            case 'get':
              response = await elasticsearchService.getDocument(query.id);
              break;
            default:
              response = await elasticsearchService.search(query);
          }
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          iterationResults.push({
            query: query,
            success: true,
            duration: duration,
            responseSize: JSON.stringify(response).length,
            hits: response.hits ? response.hits.total.value : 0,
            took: response.took || 0
          });
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          iterationResults.push({
            query: query,
            success: false,
            duration: duration,
            error: error.message
          });
        }
      }
      
      results.results.push({
        iteration: i + 1,
        queries: iterationResults
      });
    }

    // Calculate statistics
    const allDurations = results.results
      .flatMap(iteration => iteration.queries)
      .map(query => query.duration)
      .filter(duration => duration !== undefined);

    const successfulQueries = results.results
      .flatMap(iteration => iteration.queries)
      .filter(query => query.success);

    const statistics = {
      totalQueries: allDurations.length,
      successfulQueries: successfulQueries.length,
      failedQueries: allDurations.length - successfulQueries.length,
      successRate: (successfulQueries.length / allDurations.length) * 100,
      averageDuration: allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
      minDuration: Math.min(...allDurations),
      maxDuration: Math.max(...allDurations),
      p50Duration: calculatePercentile(allDurations, 50),
      p90Duration: calculatePercentile(allDurations, 90),
      p95Duration: calculatePercentile(allDurations, 95),
      p99Duration: calculatePercentile(allDurations, 99)
    };

    results.endTime = new Date().toISOString();
    results.statistics = statistics;

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/benchmark - Run standard benchmark tests
router.get('/benchmark', async (req, res) => {
  try {
    const { size = 1000 } = req.query;
    
    const benchmarkTests = [
      {
        name: 'Simple Match Query',
        query: {
          query: { match: { name: 'test' } },
          size: 10
        }
      },
      {
        name: 'Multi-Match Query',
        query: {
          query: {
            multi_match: {
              query: 'electronics',
              fields: ['name^3', 'description^2', 'category']
            }
          },
          size: 10
        }
      },
      {
        name: 'Range Query',
        query: {
          query: {
            range: {
              price: { gte: 50, lte: 200 }
            }
          },
          size: 10
        }
      },
      {
        name: 'Bool Query with Filters',
        query: {
          query: {
            bool: {
              must: [
                { match: { category: 'electronics' } }
              ],
              filter: [
                { range: { price: { gte: 100 } } },
                { term: { inStock: true } }
              ]
            }
          },
          size: 10
        }
      },
      {
        name: 'Aggregation Query',
        query: {
          aggs: {
            categories: {
              terms: { field: 'category', size: 10 }
            },
            avg_price: {
              avg: { field: 'price' }
            }
          },
          size: 0
        }
      },
      {
        name: 'Complex Search with Sorting',
        query: {
          query: {
            multi_match: {
              query: 'smartphone',
              fields: ['name^3', 'description^2']
            }
          },
          sort: [
            { rating: { order: 'desc' } },
            { price: { order: 'asc' } }
          ],
          size: 10
        }
      }
    ];

    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    for (const test of benchmarkTests) {
      const startTime = Date.now();
      
      try {
        const response = await elasticsearchService.search(test.query);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.tests.push({
          name: test.name,
          success: true,
          duration: duration,
          elasticsearchTook: response.took,
          totalHits: response.hits.total.value,
          responseSize: JSON.stringify(response).length
        });
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        results.tests.push({
          name: test.name,
          success: false,
          duration: duration,
          error: error.message
        });
      }
    }

    // Calculate overall statistics
    const successfulTests = results.tests.filter(test => test.success);
    const durations = successfulTests.map(test => test.duration);
    
    results.summary = {
      totalTests: results.tests.length,
      successfulTests: successfulTests.length,
      failedTests: results.tests.length - successfulTests.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    };

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/performance/index-stats - Get index performance statistics
router.get('/index-stats', async (req, res) => {
  try {
    const stats = await elasticsearchService.getIndexStats();
    
    res.json({
      index: {
        name: stats.index,
        total_documents: stats.total.docs.count,
        deleted_documents: stats.total.docs.deleted,
        index_size_bytes: stats.total.store.size_in_bytes,
        index_size_mb: Math.round(stats.total.store.size_in_bytes / 1024 / 1024 * 100) / 100
      },
      shards: {
        total: stats.shards.total,
        successful: stats.shards.successful,
        failed: stats.shards.failed
      },
      primaries: {
        documents: stats.primaries.docs.count,
        size_bytes: stats.primaries.store.size_in_bytes,
        size_mb: Math.round(stats.primaries.store.size_in_bytes / 1024 / 1024 * 100) / 100
      },
      search: {
        query_total: stats.total.search.query_total,
        query_time_ms: stats.total.search.query_time_in_millis,
        fetch_total: stats.total.search.fetch_total,
        fetch_time_ms: stats.total.search.fetch_time_in_millis
      },
      indexing: {
        index_total: stats.total.indexing.index_total,
        index_time_ms: stats.total.indexing.index_time_in_millis,
        index_current: stats.total.indexing.index_current
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate percentiles
function calculatePercentile(arr, percentile) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

module.exports = router;
