const elasticsearchService = require('../services/elasticsearchService');

// Performance test scenarios
const testScenarios = {
  search: [
    {
      query: { match: { name: 'smartphone' } },
      size: 10
    },
    {
      query: {
        multi_match: {
          query: 'electronics',
          fields: ['name^3', 'description^2', 'category']
        }
      },
      size: 20
    },
    {
      query: {
        bool: {
          must: [
            { match: { category: 'Electronics' } }
          ],
          filter: [
            { range: { price: { gte: 100, lte: 500 } } },
            { term: { inStock: true } }
          ]
        }
      },
      size: 15
    },
    {
      query: {
        wildcard: {
          name: {
            value: '*smart*',
            case_insensitive: true
          }
        }
      },
      size: 10
    }
  ],
  
  aggregation: [
    {
      aggs: {
        categories: {
          terms: { field: 'category', size: 10 }
        },
        avg_price: {
          avg: { field: 'price' }
        }
      },
      size: 0
    },
    {
      aggs: {
        price_ranges: {
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
    }
  ],
  
  complex: [
    {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: 'premium quality',
                fields: ['name^3', 'description^2'],
                type: 'best_fields'
              }
            }
          ],
          should: [
            { term: { tags: 'premium' } },
            { range: { rating: { gte: 4.0 } } }
          ],
          filter: [
            { term: { inStock: true } }
          ]
        }
      },
      sort: [
        { rating: { order: 'desc' } },
        { price: { order: 'asc' } }
      ],
      size: 20
    }
  ]
};

// Run performance tests
async function runPerformanceTests() {
  try {
    console.log('🚀 Starting Elasticsearch Performance Tests...\n');
    
    // Initialize connection
    await elasticsearchService.initialize();
    console.log('✅ Connected to Elasticsearch\n');
    
    // Test each scenario
    for (const [scenarioName, queries] of Object.entries(testScenarios)) {
      console.log(`📊 Testing ${scenarioName} scenarios:`);
      console.log('=' .repeat(50));
      
      const results = [];
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const startTime = Date.now();
        
        try {
          const response = await elasticsearchService.search(query);
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          results.push({
            query: i + 1,
            success: true,
            duration: duration,
            elasticsearchTook: response.took,
            hits: response.hits ? response.hits.total.value : 0,
            responseSize: JSON.stringify(response).length
          });
          
          console.log(`   Query ${i + 1}: ✅ ${duration}ms (ES: ${response.took}ms, Hits: ${response.hits ? response.hits.total.value : 'N/A'})`);
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          results.push({
            query: i + 1,
            success: false,
            duration: duration,
            error: error.message
          });
          
          console.log(`   Query ${i + 1}: ❌ ${duration}ms - ${error.message}`);
        }
      }
      
      // Calculate statistics for this scenario
      const successfulQueries = results.filter(r => r.success);
      const durations = successfulQueries.map(r => r.duration);
      
      if (durations.length > 0) {
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        console.log(`\n   📈 Statistics:`);
        console.log(`      Success Rate: ${(successfulQueries.length / results.length * 100).toFixed(1)}%`);
        console.log(`      Average Duration: ${avgDuration.toFixed(2)}ms`);
        console.log(`      Min Duration: ${minDuration}ms`);
        console.log(`      Max Duration: ${maxDuration}ms`);
      }
      
      console.log('\n');
    }
    
    // Test bulk operations
    console.log('📦 Testing bulk operations:');
    console.log('=' .repeat(50));
    
    const bulkTestData = Array.from({ length: 100 }, (_, i) => ({
      id: `bulk-test-${i}`,
      name: `Bulk Test Product ${i}`,
      description: `Test product for bulk operations ${i}`,
      category: 'Test',
      price: Math.random() * 1000,
      rating: Math.random() * 5,
      tags: ['test', 'bulk'],
      inStock: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    const bulkStartTime = Date.now();
    try {
      await elasticsearchService.bulkIndex(bulkTestData);
      const bulkEndTime = Date.now();
      const bulkDuration = bulkEndTime - bulkStartTime;
      
      console.log(`   Bulk Insert (100 docs): ✅ ${bulkDuration}ms`);
      console.log(`   Average per document: ${(bulkDuration / 100).toFixed(2)}ms`);
    } catch (error) {
      console.log(`   Bulk Insert: ❌ ${error.message}`);
    }
    
    // Get index statistics
    console.log('\n📊 Index Statistics:');
    console.log('=' .repeat(50));
    
    try {
      const stats = await elasticsearchService.getIndexStats();
      console.log(`   Total Documents: ${stats.total.docs.count}`);
      console.log(`   Index Size: ${(stats.total.store.size_in_bytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Shards: ${stats.shards.total} (${stats.shards.successful} successful)`);
    } catch (error) {
      console.log(`   Statistics: ❌ ${error.message}`);
    }
    
    console.log('\n🎉 Performance tests completed!');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { runPerformanceTests, testScenarios };
