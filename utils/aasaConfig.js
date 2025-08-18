const fs = require('fs');
const path = require('path');

class AASAConfig {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config', 'apple-app-site-association.json');
    this.defaultConfig = {
      applinks: {
        details: [
          {
            appIDs: ["TEAMID.com.morafinance.app"],
            components: [
              {
                "/": "/",
                comment: "Matches all shortlinks for Universal Links"
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * Load AASA configuration from file
   * @returns {Object} AASA configuration object
   */
  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.warn('AASA config file not found, creating default configuration');
        this.createDefaultConfig();
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      if (this.validateConfig(config)) {
        console.log('AASA configuration loaded successfully');
        return config;
      } else {
        console.error('Invalid AASA configuration, using default');
        return this.defaultConfig;
      }
    } catch (error) {
      console.error('Error loading AASA configuration:', error.message);
      console.log('Using default AASA configuration');
      return this.defaultConfig;
    }
  }

  /**
   * Validate AASA configuration format
   * @param {Object} config - Configuration to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateConfig(config) {
    try {
      // Check basic structure
      if (!config || typeof config !== 'object') {
        console.error('AASA config must be an object');
        return false;
      }

      if (!config.applinks || typeof config.applinks !== 'object') {
        console.error('AASA config must have applinks object');
        return false;
      }

      if (!Array.isArray(config.applinks.details)) {
        console.error('AASA config applinks.details must be an array');
        return false;
      }

      // Validate each detail entry
      for (const detail of config.applinks.details) {
        if (!Array.isArray(detail.appIDs) || detail.appIDs.length === 0) {
          console.error('Each AASA detail must have non-empty appIDs array');
          return false;
        }

        // Validate app ID format (TEAMID.bundleID)
        for (const appID of detail.appIDs) {
          if (typeof appID !== 'string' || !appID.includes('.')) {
            console.error(`Invalid app ID format: ${appID}`);
            return false;
          }
        }

        if (!Array.isArray(detail.components)) {
          console.error('Each AASA detail must have components array');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating AASA config:', error.message);
      return false;
    }
  }

  /**
   * Create default configuration file
   */
  createDefaultConfig() {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.defaultConfig, null, 2));
      console.log('Default AASA configuration file created');
    } catch (error) {
      console.error('Error creating default AASA config:', error.message);
    }
  }

  /**
   * Get configuration file path
   * @returns {string} Path to configuration file
   */
  getConfigPath() {
    return this.configPath;
  }
}

module.exports = AASAConfig;