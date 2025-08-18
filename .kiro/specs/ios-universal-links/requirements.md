# Requirements Document

## Introduction

This feature adds Apple App Site Association (AASA) support to the Mora Shortlink service to enable iOS Universal Links functionality. Universal Links allow iOS apps to handle web links directly, providing a seamless user experience by opening the app instead of the web browser when appropriate. This implementation will serve the required AASA file and configure the system to properly support iOS Universal Links for the Mora Finance mobile application.

## Requirements

### Requirement 1

**User Story:** As an iOS app developer, I want the shortlink service to serve a valid Apple App Site Association file, so that iOS can verify domain ownership and enable Universal Links for the Mora Finance app.

#### Acceptance Criteria

1. WHEN a request is made to `/.well-known/apple-app-site-association` THEN the system SHALL serve a valid JSON AASA file with appropriate headers
2. WHEN the AASA file is requested THEN the system SHALL return the file with `Content-Type: application/json` header
3. WHEN the AASA file is served THEN it SHALL include the correct app identifier and supported paths
4. WHEN the AASA file is accessed THEN it SHALL be served without requiring authentication

### Requirement 2

**User Story:** As a mobile app user, I want shortlinks to open directly in the Mora Finance iOS app when installed, so that I have a seamless experience without being redirected through Safari.

#### Acceptance Criteria

1. WHEN an iOS device with the Mora Finance app installed accesses a shortlink THEN the system SHALL allow iOS to handle the Universal Link appropriately
2. WHEN the AASA file is configured THEN it SHALL specify which URL patterns should be handled by the app
3. WHEN a shortlink matches the configured patterns THEN iOS SHALL be able to open the link directly in the app
4. IF the app is not installed THEN the link SHALL fallback to normal web behavior

### Requirement 3

**User Story:** As a system administrator, I want the AASA file to be configurable and maintainable, so that I can update app identifiers and supported paths without code changes.

#### Acceptance Criteria

1. WHEN the AASA configuration needs to be updated THEN it SHALL be possible to modify the file without redeploying the application
2. WHEN the system starts THEN it SHALL validate the AASA file format and log any configuration errors
3. WHEN the AASA file is invalid THEN the system SHALL serve a default valid configuration
4. WHEN multiple app identifiers need to be supported THEN the AASA file SHALL accommodate multiple apps

### Requirement 4

**User Story:** As a developer, I want proper nginx configuration for the AASA file, so that it's served with correct headers and caching policies.

#### Acceptance Criteria

1. WHEN nginx serves the AASA file THEN it SHALL set the correct `Content-Type: application/json` header
2. WHEN the AASA file is requested THEN nginx SHALL serve it without caching to ensure updates are immediately available
3. WHEN the `.well-known` path is accessed THEN nginx SHALL handle it with appropriate security headers
4. WHEN the AASA file is served THEN it SHALL be accessible via both HTTP and HTTPS protocols for development flexibility