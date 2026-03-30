#!/bin/bash

set -e

echo "🚀 tokenarena Quick Start"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env

    # Generate a secure secret
    SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|your-secret-key-here|$SECRET|g" .env
    else
        sed -i "s|your-secret-key-here|$SECRET|g" .env
    fi
    echo "✅ Generated BETTER_AUTH_SECRET"
    echo ""
    echo "⚠️  Please edit .env to configure:"
    echo "   - BETTER_AUTH_URL: Your public URL (default: http://localhost:3000)"
    echo "   - DATABASE_URL: Your database connection (for docker compose use host: db)"
    echo "   - AUTH_MODE: self-hosted or production"
    echo "   - OAuth provider credentials (only if AUTH_MODE=production)"
    echo ""
fi

if grep -q "postgresql://postgres:postgres@localhost:5432/tokens_burned" .env; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|postgresql://postgres:postgres@localhost:5432/tokens_burned|postgresql://postgres:postgres@db:5432/tokens_burned|g" .env
    else
        sed -i "s|postgresql://postgres:postgres@localhost:5432/tokens_burned|postgresql://postgres:postgres@db:5432/tokens_burned|g" .env
    fi
    echo "鉁?Updated DATABASE_URL to use the docker-compose db service"
    echo ""
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "🐳 Starting services with Docker Compose..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if web is healthy
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Web service is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Web service might still be starting. Check logs: docker compose logs web"
    fi
    sleep 2
done

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📍 Open your browser: http://localhost:3000"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker compose logs -f"
echo "   Stop:         docker compose down"
echo "   Update:       docker compose pull && docker compose up -d"
echo ""
