#!/bin/bash

# Mora Shortlink Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_NAME="mora-shortlink"
BACKUP_DIR="./backups"
DATA_DIR="./data"
SSL_DIR="./nginx/ssl"

echo -e "${BLUE}🚀 Mora Shortlink Deployment Script${NC}"
echo "=================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    echo "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_status "Dependencies checked"
}

# Create necessary directories
create_directories() {
    echo "Creating directories..."
    
    mkdir -p $BACKUP_DIR
    mkdir -p $DATA_DIR
    mkdir -p $SSL_DIR
    mkdir -p logs
    
    print_status "Directories created"
}

# Backup existing database
backup_database() {
    if [ -f "$DATA_DIR/mora_shortlink.db" ]; then
        echo "Backing up existing database..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        cp "$DATA_DIR/mora_shortlink.db" "$BACKUP_DIR/mora_shortlink_$timestamp.db"
        print_status "Database backed up to $BACKUP_DIR/mora_shortlink_$timestamp.db"
    else
        print_warning "No existing database found to backup"
    fi
}

# Check SSL certificates
check_ssl() {
    if [ ! -f "$SSL_DIR/mora-shortlink.crt" ] || [ ! -f "$SSL_DIR/mora-shortlink.key" ]; then
        print_warning "SSL certificates not found in $SSL_DIR"
        echo "Please ensure you have:"
        echo "  - $SSL_DIR/mora-shortlink.crt"
        echo "  - $SSL_DIR/mora-shortlink.key"
        echo ""
        echo "For development, you can generate self-signed certificates:"
        echo "  ./scripts/generate-ssl.sh"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_status "SSL certificates found"
    fi
}

# Pull latest images
pull_images() {
    echo "Pulling latest images..."
    docker-compose -f $COMPOSE_FILE pull
    print_status "Images pulled"
}

# Build application image
build_image() {
    echo "Building application image..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    print_status "Application image built"
}

# Stop existing services
stop_services() {
    echo "Stopping existing services..."
    docker-compose -f $COMPOSE_FILE down
    print_status "Services stopped"
}

# Start services
start_services() {
    echo "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d
    print_status "Services started"
}

# Wait for services to be healthy
wait_for_health() {
    echo "Waiting for services to be healthy..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE ps | grep -q "Up (healthy)"; then
            print_status "Services are healthy"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for services..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Services failed to become healthy within timeout"
    docker-compose -f $COMPOSE_FILE logs
    exit 1
}

# Run post-deployment tests
run_tests() {
    echo "Running post-deployment tests..."
    
    # Test health endpoint
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi
    
    # Test API endpoint
    if curl -f -X POST http://localhost/api/create \
        -H "Content-Type: application/json" \
        -d '{"url": "https://morafinance.com/test"}' > /dev/null 2>&1; then
        print_status "API test passed"
    else
        print_warning "API test failed (might be rate limited or need authentication)"
    fi
}

# Show deployment status
show_status() {
    echo ""
    echo "Deployment Status:"
    echo "=================="
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    echo "Service URLs:"
    echo "============="
    echo "🌐 Application: https://link.staging.morafinance.com"
    echo "📊 Health Check: https://link.staging.morafinance.com/health"
    echo "🔧 API: https://link.staging.morafinance.com/api"
    
    echo ""
    echo "Useful Commands:"
    echo "==============="
    echo "📋 View logs: docker-compose -f $COMPOSE_FILE logs -f"
    echo "🔄 Restart: docker-compose -f $COMPOSE_FILE restart"
    echo "⬇️  Stop: docker-compose -f $COMPOSE_FILE down"
    echo "📈 Stats: docker-compose -f $COMPOSE_FILE top"
}

# Main deployment flow
main() {
    case "$1" in
        "build")
            check_dependencies
            build_image
            ;;
        "deploy")
            check_dependencies
            create_directories
            backup_database
            check_ssl
            stop_services
            build_image
            start_services
            wait_for_health
            run_tests
            show_status
            ;;
        "start")
            docker-compose -f $COMPOSE_FILE up -d
            print_status "Services started"
            ;;
        "stop")
            docker-compose -f $COMPOSE_FILE down
            print_status "Services stopped"
            ;;
        "restart")
            docker-compose -f $COMPOSE_FILE restart
            print_status "Services restarted"
            ;;
        "logs")
            docker-compose -f $COMPOSE_FILE logs -f
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_database
            ;;
        *)
            echo "Usage: $0 {build|deploy|start|stop|restart|logs|status|backup}"
            echo ""
            echo "Commands:"
            echo "  build   - Build the Docker image"
            echo "  deploy  - Full deployment (backup, build, start, test)"
            echo "  start   - Start services"
            echo "  stop    - Stop services"
            echo "  restart - Restart services"
            echo "  logs    - View logs"
            echo "  status  - Show deployment status"
            echo "  backup  - Backup database"
            exit 1
            ;;
    esac
}

main "$@"