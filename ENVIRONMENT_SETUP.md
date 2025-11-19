# Environment Variables Setup

## Required Variables

Copy these to your .env file on the VPS:

### 1. DATABASE_URL
Create PostgreSQL database and connection string:
```bash
sudo -u postgres createdb cloudnotesai
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'yourpassword';"
```
Then set: `postgresql://postgres:yourpassword@localhost:5432/cloudnotesai`

### 2. OPENAI_API_KEY
- Get from: https://platform.openai.com/api-keys
- Current key: 

### 3. SESSION_SECRET
Generate new random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. GMAIL_APP_PASSWORD
- Gmail account: erdeveloper43@gmail.com
- Setup: https://myaccount.google.com/security
- Enable 2-Step Verification → Generate App Password
- Current password: 

### 5. NODE_ENV
Set to: `production`

### 6. PORT (optional)
Default: `5000`
