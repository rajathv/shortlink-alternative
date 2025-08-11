#!/bin/bash

# Setup Let's Encrypt SSL certificates for production
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="link.morafinance.com"
EMAIL="admin@morafinance.com"
SSL_DIR="./nginx/ssl"
WEBROOT_DIR="./nginx/webroot"

echo -e "${BLUE}🔐 Let's Encrypt SSL Setup for Mora Shortlink${NC}"
echo "=============================================="

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${RED}✗${NC} Certbot is not installed"
    echo "Please install certbot first:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    echo "  macOS: brew install certbot"
    exit 1
fi

# Create necessary directories
mkdir -p $SSL_DIR
mkdir -p $WEBROOT_DIR

echo "Setting up Let's Encrypt SSL certificate for: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Check if running in production mode
read -p "Is this a production server with DNS pointing to this machine? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠${NC} This script should only be run on a production server"
    echo "with DNS properly configured to point to this machine."
    echo ""
    echo "For development, use: ./scripts/generate-ssl.sh"
    exit 1
fi

# Stop nginx if running to avoid port conflicts
if docker-compose -f docker-compose.prod.yml ps nginx | grep -q "Up"; then
    echo "Stopping nginx temporarily..."
    docker-compose -f docker-compose.prod.yml stop nginx
fi

# Generate certificate using standalone mode
echo "Generating Let's Encrypt certificate..."
certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN

# Copy certificates to nginx SSL directory
echo "Copying certificates..."
cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/mora-shortlink.crt"
cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/mora-shortlink.key"

# Set appropriate permissions
chmod 644 "$SSL_DIR/mora-shortlink.crt"
chmod 600 "$SSL_DIR/mora-shortlink.key"

echo -e "${GREEN}✓${NC} SSL certificates installed successfully!"

# Create renewal script
cat > "./scripts/renew-ssl.sh" << 'EOF'
#!/bin/bash
# Auto-renewal script for Let's Encrypt certificates

set -e

DOMAIN="link.morafinance.com"
SSL_DIR="./nginx/ssl"

echo "Checking certificate renewal..."

# Renew certificate if needed
certbot renew --quiet

# Copy renewed certificates
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/mora-shortlink.crt"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/mora-shortlink.key"
    
    # Reload nginx
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "✓ Certificate renewed and nginx reloaded"
else
    echo "No certificate renewal needed"
fi
EOF

chmod +x "./scripts/renew-ssl.sh"

echo -e "${GREEN}✓${NC} Renewal script created: ./scripts/renew-ssl.sh"

# Create systemd timer for auto-renewal (optional)
echo ""
echo "To set up automatic renewal, add this to your crontab (crontab -e):"
echo "0 12 * * * /path/to/mora-shortlink/scripts/renew-ssl.sh"

# Start nginx again
echo "Starting nginx with SSL..."
docker-compose -f docker-compose.prod.yml up -d nginx

echo ""
echo -e "${GREEN}✓${NC} SSL setup complete!"
echo "Your site should now be accessible at: https://$DOMAIN"

# Show certificate info
echo ""
echo "Certificate details:"
openssl x509 -in "$SSL_DIR/mora-shortlink.crt" -text -noout | grep -A 2 "Validity"