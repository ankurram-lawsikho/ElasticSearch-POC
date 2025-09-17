// newrelic.js

'use strict'
/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: ['ElasticSearch-POC-App'], // <--- CHANGE THIS
  /**
   * Your New Relic license key.
   */
  license_key: 'eu01xx0d9867c73f2ce1be13220a36fbFFFFNRAL', // <--- AND CHANGE THIS
  logging: {
    /**
     * Level at which to log. 'info' is recommended for production.
     */
    level: 'info'
  },
  // ... other settings
}