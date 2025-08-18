# Mora Shortlink Service

Firebase Dynamic Links alternative for morafinance.com with iOS Universal Links support.

## Features

- **URL Shortening**: Create short, branded links for any URL
- **Platform-specific Routing**: Different URLs for iOS, Android, and desktop
- **Analytics**: Track clicks, user agents, and referrers
- **Social Media Optimization**: Rich preview support with custom meta tags
- **iOS Universal Links**: Native app integration via Apple App Site Association (AASA)
- **Custom Aliases**: Create memorable short links
- **Dashboard**: Web interface for link management and analytics

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- SSL certificate for production deployment

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd mora-shortlink
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access the dashboard:**
   - Local: http://localhost:3000
   - Production: https://link.staging.morafinance.com

### Configuration

#### Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=production
```

#### iOS Universal Links Setup

For iOS Universal Links support, configure the Apple App Site Association (AASA) file:

1. **Edit the AASA configuration:**
   ```bash
   nano config/apple-app-site-association.json
   ```

2. **Update with your Apple Team ID:**
   ```json
   {
     "applinks": {
       "details": [
         {
           "appIDs": ["YOUR_TEAM_ID.com.morafinance.app"],
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

3. **Restart the service:**
   ```bash
   docker-compose restart mora-shortlink
   ```

For detailed AASA setup instructions, see [docs/AASA_SETUP.md](docs/AASA_SETUP.md).

## API Documentation

### Create Short Link

```bash
POST /api/create
Content-Type: application/json

{
  "url": "https://example.com",
  "customAlias": "my-link",
  "title": "Page Title",
  "description": "Page description for social media",
  "imageUrl": "https://example.com/image.jpg",
  "iosUrl": "myapp://page",
  "androidUrl": "myapp://page",
  "desktopUrl": "https://example.com/desktop"
}
```

### Get Link Analytics

```bash
GET /api/analytics/:alias
```

### List All Links

```bash
GET /api/links
```

## iOS Universal Links

The service automatically serves an Apple App Site Association (AASA) file at:
```
https://link.staging.morafinance.com/.well-known/apple-app-site-association
```

### iOS App Integration

1. **Enable Associated Domains in Xcode:**
   - Add `applinks:link.staging.morafinance.com` to Associated Domains

2. **Handle Universal Links in your app:**
   ```swift
   func application(_ application: UIApplication, 
                   continue userActivity: NSUserActivity, 
                   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
       
       guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
             let url = userActivity.webpageURL else {
           return false
       }
       
       // Handle the Universal Link
       handleUniversalLink(url)
       return true
   }
   ```

### Testing Universal Links

1. **Validate AASA file:**
   - Use Apple's validator: https://search.developer.apple.com/appsearch-validation-tool/
   - Enter domain: `link.staging.morafinance.com`

2. **Test on device:**
   - Install your iOS app
   - Create a test shortlink
   - Tap the link in Messages or Safari - it should open your app

## Development

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

### Testing

The project includes comprehensive tests for AASA functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/aasa.test.js
```

### Project Structure

```
mora-shortlink/
├── config/                          # Configuration files
│   └── apple-app-site-association.json  # AASA configuration
├── docs/                           # Documentation
│   └── AASA_SETUP.md              # Universal Links setup guide
├── nginx/                         # Nginx configuration
├── public/                        # Static web files
├── services/                      # Business logic services
├── tests/                         # Test files
├── utils/                         # Utility functions
│   ├── aasaConfig.js             # AASA configuration management
│   └── helpers.js                # General helpers
├── database.js                    # Database management
├── server.js                      # Express server
└── docker-compose.yml            # Docker configuration
```

## Deployment

### Production Deployment

1. **Configure SSL certificates:**
   ```bash
   # Place certificates in nginx/ssl/
   cp your-cert.crt nginx/ssl/mora-shortlink.crt
   cp your-key.key nginx/ssl/mora-shortlink.key
   ```

2. **Update nginx configuration:**
   - Edit `nginx/conf.d/mora-shortlink.conf`
   - Update server_name to your domain

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Health Checks

The service provides health check endpoints:

- **Application health:** `GET /health`
- **AASA file:** `GET /.well-known/apple-app-site-association`

### Monitoring

Monitor the service with:

```bash
# View logs
docker-compose logs -f mora-shortlink

# Check AASA endpoint
curl -I https://link.staging.morafinance.com/.well-known/apple-app-site-association

# Monitor nginx access logs
docker-compose logs -f nginx
```

## Troubleshooting

### Common Issues

1. **AASA file not accessible:**
   - Check nginx configuration
   - Verify SSL certificate
   - Restart services: `docker-compose restart`

2. **Universal Links not working:**
   - Validate AASA file with Apple's tool
   - Check iOS app configuration
   - Ensure HTTPS is working

3. **Database issues:**
   - Check SQLite file permissions
   - Review application logs

### Support

For detailed troubleshooting guides, see:
- [AASA Setup Guide](docs/AASA_SETUP.md)
- Application logs: `docker-compose logs mora-shortlink`

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Security

- All URLs are validated before storage
- Rate limiting is applied to prevent abuse
- HTTPS is required for production Universal Links
- Configuration files are validated on startup