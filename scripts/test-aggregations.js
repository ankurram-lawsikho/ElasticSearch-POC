const elasticsearchService = require('../services/elasticsearchService');

// Test various aggregation queries
const aggregationTests = {
  // Basic count aggregation
  countByCategory: {
    aggs: {
      categories: {
        terms: { 
          field: 'category',
          size: 10,
          order: { _count: 'desc' }
        }
      }
    },
    size: 0
  },

  // Average price by category
  avgPriceByCategory: {
    aggs: {
      categories: {
        terms: { 
          field: 'category',
          size: 10
        },
        aggs: {
          avg_price: {
            avg: { field: 'price' }
          },
          min_price: {
            min: { field: 'price' }
          },
          max_price: {
            max: { field: 'price' }
          }
        }
      }
    },
    size: 0
  },

  // Price range distribution
  priceRanges: {
    aggs: {
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 50, key: 'Under $50' },
            { from: 50, to: 100, key: '$50 - $100' },
            { from: 100, to: 200, key: '$100 - $200' },
            { from: 200, to: 500, key: '$200 - $500' },
            { from: 500, key: 'Over $500' }
          ]
        },
        aggs: {
          avg_rating: {
            avg: { field: 'rating' }
          }
        }
      }
    },
    size: 0
  },

  // Rating distribution
  ratingDistribution: {
    aggs: {
      rating_ranges: {
        range: {
          field: 'rating',
          ranges: [
            { to: 2, key: 'Poor (0-2)' },
            { from: 2, to: 3, key: 'Fair (2-3)' },
            { from: 3, to: 4, key: 'Good (3-4)' },
            { from: 4, to: 5, key: 'Excellent (4-5)' }
          ]
        },
        aggs: {
          avg_price: {
            avg: { field: 'price' }
          }
        }
      }
    },
    size: 0
  },

  // Stock status analysis
  stockAnalysis: {
    aggs: {
      stock_status: {
        terms: { field: 'inStock' },
        aggs: {
          avg_price: {
            avg: { field: 'price' }
          },
          avg_rating: {
            avg: { field: 'rating' }
          }
        }
      }
    },
    size: 0
  },

  // Top tags
  topTags: {
    aggs: {
      popular_tags: {
        terms: { 
          field: 'tags',
          size: 20,
          order: { _count: 'desc' }
        }
      }
    },
    size: 0
  },

  // Date histogram (if you have date data)
  dateHistogram: {
    aggs: {
      products_over_time: {
        date_histogram: {
          field: 'createdAt',
          calendar_interval: 'day',
          min_doc_count: 0
        },
        aggs: {
          avg_price: {
            avg: { field: 'price' }
          }
        }
      }
    },
    size: 0
  },

  // Complex multi-level aggregation
  complexAnalysis: {
    aggs: {
      categories: {
        terms: { 
          field: 'category',
          size: 5
        },
        aggs: {
          avg_price: {
            avg: { field: 'price' }
          },
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
              _source: ['name', 'price', 'rating']
            }
          }
        }
      }
    },
    size: 0
  }
};

// Run aggregation tests
async function runAggregationTests() {
  try {
    console.log('🚀 Starting Elasticsearch Aggregation Tests...\n');
    
    // Initialize connection
    await elasticsearchService.initialize();
    console.log('✅ Connected to Elasticsearch\n');
    
    // Run each aggregation test
    for (const [testName, query] of Object.entries(aggregationTests)) {
      console.log(`📊 Testing: ${testName}`);
      console.log('=' .repeat(50));
      
      const startTime = Date.now();
      
      try {
        const response = await elasticsearchService.search(query);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ Success - Duration: ${duration}ms`);
        console.log('📈 Results:');
        
        // Format and display results based on aggregation type
        displayAggregationResults(testName, response.aggregations);
        
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`❌ Failed - Duration: ${duration}ms`);
        console.log(`Error: ${error.message}`);
      }
      
      console.log('\n');
    }
    
    console.log('🎉 Aggregation tests completed!');
    
  } catch (error) {
    console.error('❌ Aggregation test failed:', error);
    process.exit(1);
  }
}

// Display formatted aggregation results
function displayAggregationResults(testName, aggregations) {
  switch (testName) {
    case 'countByCategory':
      console.log('Categories:');
      aggregations.categories.buckets.forEach(bucket => {
        console.log(`  ${bucket.key}: ${bucket.doc_count} products`);
      });
      break;
      
    case 'avgPriceByCategory':
      console.log('Category Price Analysis:');
      aggregations.categories.buckets.forEach(bucket => {
        console.log(`  ${bucket.key}:`);
        console.log(`    Count: ${bucket.doc_count}`);
        console.log(`    Avg Price: $${bucket.avg_price.value.toFixed(2)}`);
        console.log(`    Min Price: $${bucket.min_price.value.toFixed(2)}`);
        console.log(`    Max Price: $${bucket.max_price.value.toFixed(2)}`);
      });
      break;
      
    case 'priceRanges':
      console.log('Price Range Distribution:');
      aggregations.price_ranges.buckets.forEach(bucket => {
        console.log(`  ${bucket.key}: ${bucket.doc_count} products (Avg Rating: ${bucket.avg_rating.value.toFixed(1)})`);
      });
      break;
      
    case 'ratingDistribution':
      console.log('Rating Distribution:');
      aggregations.rating_ranges.buckets.forEach(bucket => {
        console.log(`  ${bucket.key}: ${bucket.doc_count} products (Avg Price: $${bucket.avg_price.value.toFixed(2)})`);
      });
      break;
      
    case 'stockAnalysis':
      console.log('Stock Status Analysis:');
      aggregations.stock_status.buckets.forEach(bucket => {
        const status = bucket.key ? 'In Stock' : 'Out of Stock';
        console.log(`  ${status}: ${bucket.doc_count} products`);
        console.log(`    Avg Price: $${bucket.avg_price.value.toFixed(2)}`);
        console.log(`    Avg Rating: ${bucket.avg_rating.value.toFixed(1)}`);
      });
      break;
      
    case 'topTags':
      console.log('Most Popular Tags:');
      aggregations.popular_tags.buckets.slice(0, 10).forEach(bucket => {
        console.log(`  ${bucket.key}: ${bucket.doc_count} products`);
      });
      break;
      
    case 'complexAnalysis':
      console.log('Complex Category Analysis:');
      aggregations.categories.buckets.forEach(category => {
        console.log(`  ${category.key}:`);
        console.log(`    Total Products: ${category.doc_count}`);
        console.log(`    Avg Price: $${category.avg_price.value.toFixed(2)}`);
        console.log(`    Price Ranges:`);
        category.price_ranges.buckets.forEach(range => {
          console.log(`      ${range.key}: ${range.doc_count} products`);
        });
        console.log(`    Top Products:`);
        category.top_products.hits.hits.forEach(hit => {
          console.log(`      - ${hit._source.name} ($${hit._source.price}, Rating: ${hit._source.rating})`);
        });
      });
      break;
      
    default:
      console.log('Raw Results:', JSON.stringify(aggregations, null, 2));
  }
}

// Run if called directly
if (require.main === module) {
  runAggregationTests();
}

module.exports = { runAggregationTests, aggregationTests };
