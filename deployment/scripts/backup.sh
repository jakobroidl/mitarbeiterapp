#!/bin/bash

# Event Staff App Backup Script
# Erstellt automatische Backups der Datenbank und wichtigen Dateien

set -e

# Konfiguration
APP_NAME="event-staff"
DB_NAME="event_staff_db"
DB_USER="event_staff_user"
DB_PASSWORD="Schwimmen1997!"
BACKUP_DIR="/var/backups/$APP_NAME"
APP_DIR="/var/www/$APP_NAME"
RETENTION_DAYS=30

# Datum für Backup-Namen
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PREFIX="${APP_NAME}_${DATE}"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🔄 Starting backup process..."

# Backup-Verzeichnis erstellen
mkdir -p $BACKUP_DIR
cd $BACKUP_DIR

# 1. Datenbank Backup
echo "📄 Creating database backup..."
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > "${BACKUP_PREFIX}_database.sql"
gzip "${BACKUP_PREFIX}_database.sql"
print_status "Database backup created: ${BACKUP_PREFIX}_database.sql.gz"

# 2. Upload-Dateien sichern
echo "📁 Backing up uploaded files..."
if [ -d "$APP_DIR/backend/uploads" ]; then
    tar -czf "${BACKUP_PREFIX}_uploads.tar.gz" -C "$APP_DIR/backend" uploads/
    print_status "Uploads backup created: ${BACKUP_PREFIX}_uploads.tar.gz"
else
    print_warning "No uploads directory found"
fi

# 3. Konfigurationsdateien sichern
echo "⚙️ Backing up configuration..."
tar -czf "${BACKUP_PREFIX}_config.tar.gz" \
    --exclude="node_modules" \
    --exclude="logs" \
    -C "$APP_DIR" \
    backend/.env \
    backend/ecosystem.config.js \
    2>/dev/null || print_warning "Some config files might be missing"

# 4. PM2 Konfiguration
echo "🔧 Backing up PM2 configuration..."
if command -v pm2 &> /dev/null; then
    pm2 save
    cp ~/.pm2/dump.pm2 "${BACKUP_PREFIX}_pm2_processes.json" 2>/dev/null || print_warning "PM2 dump not found"
fi

# 5. Nginx Konfiguration
echo "🌐 Backing up Nginx configuration..."
if [ -f "/etc/nginx/sites-available/$APP_NAME" ]; then
    cp "/etc/nginx/sites-available/$APP_NAME" "${BACKUP_PREFIX}_nginx.conf"
    print_status "Nginx config backed up"
fi

# 6. Systemd Service
echo "⚙️ Backing up systemd service..."
if [ -f "/etc/systemd/system/$APP_NAME.service" ]; then
    cp "/etc/systemd/system/$APP_NAME.service" "${BACKUP_PREFIX}_systemd.service"
    print_status "Systemd service backed up"
fi

# 7. Backup-Manifest erstellen
echo "📋 Creating backup manifest..."
cat > "${BACKUP_PREFIX}_manifest.txt" << EOF
Event Staff App Backup Manifest
Generated: $(date)
Server: $(hostname)
App Version: $(node -v)
Database: $DB_NAME

Files in this backup:
- ${BACKUP_PREFIX}_database.sql.gz (Database dump)
- ${BACKUP_PREFIX}_uploads.tar.gz (Uploaded files)
- ${BACKUP_PREFIX}_config.tar.gz (Configuration files)
- ${BACKUP_PREFIX}_pm2_processes.json (PM2 processes)
- ${BACKUP_PREFIX}_nginx.conf (Nginx configuration)
- ${BACKUP_PREFIX}_systemd.service (Systemd service)

To restore:
1. Extract uploads: tar -xzf ${BACKUP_PREFIX}_uploads.tar.gz -C /var/www/$APP_NAME/backend/
2. Restore database: gunzip -c ${BACKUP_PREFIX}_database.sql.gz | mysql -u $DB_USER -p $DB_NAME
3. Extract config: tar -xzf ${BACKUP_PREFIX}_config.tar.gz -C /var/www/$APP_NAME/
4. Copy nginx config: cp ${BACKUP_PREFIX}_nginx.conf /etc/nginx/sites-available/$APP_NAME
5. Copy systemd service: cp ${BACKUP_PREFIX}_systemd.service /etc/systemd/system/
6. Reload services: sudo systemctl daemon-reload && sudo systemctl reload nginx
EOF

# 8. Backup-Größe berechnen
TOTAL_SIZE=$(du -sh ${BACKUP_PREFIX}_* | awk '{sum += $1} END {print sum}')
print_status "Backup completed. Total size: $(du -sh ${BACKUP_PREFIX}_* | tail -n1 | awk '{print $1}')"

# 9. Alte Backups löschen (älter als RETENTION_DAYS)
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "${APP_NAME}_*" -type f -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(ls -1 ${APP_NAME}_* 2>/dev/null | wc -l)
print_status "Cleanup completed. $REMAINING_BACKUPS backup sets remaining"

# 10. Backup-Status
echo ""
echo "📊 Backup Summary:"
echo "   Date: $(date)"
echo "   Prefix: $BACKUP_PREFIX"
echo "   Location: $BACKUP_DIR"
echo "   Files created:"
ls -la ${BACKUP_PREFIX}_* 2>/dev/null | awk '{print "     " $9 " (" $5 " bytes)"}'

echo ""
print_status "Backup process completed successfully!"

# Optional: Upload zu Cloud Storage (AWS S3, etc.)
if [ "$1" = "--upload" ]; then
    echo "☁️ Cloud upload requested but not configured"
    print_warning "Configure cloud backup in this script if needed"
fi

exit 0