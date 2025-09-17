# Elasticsearch PoC - Search and Analytics Engine Evaluation

This Proof of Concept evaluates Elasticsearch as a search and analytics engine for data needs, focusing on setup, indexing, search capabilities, and performance testing.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- 4GB+ RAM available for Elasticsearch

### 1. Start Elasticsearch and Kibana
```bash
# Start Elasticsearch and Kibana using Docker
docker-compose up -d

# Check if services are running
docker-compose ps
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Sample Data
```bash
# Seed 1000 sample products (default)
npm run seed

# Or seed custom amount
SEED_COUNT=5000 npm run seed
```

### 4. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 Services

- **Express API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Elasticsearch**: http://localhost:9200
- **Kibana Dashboard**: http://localhost:5601

## 🔍 API Endpoints

### Health Check
- `GET /health` - Check application and Elasticsearch status

### Products
- `GET /api/products` - List products with pagination
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/bulk` - Bulk create products
- `GET /api/products/stats` - Get index statistics

### Search
- `POST /api/search` - Advanced search with multiple query types
- `GET /api/search/suggest` - Autocomplete suggestions
- `GET /api/search/facets` - Get search facets for filtering
- `GET /api/search/related/:id` - Find related products

### Analytics
- `GET /api/analytics/overview` - Overview analytics
- `GET /api/analytics/categories` - Category distribution
- `GET /api/analytics/price-distribution` - Price analysis
- `GET /api/analytics/rating-distribution` - Rating analysis
- `GET /api/analytics/trends` - Time-based trends
- `GET /api/analytics/search-analytics` - Search performance

### Performance Testing
- `POST /api/performance/load-test` - Run custom load tests
- `GET /api/performance/benchmark` - Run standard benchmarks
- `GET /api/performance/index-stats` - Get index performance stats

## 🧪 Testing

### Run Performance Tests
```bash
npm test
```

### Manual Testing Examples

#### 1. Basic Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "smartphone",
    "searchType": "multi_match",
    "filters": {
      "category": "Electronics",
      "priceMin": 100,
      "priceMax": 500
    }
  }'
```

#### 2. Analytics Overview
```bash
curl http://localhost:3000/api/analytics/overview
```

#### 3. Performance Benchmark
```bash
curl http://localhost:3000/api/performance/benchmark
```

## 📈 Key Features Tested

### Search Capabilities
- **Full-text search** with relevance scoring
- **Multi-field search** across name, description, category
- **Fuzzy search** with auto-correction
- **Wildcard and regex** pattern matching
- **Phrase matching** with slop
- **Boolean queries** with must/should/filter clauses

### Filtering & Faceting
- **Range filters** for price, rating, dates
- **Term filters** for categories, tags, boolean fields
- **Faceted search** with aggregation-based filters
- **Dynamic filtering** based on search results

### Analytics & Aggregations
- **Statistical aggregations** (avg, min, max, sum)
- **Bucket aggregations** (terms, range, histogram)
- **Nested aggregations** for complex analytics
- **Date histogram** for time-based trends
- **Cardinality** for unique value counts

### Performance Features
- **Bulk indexing** for efficient data loading
- **Pagination** with from/size and search_after
- **Sorting** by multiple fields
- **Highlighting** for search result snippets
- **Explain API** for query analysis

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express API   │────│   Elasticsearch  │────│     Kibana      │
│   (Node.js)     │    │   (Docker)       │    │   (Docker)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ├── Product Management
         ├── Search & Filtering  
         ├── Analytics & Aggregations
         └── Performance Testing
```

## 📊 Sample Data Structure

The PoC uses a product catalog with the following structure:

```json
{
  "id": "uuid",
  "name": "Product Name",
  "description": "Product Description",
  "category": "Electronics",
  "price": 299.99,
  "rating": 4.5,
  "tags": ["smart", "wireless", "premium"],
  "inStock": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "brand": "Brand Name",
    "color": "Black",
    "size": "M",
    "weight": 1.5
  }
}
```

## 🔧 Configuration

Environment variables (see `env.example`):

```bash
ELASTICSEARCH_HOST=localhost:9200
ELASTICSEARCH_INDEX_NAME=products
PORT=3000
NODE_ENV=development
SEED_COUNT=1000
```

## 📝 Test Scenarios

### 1. Basic CRUD Operations
- Create, read, update, delete products
- Bulk operations for data loading
- Index management and statistics

### 2. Search Functionality
- Simple and complex search queries
- Different search types (match, multi_match, fuzzy, wildcard)
- Filtering and faceting
- Sorting and pagination

### 3. Analytics
- Category distribution analysis
- Price range analysis
- Rating distribution
- Time-based trends
- Search analytics

### 4. Performance Testing
- Query response times
- Bulk indexing performance
- Concurrent search operations
- Memory and resource usage
- Scalability testing

## 🎯 Evaluation Criteria

### Relevance & Search Quality
- Search result relevance scoring
- Fuzzy matching accuracy
- Faceted search effectiveness
- Autocomplete suggestions quality

### Performance Metrics
- Query response times (target: <100ms for simple queries)
- Bulk indexing throughput
- Concurrent user handling
- Memory and CPU utilization

### Scalability
- Index size growth handling
- Query performance with large datasets
- Cluster scaling capabilities
- Resource optimization

### Integration Readiness
- API design and documentation
- Error handling and monitoring
- Configuration management
- Production deployment considerations

## 🚀 Production Readiness Recommendations

### Performance Optimizations
- Implement query caching
- Optimize index mappings
- Use appropriate analyzers
- Configure shard allocation

### Monitoring & Observability
- Set up Elasticsearch monitoring
- Implement application metrics
- Configure alerting
- Log aggregation and analysis

### Security
- Enable X-Pack security features
- Implement authentication/authorization
- Configure SSL/TLS
- Network security policies

### Backup & Recovery
- Configure index snapshots
- Implement backup strategies
- Test recovery procedures
- Document disaster recovery

## 🛠️ Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   ```bash
   # Check if Elasticsearch is running
   docker-compose ps
   docker-compose logs elasticsearch
   ```

2. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Or reduce ES heap size in docker-compose.yml
   ```

3. **Index Creation Failed**
   ```bash
   # Check Elasticsearch logs
   curl http://localhost:9200/_cluster/health
   ```

4. **Performance Issues**
   ```bash
   # Check index statistics
   curl http://localhost:9200/products/_stats
   ```

## 📚 Additional Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

## 📄 License

MIT License - see LICENSE file for details.
