const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  }
});

// POST /api/upload/csv - Upload and import CSV file
router.post('/csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    console.log(`📁 Processing uploaded file: ${req.file.filename}`);

    // Parse CSV file
    const products = await parseCSVFile(req.file.path);
    
    // Import to Elasticsearch
    const response = await elasticsearchService.bulkIndex(products);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: 'CSV file uploaded and processed successfully',
      filename: req.file.originalname,
      productsImported: products.length,
      errors: response.errors,
      details: {
        total: response.items.length,
        successful: response.items.filter(item => !item.index.error).length,
        failed: response.items.filter(item => item.index.error).length
      }
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      message: error.message 
    });
  }
});

// Helper function to parse CSV file
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const products = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Convert CSV row to product object
        const product = {
          id: row.id || generateId(),
          name: row.name || 'Unknown Product',
          description: row.description || '',
          category: row.category || 'Other',
          price: parseFloat(row.price) || 0,
          rating: parseFloat(row.rating) || 0,
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          inStock: row.inStock === 'true' || row.inStock === true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            brand: row.brand || '',
            color: row.color || '',
            size: row.size || ''
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

// Helper function to generate ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// GET /api/upload/sample - Download sample CSV template
router.get('/sample', (req, res) => {
  const sampleCSV = `id,name,description,category,price,rating,tags,inStock,brand,color,size
1,Wireless Bluetooth Headphones,High-quality wireless headphones with noise cancellation,Electronics,199.99,4.5,"wireless,audio,premium",true,Sony,Black,One Size
2,Gaming Mechanical Keyboard,RGB backlit mechanical keyboard for gaming,Electronics,149.99,4.3,"gaming,keyboard,mechanical",true,Corsair,Black,Full Size
3,Organic Cotton T-Shirt,100% organic cotton comfortable t-shirt,Clothing,29.99,4.2,"organic,cotton,comfortable",true,Everlane,White,M
4,Stainless Steel Water Bottle,Insulated stainless steel water bottle,Home & Garden,24.99,4.4,"stainless,steel,insulated",true,Hydro Flask,Silver,32oz
5,Wireless Charging Pad,Fast wireless charging pad for smartphones,Electronics,39.99,4.1,"wireless,charging,fast",true,Anker,Black,Standard`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="sample-products.csv"');
  res.send(sampleCSV);
});

module.exports = router;
