const faker = require('faker');
const elasticsearchService = require('../services/elasticsearchService');

// Sample product categories
const categories = [
  'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 
  'Beauty', 'Toys', 'Automotive', 'Health', 'Food & Beverages'
];

// Sample tags
const allTags = [
  'new', 'sale', 'bestseller', 'premium', 'eco-friendly', 'organic',
  'wireless', 'smart', 'portable', 'durable', 'lightweight', 'compact',
  'waterproof', 'rechargeable', 'adjustable', 'multi-purpose'
];

// Generate sample products
function generateProducts(count = 1000) {
  const products = [];
  
  for (let i = 0; i < count; i++) {
    const category = faker.helpers.arrayElement(categories);
    const tags = faker.helpers.arrayElements(allTags, faker.datatype.number({ min: 1, max: 5 }));
    
    const product = {
      id: faker.datatype.uuid(),
      name: generateProductName(category),
      description: faker.lorem.paragraphs(faker.datatype.number({ min: 1, max: 3 })),
      category: category,
      price: parseFloat(faker.commerce.price(10, 1000, 2)),
      rating: parseFloat(faker.datatype.number({ min: 1, max: 5, precision: 0.1 })),
      tags: tags,
      inStock: faker.datatype.boolean(),
      createdAt: faker.date.past(2).toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      metadata: {
        brand: faker.company.companyName(),
        color: faker.commerce.color(),
        size: faker.helpers.arrayElement(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']),
        weight: parseFloat(faker.datatype.number({ min: 0.1, max: 50, precision: 0.1 }))
      }
    };
    
    products.push(product);
  }
  
  return products;
}

// Generate product names based on category
function generateProductName(category) {
  const prefixes = {
    'Electronics': ['Smart', 'Digital', 'Wireless', 'Portable', 'Advanced'],
    'Clothing': ['Premium', 'Comfortable', 'Stylish', 'Classic', 'Modern'],
    'Books': ['Essential', 'Complete', 'Advanced', 'Beginner\'s', 'Professional'],
    'Home & Garden': ['Eco-Friendly', 'Durable', 'Compact', 'Multi-Purpose', 'Premium'],
    'Sports': ['Professional', 'Training', 'Competition', 'Recreational', 'High-Performance'],
    'Beauty': ['Natural', 'Organic', 'Luxury', 'Essential', 'Professional'],
    'Toys': ['Educational', 'Interactive', 'Creative', 'Fun', 'Safe'],
    'Automotive': ['Heavy-Duty', 'Performance', 'Universal', 'Professional', 'Premium'],
    'Health': ['Natural', 'Organic', 'Essential', 'Professional', 'Advanced'],
    'Food & Beverages': ['Organic', 'Premium', 'Natural', 'Artisan', 'Gourmet']
  };
  
  const categoryPrefixes = prefixes[category] || ['Premium', 'Quality', 'Professional'];
  const prefix = faker.helpers.arrayElement(categoryPrefixes);
  const productType = faker.commerce.productName();
  
  return `${prefix} ${productType}`;
}

// Main seeding function
async function seedData() {
  try {
    console.log('🌱 Starting data seeding process...');
    
    // Initialize Elasticsearch connection
    await elasticsearchService.initialize();
    console.log('✅ Connected to Elasticsearch');
    
    // Delete existing index if it exists
    console.log('🗑️  Cleaning up existing data...');
    await elasticsearchService.deleteIndex();
    
    // Recreate index
    console.log('📝 Creating fresh index...');
    await elasticsearchService.createIndex();
    
    // Generate products
    const productCount = process.env.SEED_COUNT || 1000;
    console.log(`📦 Generating ${productCount} sample products...`);
    const products = generateProducts(parseInt(productCount));
    
    // Bulk insert products
    console.log('⬆️  Inserting products into Elasticsearch...');
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await elasticsearchService.bulkIndex(batch);
      inserted += batch.length;
      console.log(`   Inserted ${inserted}/${products.length} products...`);
    }
    
    // Wait for indexing to complete
    console.log('⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify data
    console.log('🔍 Verifying data...');
    const stats = await elasticsearchService.getIndexStats();
    console.log(`✅ Successfully seeded ${stats.total.docs.count} products`);
    
    console.log('🎉 Data seeding completed successfully!');
    console.log('\n📊 You can now:');
    console.log('   - Test the API: http://localhost:3000/health');
    console.log('   - View products: http://localhost:3000/api/products');
    console.log('   - Search products: http://localhost:3000/api/search');
    console.log('   - View analytics: http://localhost:3000/api/analytics');
    console.log('   - Run benchmarks: http://localhost:3000/api/performance/benchmark');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { generateProducts, seedData };
