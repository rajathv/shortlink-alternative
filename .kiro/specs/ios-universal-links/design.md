# Design Document

## Overview

This design implements Apple App Site Association (AASA) support for the Mora Shortlink service to enable iOS Universal Links. The solution adds a new endpoint to serve the AASA file, configures nginx to handle the `.well-known` path properly, and provides a configurable system for managing app identifiers and supported URL patterns.

## Architecture

The AASA implementation follows a simple architecture pattern:

1. **Static File Serving**: The AASA file is served as a static JSON file from the Express application
2. **Configuration Management**: AASA configuration is stored in a JSON file that can be updated independently
3. **Nginx Integration**: Nginx is configured to properly route and serve the AASA file with correct headers
4. **Fallback Handling**: The system provides fallback behavior for invalid configurations

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   iOS Device    │───▶│      Nginx       │───▶│  Express App    │
│                 │    │                  │    │                 │
│ Requests AASA   │    │ Routes /.well-   │    │ Serves AASA     │
│ file for        │    │ known/ to app    │    │ JSON file       │
│ Universal Links │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### AASA Configuration File
- **Location**: `config/apple-app-site-association.json`
- **Format**: Standard Apple App Site Association JSON format
- **Purpose**: Defines which apps can handle Universal Links and which paths are supported

### Express Route Handler
- **Endpoint**: `/.well-known/apple-app-site-association`
- **Method**: GET
- **Response**: JSON content with appropriate headers
- **Caching**: No caching to ensure updates are immediately available

### Nginx Configuration
- **Path Handling**: Routes `.well-known` requests to the Express application
- **Headers**: Sets correct Content-Type and security headers
- **Caching**: Disabled for AASA file to ensure freshness

### Configuration Validator
- **Purpose**: Validates AASA file format on application startup
- **Fallback**: Provides default configuration if validation fails
- **Logging**: Reports configuration errors for debugging

## Data Models

### AASA File Structure
```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAMID.com.morafinance.app"],
        "components": [
          {
            "/": "/",
            "comment": "Matches all shortlinks"
          }
        ]
      }
    ]
  }
}
```

### Configuration Schema
- **applinks**: Root object containing Universal Links configuration
- **details**: Array of app configurations
- **appIDs**: Array of app identifiers (Team ID + Bundle ID)
- **components**: Array of URL pattern matching rules

## Error Handling

### Invalid Configuration
- **Detection**: JSON parsing errors or schema validation failures
- **Response**: Log error and serve default valid configuration
- **Recovery**: Allow runtime configuration updates without restart

### Missing Configuration File
- **Detection**: File not found during application startup
- **Response**: Create default configuration file automatically
- **Logging**: Warn about missing configuration and default creation

### Network Errors
- **Nginx Timeout**: Standard proxy timeout handling
- **Express Errors**: Return 500 status with error logging
- **Fallback**: Ensure AASA endpoint always returns valid JSON

## Testing Strategy

### Unit Tests
- **AASA Route Handler**: Test endpoint returns correct JSON and headers
- **Configuration Validator**: Test validation logic with valid/invalid configurations
- **File Loading**: Test configuration file reading and parsing

### Integration Tests
- **End-to-End AASA**: Test complete request flow from nginx to Express
- **Header Validation**: Verify correct Content-Type and security headers
- **Configuration Updates**: Test runtime configuration changes

### Manual Testing
- **iOS Validation**: Use Apple's AASA validator tool
- **Universal Links**: Test with actual iOS device and Mora Finance app
- **Fallback Behavior**: Test behavior when app is not installed

### Performance Tests
- **Response Time**: Ensure AASA file serves quickly (< 100ms)
- **Concurrent Requests**: Test multiple simultaneous AASA requests
- **Memory Usage**: Verify configuration loading doesn't impact memory

## Security Considerations

### File Access
- **Read-Only**: AASA configuration file should be read-only in production
- **Path Traversal**: Ensure no directory traversal vulnerabilities in file loading
- **Permissions**: Restrict file system permissions appropriately

### Content Validation
- **JSON Schema**: Validate AASA file against Apple's schema requirements
- **App ID Format**: Ensure app identifiers follow Apple's format requirements
- **Path Patterns**: Validate URL patterns for security and correctness

### Headers and Caching
- **Content-Type**: Always serve with correct JSON content type
- **No Caching**: Prevent caching to avoid stale configurations
- **Security Headers**: Include appropriate security headers via nginx