# Mora Shortlink - Firebase Dynamic Links Alternative

A complete Firebase Dynamic Links alternative built for `link.morafinance.com` with all the essential features for URL shortening, device detection, social media previews, and analytics.

## Features

- **URL Shortening**: Create short links with custom or auto-generated aliases
- **Device Detection**: Automatic iOS/Android/Desktop detection for platform-specific routing
- **Deep Linking**: Support for mobile app deep links with fallback URLs
- **Social Media Previews**: Custom meta tags for Facebook, Twitter, WhatsApp, LinkedIn
- **Analytics**: Comprehensive click tracking and visitor analytics
- **Dashboard**: Web-based interface for link management
- **API**: RESTful API for integration with other services

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Start the Server**
```bash
npm start
# or for development
npm run dev
```

3. **Access the Dashboard**
Open http://localhost:3000 in your browser

## API Usage

### Create a Short Link

```bash
curl -X POST http://localhost:3000/api/create \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://morafinance.com/products",
    "title": "Mora Finance Products",
    "description": "Discover our Islamic banking products",
    "imageUrl": "https://morafinance.com/images/products.jpg",
    "iosUrl": "moraapp://products",
    "androidUrl": "moraapp://products",
    "customAlias": "products"
  }'
```

Response:
```json
{
  "shortUrl": "https://link.morafinance.com/products",
  "alias": "products",
  "originalUrl": "https://morafinance.com/products",
  "createdAt": "2025-01-11T10:30:00.000Z"
}
```

### Get Link Analytics

```bash
curl http://localhost:3000/api/analytics/products
```

### Get All Links

```bash
curl http://localhost:3000/api/links
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database file path (default: ./mora_shortlink.db)

### Domain Setup

1. Point `link.morafinance.com` to your server
2. Update the domain in `server.js` and `public/index.html`
3. Set up SSL certificate for HTTPS

## How It Works

### Link Creation
1. User submits a URL with optional metadata
2. System generates a unique alias (or uses custom alias)
3. Link data is stored in SQLite database
4. Short URL is returned: `https://link.morafinance.com/{alias}`

### Link Resolution
1. User clicks short link
2. Server detects device/browser from User-Agent
3. Analytics data is recorded (IP, referrer, device info)
4. User is redirected based on device:
   - iOS: Redirects to iOS app URL if specified
   - Android: Redirects to Android app URL if specified
   - Desktop: Redirects to desktop URL or original URL
   - Social crawlers: Serves HTML with meta tags

### Social Media Previews
When social media platforms crawl the link:
1. Server detects crawler bot
2. Returns HTML with Open Graph and Twitter Card meta tags
3. Crawler extracts title, description, and image
4. User sees rich preview in social media feed

## Database Schema

### Links Table
- `id`: Unique identifier
- `alias`: Short URL alias
- `original_url`: Target URL
- `title`, `description`, `image_url`: Social media metadata
- `ios_url`, `android_url`, `desktop_url`: Platform-specific URLs
- `click_count`: Total clicks
- `created_at`: Creation timestamp

### Clicks Table
- `id`: Unique identifier
- `alias`: Reference to links table
- `ip`, `user_agent`, `referer`: Request metadata
- `browser`, `os`, `device_type`: Parsed device info
- `timestamp`: Click timestamp

## Docker Deployment

### Quick Start with Docker

1. **Development Mode**
```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

2. **Production Mode**
```bash
# Generate SSL certificates (development)
./scripts/generate-ssl.sh

# Or setup Let's Encrypt (production)
./scripts/setup-letsencrypt.sh

# Deploy to production
./scripts/deploy.sh deploy
```

### Docker Architecture

The application uses a multi-container setup:

- **mora-shortlink**: Node.js application server
- **nginx**: Reverse proxy with SSL termination and rate limiting

### Deployment Scripts

**`./scripts/deploy.sh`** - Main deployment script
```bash
./scripts/deploy.sh deploy    # Full deployment
./scripts/deploy.sh start     # Start services
./scripts/deploy.sh stop      # Stop services
./scripts/deploy.sh restart   # Restart services
./scripts/deploy.sh logs      # View logs
./scripts/deploy.sh status    # Show status
./scripts/deploy.sh backup    # Backup database
```

**`./scripts/generate-ssl.sh`** - Generate self-signed certificates for development

**`./scripts/setup-letsencrypt.sh`** - Setup Let's Encrypt SSL for production

### Production Deployment

1. **Server Setup**
```bash
# Clone the repository
git clone <repo-url> mora-shortlink
cd mora-shortlink

# Set up SSL certificates
./scripts/setup-letsencrypt.sh

# Deploy the application
./scripts/deploy.sh deploy
```

2. **Environment Configuration**

Create `.env` file for production:
```bash
NODE_ENV=production
PORT=3000
DB_PATH=/app/data/mora_shortlink.db
TRUST_PROXY=1
```

3. **DNS Configuration**
Point `link.morafinance.com` to your server IP address.

### Docker Compose Files

- **`docker-compose.yml`**: Development setup with direct port access
- **`docker-compose.prod.yml`**: Production setup with nginx proxy

### Volume Persistence

- **Database**: `./data` → `/app/data` (SQLite database files)
- **Logs**: `./logs` → `/app/logs` (Application logs)
- **SSL**: `./nginx/ssl` → `/etc/nginx/ssl` (SSL certificates)

### Monitoring & Maintenance

**Health Checks**
```bash
curl https://link.morafinance.com/health
```

**View Container Stats**
```bash
docker-compose -f docker-compose.prod.yml top
```

**Database Backup**
```bash
./scripts/deploy.sh backup
```

**Certificate Renewal**
```bash
./scripts/renew-ssl.sh
```

### Nginx Configuration

The nginx configuration includes:
- SSL termination with modern security headers
- Rate limiting (10 req/s for API, 5 req/s for redirects)
- Gzip compression
- Static file caching
- Security headers (HSTS, XSS protection, etc.)

### Scaling

To scale the application:

1. **Horizontal Scaling**
```yaml
# In docker-compose.prod.yml
services:
  mora-shortlink:
    deploy:
      replicas: 3
```

2. **Load Balancing**
Update nginx upstream configuration to include multiple backend servers.

3. **Database Scaling**
Consider migrating from SQLite to PostgreSQL for better concurrent access:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mora_shortlink
      POSTGRES_USER: mora
      POSTGRES_PASSWORD: secure_password
```

## Security Considerations

- Input validation and sanitization
- Rate limiting for API endpoints
- HTTPS enforcement
- Regular database backups
- Monitor for malicious URLs
- Implement URL blacklisting if needed

## Analytics Features

- Click tracking by time, location, device
- Browser and OS statistics
- Referrer analysis (Facebook, Twitter, etc.)
- Unique visitor counting
- Top performing links
- Export capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and support, please create an issue in the GitHub repository.