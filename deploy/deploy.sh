#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/smart-healthcare-assistant}"
DOMAIN="${DOMAIN:-}"
REPO_URL="${REPO_URL:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $1"; }
fail()  { echo -e "${RED}[deploy]${NC} $1"; exit 1; }

if [ "$EUID" -eq 0 ]; then
  fail "Do not run as root. Use a sudo-enabled user (e.g. 'ubuntu')."
fi

if command -v apt-get >/dev/null 2>&1; then
  DISTRO="debian"
else
  DISTRO="other"
fi

if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker..."
  if [ "$DISTRO" = "debian" ]; then
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    fail "Unsupported distro. Install Docker manually, then re-run this script."
  fi
  sudo usermod -aG docker "$USER"
  info "Docker installed. Log out and back in (or run: newgrp docker), then re-run: ./deploy.sh"
  exit 0
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "docker compose plugin is missing. Install it, then re-run this script."
fi

if [ ! -d "$APP_DIR" ]; then
  if [ -n "$REPO_URL" ]; then
    info "Cloning repository into $APP_DIR"
    sudo mkdir -p "$APP_DIR"
    sudo chown "$USER" "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR"
  else
    fail "REPO_URL is not set. Either export REPO_URL=https://github.com/you/smart-healthcare-assistant.git \
or copy the project folder into $APP_DIR yourself, then re-run."
  fi
else
  info "Repository found at $APP_DIR"
  if [ -n "$REPO_URL" ] && [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only || warn "git pull failed — continuing with existing code"
  fi
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  GENERATED_SECRET=$(openssl rand -hex 32)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$GENERATED_SECRET/" .env
  if [ -n "$DOMAIN" ]; then
    sed -i "s#^CORS_ORIGIN=.*#CORS_ORIGIN=https://$DOMAIN#" .env
  else
    sed -i "s#^CORS_ORIGIN=.*#CORS_ORIGIN=http://$(hostname -I | awk '{print $1}')#" .env
  fi
  warn ".env created — review it before going live: nano .env"
else
  info ".env already exists (keeping it)"
fi

if ! ls ai-service/models/*.joblib >/dev/null 2>&1; then
  info "AI model artifacts missing — training them now (one-off container)"
  docker run --rm \
    -v "$(pwd)/ai-service:/app" \
    -w /app \
    python:3.10-slim \
    bash -c "pip install -q scikit-learn==1.6.0 pandas==2.2.3 joblib==1.4.2 && python training/generate_dataset.py && python -m training.train"
fi

deploy() {
  export DOMAIN
  docker compose "${COMPOSE_FILES[@]}" "$@"
}

if [ -n "$DOMAIN" ]; then
  info "Deploying with HTTPS via Caddy for domain: $DOMAIN"
  COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.https.yml)
else
  info "Deploying on HTTP (no domain set). Use DOMAIN=example.com ./deploy.sh for HTTPS."
  COMPOSE_FILES=()
fi

MONGO_URI_VALUE=$(grep -E '^MONGO_URI=' .env | tail -1 | cut -d= -f2-)
if [ -n "$MONGO_URI_VALUE" ]; then
  info "External MongoDB detected (MONGO_URI set in .env) — skipping the bundled mongo container."
  deploy up -d --build
else
  info "No MONGO_URI set — using the bundled MongoDB container."
  deploy --profile local-mongo up -d --build
fi

sleep 8

echo
info "Deployment finished. Checking health:"
BACKEND_HEALTH=$(curl -fsS http://localhost:5000/health || echo "unreachable")
AI_HEALTH=$(curl -fsS http://localhost:8000/health || echo "unreachable")
echo "  backend   -> $BACKEND_HEALTH"
echo "  ai-service-> $AI_HEALTH"

if [ -n "$DOMAIN" ]; then
  echo "  website   -> https://$DOMAIN"
else
  IP=$(hostname -I | awk '{print $1}')
  echo "  website   -> http://$IP:8080"
fi
echo
info "Useful commands:"
echo "  docker compose logs -f backend      (backend logs)"
echo "  docker compose logs -f ai-service   (AI logs)"
echo "  docker compose ps                   (container status)"
echo "  ./deploy.sh                         (re-deploy after pulling new code)"
