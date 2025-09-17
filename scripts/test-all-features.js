const elasticsearchService = require('../services/elasticsearchService');
const { importCSVData, createSampleCSV } = require('./import-csv');
const { runAggregationTests } = require('./test-aggregations');

// Test search with different analyzers
const searchTests = [
  {
    name: 'Basic Search',
    query: {
      query: {
        match: {
          name: 'wireless'
        }
      }
    }
  },
  {
    name: 'Synonym Search (phone = smartphone)',
    query: {
      query: {
        match: {
          name: 'phone'
        }
      }
    }
  },
  {
    name: 'Autocomplete Search',
    query: {
      query: {
        match: {
          'name.autocomplete': 'wire'
        }
      }
    }
  },
  {
    name: 'Multi-field Search with Boosting',
    query: {
      query: {
        multi_match: {
          query: 'bluetooth headphones',
          fields: ['name^3', 'description^2', 'category'],
          type: 'best_fields'
        }
      }
    }
  },
  {
    name: 'Fuzzy Search (typo tolerance)',
    query: {
      query: {
        fuzzy: {
          name: {
            value: 'headphons', // typo in headphones
            fuzziness: 2
          }
        }
      }
    }
  }
];

// Run comprehensive tests
async function runAllTests() {
  try {
    console.log('🚀 Starting Comprehensive Elasticsearch Feature Tests...\n');
    
    // Initialize connection
    await elasticsearchService.initialize();
    console.log('✅ Connected to Elasticsearch\n');
    
    // Test 1: CSV Import
    console.log('📊 TEST 1: CSV Data Import');
    console.log('=' .repeat(50));
    await testCSVImport();
    
    // Test 2: Enhanced Search with Analyzers
    console.log('\n🔍 TEST 2: Enhanced Search with Text Analyzers');
    console.log('=' .repeat(50));
    await testEnhancedSearch();
    
    // Test 3: Aggregations
    console.log('\n📈 TEST 3: Simple Aggregations');
    console.log('=' .repeat(50));
    await testAggregations();
    
    console.log('\n🎉 All feature tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Test CSV import functionality
async function testCSVImport() {
  try {
    console.log('📁 Testing CSV import...');
    
    // Create sample CSV
    const csvPath = createSampleCSV();
    console.log(`✅ Sample CSV created: ${csvPath}`);
    
    // Import CSV data
    await importCSVData(csvPath);
    console.log('✅ CSV import test completed');
    
  } catch (error) {
    console.error('❌ CSV import test failed:', error.message);
  }
}

// Test enhanced search with different analyzers
async function testEnhancedSearch() {
  for (const test of searchTests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log('-'.repeat(30));
    
    const startTime = Date.now();
    
    try {
      const response = await elasticsearchService.search(test.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Success - Duration: ${duration}ms`);
      console.log(`📊 Found ${response.hits.total.value} results`);
      
      // Show top 3 results
      if (response.hits.hits.length > 0) {
        console.log('🏆 Top Results:');
        response.hits.hits.slice(0, 3).forEach((hit, index) => {
          console.log(`  ${index + 1}. ${hit._source.name} (Score: ${hit._score.toFixed(2)})`);
        });
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`❌ Failed - Duration: ${duration}ms`);
      console.log(`Error: ${error.message}`);
    }
  }
}

// Test aggregations
async function testAggregations() {
  try {
    // Run a few key aggregation tests
    const keyTests = [
      {
        name: 'Category Count',
        query: {
          aggs: {
            categories: {
              terms: { 
                field: 'category',
                size: 5,
                order: { _count: 'desc' }
              }
            }
          },
          size: 0
        }
      },
      {
        name: 'Price Analysis',
        query: {
          aggs: {
            price_stats: {
              stats: { field: 'price' }
            },
            avg_rating: {
              avg: { field: 'rating' }
            }
          },
          size: 0
        }
      },
      {
        name: 'Stock Status',
        query: {
          aggs: {
            stock_status: {
              terms: { field: 'inStock' },
              aggs: {
                avg_price: {
                  avg: { field: 'price' }
                }
              }
            }
          },
          size: 0
        }
      }
    ];
    
    for (const test of keyTests) {
      console.log(`\n📊 Testing: ${test.name}`);
      console.log('-'.repeat(30));
      
      const startTime = Date.now();
      
      try {
        const response = await elasticsearchService.search(test.query);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Success - Duration: ${duration}ms`);
        console.log('📈 Results:');
        
        // Display results based on test type
        displayAggregationResult(test.name, response.aggregations);
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`❌ Failed - Duration: ${duration}ms`);
        console.log(`Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Aggregation test failed:', error.message);
  }
}

// Display aggregation results
function displayAggregationResult(testName, aggregations) {
  switch (testName) {
    case 'Category Count':
      console.log('Categories:');
      aggregations.categories.buckets.forEach(bucket => {
        console.log(`  ${bucket.key}: ${bucket.doc_count} products`);
      });
      break;
      
    case 'Price Analysis':
      const stats = aggregations.price_stats;
      console.log('Price Statistics:');
      console.log(`  Count: ${stats.count}`);
      console.log(`  Average: $${stats.avg.toFixed(2)}`);
      console.log(`  Min: $${stats.min.toFixed(2)}`);
      console.log(`  Max: $${stats.max.toFixed(2)}`);
      console.log(`  Average Rating: ${aggregations.avg_rating.value.toFixed(1)}`);
      break;
      
    case 'Stock Status':
      console.log('Stock Analysis:');
      aggregations.stock_status.buckets.forEach(bucket => {
        const status = bucket.key ? 'In Stock' : 'Out of Stock';
        console.log(`  ${status}: ${bucket.doc_count} products (Avg Price: $${bucket.avg_price.value.toFixed(2)})`);
      });
      break;
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
