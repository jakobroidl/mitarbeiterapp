#!/bin/bash

# Event Staff App Monitoring Script
# Überwacht die wichtigsten Services und sendet Alerts bei Problemen

set -e

# Konfiguration
APP_NAME="event-staff"
BACKEND_PORT=3001
DB_NAME="event_staff_db"
LOG_FILE="/var/log/event-staff-monitor.log"
ALERT_EMAIL="admin@popupfest.de"  # Optional: E-Mail für Alerts

# Health Check URLs
BACKEND_HEALTH="http://localhost:$BACKEND_PORT/health"
FRONTEND_HEALTH="http://localhost/health"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging Funktion
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
    log_message "OK: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    log_message "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log_message "INFO: $1"
}

# Alert-Funktion (optional)
send_alert() {
    local message="$1"
    if [ ! -z "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Event Staff App Alert - $(hostname)" $ALERT_EMAIL
        log_message "Alert sent to $ALERT_EMAIL: $message"
    fi
}

# Service Status prüfen
check_service() {
    local service_name="$1"
    if systemctl is-active --quiet $service_name; then
        print_status "$service_name is running"
        return 0
    else
        print_error "$service_name is not running"
        return 1
    fi
}

# Port Check
check_port() {
    local port="$1"
    local service="$2"
    
    if netstat -tulpn | grep -q ":$port "; then
        print_status "$service listening on port $port"
        return 0
    else
        print_error "$service not listening on port $port"
        return 1
    fi
}

# HTTP Health Check
check_http() {
    local url="$1"
    local service="$2"
    local timeout=10
    
    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_status "$service HTTP health check passed"
        return 0
    else
        print_error "$service HTTP health check failed ($url)"
        return 1
    fi
}

# Database Check
check_database() {
    if mysql -u event_staff_user -pSchwimmen1997! -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1; then
        print_status "Database connection successful"
        return 0
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Disk Space Check
check_disk_space() {
    local threshold=85
    local usage=$(df /var/www/event-staff | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt "$threshold" ]; then
        print_status "Disk space usage: ${usage}%"
        return 0
    else
        print_warning "Disk space usage high: ${usage}%"
        return 1
    fi
}

# Memory Check
check_memory() {
    local threshold=85
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt "$threshold" ]; then
        print_status "Memory usage: ${usage}%"
        return 0
    else
        print_warning "Memory usage high: ${usage}%"
        return 1
    fi
}

# PM2 Check
check_pm2() {
    if pm2 list | grep -q "$APP_NAME-backend"; then
        local status=$(pm2 show $APP_NAME-backend | grep "status" | awk '{print $4}')
        if [ "$status" = "online" ]; then
            print_status "PM2 process $APP_NAME-backend is online"
            return 0
        else
            print_error "PM2 process $APP_NAME-backend status: $status"
            return 1
        fi
    else
        print_error "PM2 process $APP_NAME-backend not found"
        return 1
    fi
}

# SSL Certificate Check
check_ssl() {
    local domain="popupfest.de"
    local days_until_expiry
    
    if command -v openssl &> /dev/null; then
        days_until_expiry=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2 | xargs -I {} date -d {} +%s)
        current_time=$(date +%s)
        days_left=$(( (days_until_expiry - current_time) / 86400 ))
        
        if [ "$days_left" -gt 30 ]; then
            print_status "SSL certificate valid for $days_left days"
            return 0
        elif [ "$days_left" -gt 7 ]; then
            print_warning "SSL certificate expires in $days_left days"
            return 1
        else
            print_error "SSL certificate expires in $days_left days - URGENT!"
            return 1
        fi
    else
        print_warning "OpenSSL not available for SSL check"
        return 1
    fi
}

# File Permissions Check
check_permissions() {
    local upload_dir="/var/www/event-staff/backend/uploads"
    
    if [ -d "$upload_dir" ] && [ -w "$upload_dir" ]; then
        print_status "Upload directory permissions OK"
        return 0
    else
        print_error "Upload directory not writable"
        return 1
    fi
}

# Log File Size Check
check_log_sizes() {
    local max_size=100M
    local log_dir="/var/www/event-staff/logs"
    
    if [ -d "$log_dir" ]; then
        local large_logs=$(find $log_dir -name "*.log" -size +$max_size)
        if [ -z "$large_logs" ]; then
            print_status "Log file sizes OK"
            return 0
        else
            print_warning "Large log files found: $large_logs"
            return 1
        fi
    else
        print_warning "Log directory not found"
        return 1
    fi
}

