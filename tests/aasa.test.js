const request = require('supertest');
const fs = require('fs');
const path = require('path');
const AASAConfig = require('../utils/aasaConfig');

// Mock Express app for testing
const express = require('express');
const app = express();

// Add AASA endpoint to test app
const aasaConfig = new AASAConfig();
app.get('/.well-known/apple-app-site-association', (req, res) => {
  try {
    const aasaData = aasaConfig.loadConfig();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(aasaData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

describe('AASA Configuration Tests', () => {
  let testConfigPath;
  let originalConfigPath;

  beforeEach(() => {
    // Create a test config path
    testConfigPath = path.join(__dirname, 'test-apple-app-site-association.json');
    originalConfigPath = aasaConfig.configPath;
    aasaConfig.configPath = testConfigPath;
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    aasaConfig.configPath = originalConfigPath;
  });

  describe('Configuration Validation', () => {
    test('should validate correct AASA configuration', () => {
      const validConfig = {
        applinks: {
          details: [
            {
              appIDs: ['TEAMID.com.morafinance.app'],
              components: [
                {
                  '/': '/',
                  comment: 'Matches all shortlinks'
                }
              ]
            }
          ]
        }
      };

      expect(aasaConfig.validateConfig(validConfig)).toBe(true);
    });

    test('should reject invalid AASA configuration - missing applinks', () => {
      const invalidConfig = {
        invalid: 'config'
      };

      expect(aasaConfig.validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject invalid AASA configuration - empty appIDs', () => {
      const invalidConfig = {
        applinks: {
          details: [
            {
              appIDs: [],
              components: []
            }
          ]
        }
      };

      expect(aasaConfig.validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject invalid AASA configuration - malformed appID', () => {
      const invalidConfig = {
        applinks: {
          details: [
            {
              appIDs: ['invalid-app-id'],
              components: []
            }
          ]
        }
      };

      expect(aasaConfig.validateConfig(invalidConfig)).toBe(false);
    });

    test('should reject invalid AASA configuration - missing components', () => {
      const invalidConfig = {
        applinks: {
          details: [
            {
              appIDs: ['TEAMID.com.morafinance.app']
            }
          ]
        }
      };

      expect(aasaConfig.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Configuration Loading', () => {
    test('should load valid configuration from file', () => {
      const validConfig = {
        applinks: {
          details: [
            {
              appIDs: ['TEAMID.com.morafinance.app'],
              components: [
                {
                  '/': '/',
                  comment: 'Test configuration'
                }
              ]
            }
          ]
        }
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(validConfig, null, 2));
      const loadedConfig = aasaConfig.loadConfig();

      expect(loadedConfig).toEqual(validConfig);
    });

    test('should return default configuration when file does not exist', () => {
      const loadedConfig = aasaConfig.loadConfig();
      
      expect(loadedConfig).toEqual(aasaConfig.defaultConfig);
      expect(fs.existsSync(testConfigPath)).toBe(true); // Should create default file
    });

    test('should return default configuration when file is invalid JSON', () => {
      fs.writeFileSync(testConfigPath, 'invalid json content');
      const loadedConfig = aasaConfig.loadConfig();

      expect(loadedConfig).toEqual(aasaConfig.defaultConfig);
    });

    test('should return default configuration when validation fails', () => {
      const invalidConfig = { invalid: 'config' };
      fs.writeFileSync(testConfigPath, JSON.stringify(invalidConfig));
      const loadedConfig = aasaConfig.loadConfig();

      expect(loadedConfig).toEqual(aasaConfig.defaultConfig);
    });
  });

  describe('Default Configuration Creation', () => {
    test('should create default configuration file', () => {
      aasaConfig.createDefaultConfig();
      
      expect(fs.existsSync(testConfigPath)).toBe(true);
      
      const fileContent = fs.readFileSync(testConfigPath, 'utf8');
      const parsedConfig = JSON.parse(fileContent);
      
      expect(parsedConfig).toEqual(aasaConfig.defaultConfig);
    });
  });
});

describe('AASA Endpoint Tests', () => {
  test('should serve AASA file with correct headers', async () => {
    const response = await request(app)
      .get('/.well-known/apple-app-site-association')
      .expect(200);

    // Check headers
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers['pragma']).toBe('no-cache');
    expect(response.headers['expires']).toBe('0');

    // Check response structure
    expect(response.body).toHaveProperty('applinks');
    expect(response.body.applinks).toHaveProperty('details');
    expect(Array.isArray(response.body.applinks.details)).toBe(true);
  });

  test('should serve valid AASA JSON structure', async () => {
    const response = await request(app)
      .get('/.well-known/apple-app-site-association')
      .expect(200);

    const aasaData = response.body;

    // Validate structure
    expect(aasaData.applinks.details.length).toBeGreaterThan(0);
    
    const firstDetail = aasaData.applinks.details[0];
    expect(Array.isArray(firstDetail.appIDs)).toBe(true);
    expect(firstDetail.appIDs.length).toBeGreaterThan(0);
    expect(Array.isArray(firstDetail.components)).toBe(true);
  });

  test('should handle errors gracefully', async () => {
    // Mock loadConfig to throw an error
    const originalLoadConfig = aasaConfig.loadConfig;
    aasaConfig.loadConfig = jest.fn(() => {
      throw new Error('Test error');
    });

    const response = await request(app)
      .get('/.well-known/apple-app-site-association')
      .expect(500);

    expect(response.body).toHaveProperty('error');

    // Restore original method
    aasaConfig.loadConfig = originalLoadConfig;
  });
});

describe('Integration Tests', () => {
  test('should validate app ID format in loaded configuration', () => {
    const config = aasaConfig.loadConfig();
    
    config.applinks.details.forEach(detail => {
      detail.appIDs.forEach(appID => {
        expect(typeof appID).toBe('string');
        expect(appID).toMatch(/^[A-Z0-9]+\.[a-zA-Z0-9.]+$/); // Basic app ID format
      });
    });
  });

  test('should have components array for each detail', () => {
    const config = aasaConfig.loadConfig();
    
    config.applinks.details.forEach(detail => {
      expect(Array.isArray(detail.components)).toBe(true);
    });
  });
});