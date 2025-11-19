# CloudnotesAI - VPS Deployment Guide

This guide will help you deploy the CloudnotesAI application on your own VPS server.

## 📋 Prerequisites

- VPS server with Ubuntu/Debian (recommended)
- Node.js 18+ installed
- PostgreSQL 14+ installed
- Domain name (optional, for production)

## 📦 Files to Copy

Copy all project files to your VPS server:

```bash
# On your local machine
scp -r ./* user@your-vps-ip:/path/to/app/

# Or use git
git clone <your-repo-url>
```

**Important files:**
- `package.json` - Dependencies
- `server/` - Backend code
- `client/` - Frontend code  
- `shared/` - Shared types
- `database_export.sql` - Database backup (see below)
- `.env` - Environment variables (create this)

## 🔑 Environment Variables

Create a `.env` file in the root directory with these variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/cloudnotesai

# OpenAI API Key (required for transcription and AI features)
OPENAI_API_KEY=your_openai_api_key_here

# Session Secret (generate a random string)
SESSION_SECRET=your_random_session_secret_here

# Email Configuration (for Gmail SMTP)
GMAIL_APP_PASSWORD=your_gmail_app_password_here

# Server Configuration
NODE_ENV=production
PORT=5000

# Optional: Frontend URL for emails
FRONTEND_URL=https://yourdomain.com
```

### How to Get Each Variable:

1. **DATABASE_URL**: 
   - Install PostgreSQL: `sudo apt install postgresql`
   - Create database: `sudo -u postgres createdb cloudnotesai`
   - Set password: `sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpassword';"`
   - Format: `postgresql://postgres:yourpassword@localhost:5432/cloudnotesai`

2. **OPENAI_API_KEY**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy and paste it

3. **SESSION_SECRET**:
   - Generate a random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **GMAIL_APP_PASSWORD**:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification
   - Generate App Password for Mail
   - Use: erdeveloper43@gmail.com (or your own Gmail)

## 💾 Database Setup

### 1. Import the Database

The database has been exported to `database_export.sql` (67KB)

```bash
# On your VPS, import the database
psql $DATABASE_URL < database_export.sql

# Or if using postgres user:
sudo -u postgres psql cloudnotesai < database_export.sql
```

### 2. Verify Import

```bash
psql $DATABASE_URL -c "\dt"  # List all tables
```

You should see tables like: users, cases, assessments, recordings, etc.

## 🚀 Installation & Deployment

### 1. Install Dependencies

```bash
cd /path/to/app
npm install
```

### 2. Build the Application

```bash
npm run build
```

### 3. Run Database Migrations (if needed)

```bash
npm run db:push
```

### 4. Start the Application

**For Development:**
```bash
npm run dev
```

**For Production (using PM2):**
```bash
# Install PM2
npm install -g pm2

# Start the app
pm2 start npm --name "cloudnotesai" -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

### 5. Configure Nginx (Optional - for production)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable and restart nginx
sudo ln -s /etc/nginx/sites-available/cloudnotesai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL Certificate (Optional - Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 📁 File Storage

The application stores uploaded audio files in the `uploads/` directory. Make sure this directory has proper permissions:

```bash
mkdir -p uploads
chmod 755 uploads
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill the process
sudo kill -9 <PID>
```

### Audio Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Fix permissions
sudo chown -R $USER:$USER uploads/
```

## 📊 Monitoring

### View Application Logs (PM2)
```bash
pm2 logs cloudnotesai
pm2 monit
```

### Database Monitoring
```bash
# Connect to database
psql $DATABASE_URL

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔄 Backup & Maintenance

### Regular Database Backups
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backups/backup_$DATE.sql"
# Keep only last 7 backups
ls -t backups/backup_*.sql | tail -n +8 | xargs rm -f
EOF

chmod +x backup.sh

# Add to cron (daily at 2 AM)
(crontab -l ; echo "0 2 * * * /path/to/backup.sh") | crontab -
```

### Update Application
```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart cloudnotesai
```

## 📝 Notes

1. **Default Admin User**: After importing the database, you'll have the seeded admin user:
   - Email: admin@example.com
   - Password: admin123
   - **Change this immediately in production!**

2. **Security**:
   - Change all default passwords
   - Keep your API keys secure
   - Enable firewall: `sudo ufw enable`
   - Only allow necessary ports: `sudo ufw allow 80,443,22/tcp`

3. **Performance**:
   - For production, consider using a CDN for static assets
   - Set up database connection pooling
   - Monitor API usage for OpenAI costs

## 🆘 Support

If you encounter any issues:
1. Check the logs: `pm2 logs cloudnotesai`
2. Verify environment variables are set correctly
3. Ensure all services (PostgreSQL, Nginx) are running
4. Check firewall settings

---

**File Generated**: Database export saved to `database_export.sql` (67KB)
**Status**: Ready for deployment