# Backup Check
check_recent_backup() {
    local backup_dir="/var/backups/event-staff"
    local max_age=2  # Tage
    
    if [ -d "$backup_dir" ]; then
        local recent_backup=$(find $backup_dir -name "event-staff_*" -mtime -$max_age | head -1)
        if [ ! -z "$recent_backup" ]; then
            print_status "Recent backup found: $(basename $recent_backup)"
            return 0
        else
            print_warning "No recent backup found (older than $max_age days)"
            return 1
        fi
    else
        print_warning "Backup directory not found"
        return 1
    fi
}

# Main Monitoring Function
run_monitoring() {
    local failed_checks=0
    local total_checks=0
    
    echo -e "${BLUE}🔍 Event Staff App Health Check - $(date)${NC}"
    echo "=================================================="
    
    # System Services
    echo -e "\n📊 System Services:"
    check_service "nginx" || ((failed_checks++))
    ((total_checks++))
    
    check_service "mysql" || ((failed_checks++))
    ((total_checks++))
    
    # Application
    echo -e "\n🚀 Application:"
    check_pm2 || ((failed_checks++))
    ((total_checks++))
    
    check_port $BACKEND_PORT "Backend" || ((failed_checks++))
    ((total_checks++))
    
    check_http "$BACKEND_HEALTH" "Backend API" || ((failed_checks++))
    ((total_checks++))
    
    check_database || ((failed_checks++))
    ((total_checks++))
    
    # System Resources
    echo -e "\n💻 System Resources:"
    check_disk_space || ((failed_checks++))
    ((total_checks++))
    
    check_memory || ((failed_checks++))
    ((total_checks++))
    
    # Security & Maintenance
    echo -e "\n🔒 Security & Maintenance:"
    check_ssl || ((failed_checks++))
    ((total_checks++))
    
    check_permissions || ((failed_checks++))
    ((total_checks++))
    
    check_log_sizes || ((failed_checks++))
    ((total_checks++))
    
    check_recent_backup || ((failed_checks++))
    ((total_checks++))
    
    # Summary
    echo -e "\n📋 Summary:"
    local success_rate=$(( (total_checks - failed_checks) * 100 / total_checks ))
    
    if [ $failed_checks -eq 0 ]; then
        print_status "All checks passed! ($total_checks/$total_checks)"
    elif [ $failed_checks -le 2 ]; then
        print_warning "$failed_checks checks failed ($((total_checks - failed_checks))/$total_checks passed)"
    else
        print_error "$failed_checks checks failed ($((total_checks - failed_checks))/$total_checks passed)"
        send_alert "Event Staff App: $failed_checks health checks failed on $(hostname)"
    fi
    
    echo "Success rate: $success_rate%"
    echo "=================================================="
    
    return $failed_checks
}

# Auto-Repair Function
auto_repair() {
    print_info "Attempting auto-repair..."
    
    # PM2 Prozess neustarten falls down
    if ! pm2 show $APP_NAME-backend | grep -q "online"; then
        print_info "Restarting PM2 process..."
        pm2 restart $APP_NAME-backend
        sleep 5
    fi
    
    # Nginx reload falls Config-Problem
    if ! systemctl is-active --quiet nginx; then
        print_info "Restarting Nginx..."
        sudo systemctl restart nginx
        sleep 2
    fi
    
    # Upload-Permissions reparieren
    if [ ! -w "/var/www/event-staff/backend/uploads" ]; then
        print_info "Fixing upload directory permissions..."
        sudo chmod -R 755 /var/www/event-staff/backend/uploads
        sudo chown -R www-data:www-data /var/www/event-staff/backend/uploads
    fi
}

# Kommandozeilen-Optionen
case "${1:-monitor}" in
    "monitor")
        run_monitoring
        ;;
    "repair")
        auto_repair
        run_monitoring
        ;;
    "continuous")
        print_info "Starting continuous monitoring (every 5 minutes)..."
        while true; do
            run_monitoring
            echo -e "\n⏰ Next check in 5 minutes...\n"
            sleep 300
        done
        ;;
    "status")
        # Kurzer Status Check
        echo "PM2: $(pm2 show $APP_NAME-backend | grep "status" | awk '{print $4}')"
        echo "Nginx: $(systemctl is-active nginx)"
        echo "MySQL: $(systemctl is-active mysql)"
        echo "Backend Health: $(curl -s $BACKEND_HEALTH || echo "Failed")"
        ;;
    *)
        echo "Usage: $0 [monitor|repair|continuous|status]"
        echo ""
        echo "Commands:"
        echo "  monitor     - Run complete health check (default)"
        echo "  repair      - Attempt auto-repair and then monitor"
        echo "  continuous  - Run monitoring every 5 minutes"
        echo "  status      - Quick status check"
        exit 1
        ;;
esac

exit $?