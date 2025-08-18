#!/bin/bash

# Generate self-signed SSL certificates for development
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SSL_DIR="./nginx/ssl"
DOMAIN="link.staging.morafinance.com"

echo -e "${BLUE}🔒 SSL Certificate Generator for Mora Shortlink${NC}"
echo "================================================"

# Create SSL directory if it doesn't exist
mkdir -p $SSL_DIR

# Check if certificates already exist
if [ -f "$SSL_DIR/mora-shortlink.crt" ] && [ -f "$SSL_DIR/mora-shortlink.key" ]; then
    echo -e "${YELLOW}⚠${NC} SSL certificates already exist"
    read -p "Overwrite existing certificates? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing certificates"
        exit 0
    fi
fi

echo "Generating SSL certificate for domain: $DOMAIN"

# Generate private key
openssl genrsa -out "$SSL_DIR/mora-shortlink.key" 2048

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/mora-shortlink.key" -out "$SSL_DIR/mora-shortlink.csr" -config <(
cat <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=SA
ST=Riyadh
L=Riyadh
O=Mora Finance
OU=IT Department
CN=$DOMAIN

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
)

# Generate self-signed certificate valid for 365 days
openssl x509 -req -in "$SSL_DIR/mora-shortlink.csr" -signkey "$SSL_DIR/mora-shortlink.key" -out "$SSL_DIR/mora-shortlink.crt" -days 365 -extensions v3_req -extfile <(
cat <<EOF
[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF
)

# Set appropriate permissions
chmod 600 "$SSL_DIR/mora-shortlink.key"
chmod 644 "$SSL_DIR/mora-shortlink.crt"

# Clean up CSR file
rm "$SSL_DIR/mora-shortlink.csr"

echo -e "${GREEN}✓${NC} SSL certificates generated successfully!"
echo ""
echo "Files created:"
echo "  - $SSL_DIR/mora-shortlink.key (private key)"
echo "  - $SSL_DIR/mora-shortlink.crt (certificate)"
echo ""
echo -e "${YELLOW}⚠${NC} These are self-signed certificates for development use only!"
echo "For production, use certificates from a trusted CA like Let's Encrypt."
echo ""
echo "Certificate details:"
openssl x509 -in "$SSL_DIR/mora-shortlink.crt" -text -noout | grep -A 5 "Subject:"
echo ""
echo "Valid until:"
openssl x509 -in "$SSL_DIR/mora-shortlink.crt" -enddate -noout