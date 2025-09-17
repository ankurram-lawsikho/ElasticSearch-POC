const elasticsearch = require('elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.indexName = process.env.ELASTICSEARCH_INDEX_NAME || 'products';
  }

  async initialize() {
    try {
      this.client = new elasticsearch.Client({
        host: process.env.ELASTICSEARCH_HOST || 'localhost:9200',
        log: 'error',
        requestTimeout: 30000,
        pingTimeout: 3000
      });

      // Test connection
      await this.client.ping();
      console.log('Elasticsearch client initialized successfully');
      
      // Create index if it doesn't exist
      await this.createIndex();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.cluster.health();
      return {
        status: response.status,
        cluster_name: response.cluster_name,
        number_of_nodes: response.number_of_nodes,
        active_shards: response.active_shards
      };
    } catch (error) {
      throw new Error(`Elasticsearch health check failed: ${error.message}`);
    }
  }

  async createIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        const mapping = {
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { 
                  type: 'text',
                  analyzer: 'custom_analyzer',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                description: { 
                  type: 'text',
                  analyzer: 'custom_analyzer'
                },
                category: { 
                  type: 'keyword',
                  fields: {
                    text: { type: 'text' }
                  }
                },
                price: { type: 'double' },
                rating: { type: 'double' },
                tags: { type: 'keyword' },
                inStock: { type: 'boolean' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                metadata: {
                  type: 'object',
                  properties: {
                    brand: { type: 'keyword' },
                    color: { type: 'keyword' },
                    size: { type: 'keyword' },
                    weight: { type: 'double' }
                  }
                }
              }
            }
          }
        };

        await this.client.indices.create(mapping);
        console.log(`Index '${this.indexName}' created successfully`);
      } else {
        console.log(`Index '${this.indexName}' already exists`);
      }
    } catch (error) {
      console.error('Error creating index:', error);
      throw error;
    }
  }

  async deleteIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (exists) {
        await this.client.indices.delete({ index: this.indexName });
        console.log(`Index '${this.indexName}' deleted successfully`);
      }
    } catch (error) {
      console.error('Error deleting index:', error);
      throw error;
    }
  }

  async indexDocument(document) {
    try {
      const response = await this.client.index({
        index: this.indexName,
        id: document.id,
        body: document
      });
      return response;
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }

  async bulkIndex(documents) {
    try {
      const body = [];
      
      documents.forEach(doc => {
        body.push({
          index: {
            _index: this.indexName,
            _id: doc.id
          }
        });
        body.push(doc);
      });

      const response = await this.client.bulk({ body });
      
      if (response.errors) {
        const errors = response.items.filter(item => item.index.error);
        console.warn(`Bulk index completed with ${errors.length} errors`);
      }
      
      return response;
    } catch (error) {
      console.error('Error bulk indexing:', error);
      throw error;
    }
  }

  async search(query) {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: query
      });
      return response;
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  }

  async getDocument(id) {
    try {
      const response = await this.client.get({
        index: this.indexName,
        id: id
      });
      return response._source;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async updateDocument(id, document) {
    try {
      const response = await this.client.update({
        index: this.indexName,
        id: id,
        body: {
          doc: document
        }
      });
      return response;
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(id) {
    try {
      const response = await this.client.delete({
        index: this.indexName,
        id: id
      });
      return response;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getIndexStats() {
    try {
      const response = await this.client.indices.stats({
        index: this.indexName
      });
      return response.indices[this.indexName];
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }
}

module.exports = new ElasticsearchService();
