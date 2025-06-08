#!/bin/bash

# Event Staff App Deployment Script
# Führt vollständige Installation und Setup auf dem Server durch

set -e  # Exit bei Fehlern

echo "🚀 Starting Event Staff App Deployment..."

# Variablen
APP_NAME="event-staff"
APP_DIR="/var/www/$APP_NAME"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="event_staff_db"
DB_USER="event_staff_user"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. System Updates und Dependencies
echo -e "${YELLOW}📦 Installing system dependencies...${NC}"
sudo apt update
sudo apt install -y curl nginx mysql-server nodejs npm git

# Node.js 18+ installieren (falls nicht vorhanden)
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PM2 global installieren
sudo npm install -g pm2
print_status "System dependencies installed"

# 2. App Verzeichnis erstellen
echo -e "${YELLOW}📁 Setting up application directories...${NC}"
sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/logs
sudo mkdir -p $BACKEND_DIR/uploads/profiles
sudo chown -R $USER:$USER $APP_DIR
print_status "Application directories created"

# 3. Datenbank Setup
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'Schwimmen1997!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# Schema importieren (falls schema.sql vorhanden)
if [ -f "database/schema.sql" ]; then
    sudo mysql $DB_NAME < database/schema.sql
    print_status "Database schema imported"
else
    print_warning "No schema.sql found - please import manually"
fi

# 4. Backend Setup
echo -e "${YELLOW}⚙️  Setting up backend...${NC}"
cp -r backend/* $BACKEND_DIR/
cd $BACKEND_DIR

# .env für Produktion erstellen
cat > .env << EOF
# Production Environment
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=Schwimmen1997!
DB_NAME=$DB_NAME

# JWT Secret - WICHTIG: Ändern Sie dies!
JWT_SECRET=$(openssl rand -base64 32)

# SendGrid Email (Optional - falls konfiguriert)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=info@popupfest.de
SENDGRID_FROM_NAME=Event Staff App

# Upload Settings
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Frontend URL
FRONTEND_URL=https://popupfest.de

# Kiosk Token
KIOSK_TOKEN=$(openssl rand -base64 24)
EOF

# Dependencies installieren
npm install --production
print_status "Backend setup completed"

# 5. Frontend Setup
echo -e "${YELLOW}🎨 Setting up frontend...${NC}"
sudo mkdir -p $FRONTEND_DIR
sudo cp -r frontend/build/* $FRONTEND_DIR/
sudo chown -R www-data:www-data $FRONTEND_DIR
print_status "Frontend setup completed"

# 6. PM2 Setup
echo -e "${YELLOW}🔧 Setting up PM2...${NC}"
cd $BACKEND_DIR

# PM2 Ecosystem File erstellen
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '../logs/err.log',
    out_file: '../logs/out.log',
    log_file: '../logs/combined.log',
    time: true
  }]
};
EOF

# PM2 starten
pm2 start ecosystem.config.js
pm2 save
pm2 startup
print_status "PM2 configured and started"

# 7. Nginx Setup
echo -e "${YELLOW}🌐 Setting up Nginx...${NC}"
sudo tee $NGINX_CONF > /dev/null << EOF
server {
    listen 80;
    server_name popupfest.de www.popupfest.de;
    
    client_max_body_size 10M;
    
    root $FRONTEND_DIR;
    index index.html;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Upload Files
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # React App
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Nginx Site aktivieren
sudo ln -sf $NGINX_CONF $NGINX_ENABLED
sudo nginx -t
sudo systemctl reload nginx
print_status "Nginx configured and reloaded"

# 8. Berechtigungen setzen
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
sudo chown -R $USER:$USER $BACKEND_DIR
sudo chmod -R 755 $BACKEND_DIR
sudo chmod -R 777 $BACKEND_DIR/uploads
print_status "Permissions set"

# 9. SSL Setup (optional)
echo -e "${YELLOW}🔒 SSL Setup...${NC}"
if command -v certbot &> /dev/null; then
    print_warning "Certbot found. Run manually: sudo certbot --nginx -d popupfest.de -d www.popupfest.de"
else
    print_warning "Install certbot for SSL: sudo apt install certbot python3-certbot-nginx"
fi

# 10. Firewall Setup
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
print_status "Firewall configured"

# 11. Systemd Service (Backup zu PM2)
echo -e "${YELLOW}⚙️  Creating systemd service...${NC}"
sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null << EOF
[Unit]
Description=Event Staff App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BACKEND_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME
print_status "Systemd service created"

# 12. Monitoring Setup
echo -e "${YELLOW}📊 Setting up monitoring...${NC}"
# PM2 Web Interface (optional)
# pm2 install pm2-server-monit

# Log Rotation
sudo tee /etc/logrotate.d/$APP_NAME > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 $USER $USER
}
EOF
print_status "Monitoring and logging configured"

# 13. Status Check
echo -e "${YELLOW}🔍 Checking services...${NC}"
echo "PM2 Status:"
pm2 status

echo -e "\nNginx Status:"
sudo systemctl status nginx --no-pager -l

echo -e "\nApp Status Check:"
sleep 5
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "Backend is running"
else
    print_error "Backend health check failed"
fi

# 14. Final Information
echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo -e "\n📋 Next Steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL: sudo certbot --nginx -d popupfest.de -d www.popupfest.de"
echo "3. Create your first admin user via database or API"
echo "4. Configure email settings in backend/.env"
echo "5. Test the application: https://popupfest.de"
echo ""
echo "📁 Important paths:"
echo "   App Directory: $APP_DIR"
echo "   Backend: $BACKEND_DIR"
echo "   Frontend: $FRONTEND_DIR"
echo "   Logs: $APP_DIR/logs/"
echo "   Nginx Config: $NGINX_CONF"
echo ""
echo "🔧 Useful commands:"
echo "   PM2 Status: pm2 status"
echo "   PM2 Logs: pm2 logs"
echo "   PM2 Restart: pm2 restart $APP_NAME-backend"
echo "   Nginx Reload: sudo systemctl reload nginx"
echo "   App Logs: tail -f $APP_DIR/logs/combined.log"
echo ""
print_status "Event Staff App deployment completed successfully!"