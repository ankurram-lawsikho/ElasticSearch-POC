const fs = require('fs');
const csv = require('csv-parser');
const elasticsearchService = require('../services/elasticsearchService');

// Sample CSV data for products
const sampleCSVData = `id,name,description,category,price,rating,tags,inStock,brand,color,size
1,Wireless Bluetooth Headphones,High-quality wireless headphones with noise cancellation,Electronics,199.99,4.5,"wireless,audio,premium",true,Sony,Black,One Size
2,Gaming Mechanical Keyboard,RGB backlit mechanical keyboard for gaming,Electronics,149.99,4.3,"gaming,keyboard,mechanical",true,Corsair,Black,Full Size
3,Organic Cotton T-Shirt,100% organic cotton comfortable t-shirt,Clothing,29.99,4.2,"organic,cotton,comfortable",true,Everlane,White,M
4,Stainless Steel Water Bottle,Insulated stainless steel water bottle,Home & Garden,24.99,4.4,"stainless,steel,insulated",true,Hydro Flask,Silver,32oz
5,Wireless Charging Pad,Fast wireless charging pad for smartphones,Electronics,39.99,4.1,"wireless,charging,fast",true,Anker,Black,Standard
6,Leather Laptop Bag,Professional leather laptop bag,Accessories,89.99,4.6,"leather,professional,laptop",true,Fossil,Brown,15 inch
7,Bluetooth Speaker,Portable Bluetooth speaker with great sound,Electronics,79.99,4.0,"bluetooth,speaker,portable",true,JBL,Blue,Compact
8,Yoga Mat,Non-slip yoga mat for exercise,Sports,34.99,4.3,"yoga,exercise,non-slip",true,Lululemon,Purple,Standard
9,Coffee Maker,Programmable coffee maker with timer,Home & Garden,129.99,4.4,"coffee,programmable,timer",true,Mr. Coffee,Black,12 Cup
10,Smart Watch,Fitness tracking smart watch with GPS,Electronics,299.99,4.7,"smart,watch,fitness,gps",true,Apple,Space Gray,42mm`;

// Create sample CSV file
function createSampleCSV() {
  const csvPath = './data/sample-products.csv';
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }
  
  fs.writeFileSync(csvPath, sampleCSVData);
  console.log(`✅ Sample CSV file created: ${csvPath}`);
  return csvPath;
}

// Parse CSV and convert to products
function parseCSVToProducts(csvPath) {
  return new Promise((resolve, reject) => {
    const products = [];
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Convert CSV row to product object
        const product = {
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          price: parseFloat(row.price),
          rating: parseFloat(row.rating),
          tags: row.tags.split(',').map(tag => tag.trim()),
          inStock: row.inStock === 'true',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            brand: row.brand,
            color: row.color,
            size: row.size
          }
        };
        
        products.push(product);
      })
      .on('end', () => {
        console.log(`📊 Parsed ${products.length} products from CSV`);
        resolve(products);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Import CSV data to Elasticsearch
async function importCSVData(csvPath) {
  try {
    console.log('🚀 Starting CSV import process...');
    
    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    // Initialize Elasticsearch connection
    await elasticsearchService.initialize();
    console.log('✅ Connected to Elasticsearch');
    
    // Parse CSV data
    const products = await parseCSVToProducts(csvPath);
    
    // Bulk import to Elasticsearch
    console.log('⬆️  Importing products to Elasticsearch...');
    const response = await elasticsearchService.bulkIndex(products);
    
    if (response.errors) {
      const errors = response.items.filter(item => item.index.error);
      console.warn(`⚠️  Import completed with ${errors.length} errors`);
    } else {
      console.log('✅ All products imported successfully');
    }
    
    // Wait for indexing to complete
    console.log('⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify import
    const stats = await elasticsearchService.getIndexStats();
    console.log(`📊 Total documents in index: ${stats.total.docs.count}`);
    
    console.log('🎉 CSV import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing CSV data:', error);
    process.exit(1);
  }
}

// Main function
async function main() {
  // Check if CSV path is provided as command line argument
  const csvPath = process.argv[2] || createSampleCSV();
  
  console.log(`📁 Using CSV file: ${csvPath}`);
  await importCSVData(csvPath);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { importCSVData, createSampleCSV, parseCSVToProducts };
