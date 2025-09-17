const express = require('express');
const elasticsearchService = require('../services/elasticsearchService');

const router = express.Router();

// POST /api/analyzers/test - Test different text analyzers
router.post('/test', async (req, res) => {
  try {
    const { 
      text, 
      analyzer = 'custom_analyzer',
      field = 'name'
    } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text parameter is required',
        example: { text: 'Wireless Bluetooth Headphones' }
      });
    }

    // Test the analyzer by analyzing the text
    const analysisResponse = await elasticsearchService.client.indices.analyze({
      index: elasticsearchService.indexName,
      body: {
        analyzer: analyzer,
        text: text
      }
    });

    // Also test search with the analyzed text
    const searchResponse = await elasticsearchService.search({
      query: {
        match: {
          [field]: text
        }
      },
      size: 5
    });

    res.json({
      input: {
        text: text,
        analyzer: analyzer,
        field: field
      },
      analysis: {
        tokens: analysisResponse.tokens.map(token => ({
          token: token.token,
          start_offset: token.start_offset,
          end_offset: token.end_offset,
          type: token.type,
          position: token.position
        }))
      },
      search_results: {
        total: searchResponse.hits.total.value,
        products: searchResponse.hits.hits.map(hit => ({
          name: hit._source.name,
          score: hit._score
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analyzers/available - Get available analyzers
router.get('/available', async (req, res) => {
  try {
    const analyzers = {
      custom_analyzer: {
        description: 'Custom analyzer with lowercase, stop words, stemming, and synonyms',
        filters: ['lowercase', 'stop', 'snowball', 'synonym_filter'],
        tokenizer: 'standard'
      },
      keyword_analyzer: {
        description: 'Keyword analyzer for exact matches',
        filters: ['lowercase'],
        tokenizer: 'keyword'
      },
      autocomplete_analyzer: {
        description: 'Autocomplete analyzer with edge n-grams',
        filters: ['lowercase', 'autocomplete_filter'],
        tokenizer: 'standard'
      },
      standard: {
        description: 'Standard Elasticsearch analyzer',
        filters: ['lowercase'],
        tokenizer: 'standard'
      }
    };

    res.json({
      analyzers: analyzers,
      usage: {
        endpoint: 'POST /api/analyzers/test',
        body: {
          text: 'Your text to analyze',
          analyzer: 'analyzer_name',
          field: 'field_name'
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analyzers/compare - Compare multiple analyzers
router.post('/compare', async (req, res) => {
  try {
    const { 
      text,
      analyzers = ['custom_analyzer', 'standard', 'keyword_analyzer']
    } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text parameter is required',
        example: { text: 'Wireless Bluetooth Headphones' }
      });
    }

    const results = {};

    for (const analyzer of analyzers) {
      try {
        const analysisResponse = await elasticsearchService.client.indices.analyze({
          index: elasticsearchService.indexName,
          body: {
            analyzer: analyzer,
            text: text
          }
        });

        results[analyzer] = {
          tokens: analysisResponse.tokens.map(token => ({
            token: token.token,
            type: token.type,
            position: token.position
          }))
        };
      } catch (error) {
        results[analyzer] = {
          error: error.message
        };
      }
    }

    res.json({
      input: {
        text: text,
        analyzers: analyzers
      },
      results: results
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analyzers/synonyms - Test synonym functionality
router.post('/synonyms', async (req, res) => {
  try {
    const { 
      text,
      test_synonyms = ['phone', 'laptop', 'headphones', 'wireless']
    } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text parameter is required',
        example: { text: 'smartphone' }
      });
    }

    const results = {};

    // Test each synonym
    for (const synonym of test_synonyms) {
      try {
        const searchResponse = await elasticsearchService.search({
          query: {
            multi_match: {
              query: synonym,
              fields: ['name^3', 'description^2'],
              type: 'best_fields'
            }
          },
          size: 3
        });

        results[synonym] = {
          total_results: searchResponse.hits.total.value,
          top_results: searchResponse.hits.hits.map(hit => ({
            name: hit._source.name,
            score: hit._score
          }))
        };
      } catch (error) {
        results[synonym] = {
          error: error.message
        };
      }
    }

    res.json({
      input: {
        text: text,
        test_synonyms: test_synonyms
      },
      synonym_results: results,
      note: 'Synonyms are configured in the index mapping and should find related terms'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
