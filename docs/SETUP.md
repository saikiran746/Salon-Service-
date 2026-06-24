# Setup Guide — Luxe Salon Management System

## 1. MySQL Database

```sql
-- Create database
CREATE DATABASE salon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Run schema
mysql -u root -p salon_db < database/schema.sql

-- Run seed data
mysql -u root -p salon_db < database/seed.sql
```

## 2. Backend `.env` Configuration

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=salon_db
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD

JWT_SECRET=minimum_32_character_secret_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=another_32_char_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=30d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password

ADMIN_EMAIL=admin@luxesalon.com
FRONTEND_URL=http://localhost:5173
```

## 3. Frontend `.env`

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

## 4. Cloudinary Setup

1. Sign up at cloudinary.com (free tier: 25GB)
2. Copy Cloud Name, API Key, API Secret from dashboard
3. Paste into backend `.env`

## 5. Gmail SMTP Setup

1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

## 6. Running the Project

```bash
# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install

# Start backend (port 5000)
cd backend && npm run dev

# Start frontend (port 5173)
cd frontend && npm run dev
```

## 7. Initial Admin Login

```
URL:      http://localhost:5173/admin/login
Email:    admin@luxesalon.com
Password: Admin@123456
```

**⚠️ Change the admin password immediately after first login!**

## 8. Customizing the Salon Name/Brand

Edit the following:
- `frontend/src/components/common/Navbar.jsx` — Update brand name
- `frontend/src/components/common/Footer.jsx` — Update address, phone, email
- `frontend/index.html` — Update `<title>` and meta description
- `backend/src/utils/email.js` — Update email templates and salon details
- `backend/.env` — Update `EMAIL_FROM_NAME` and `ADMIN_EMAIL`

## 9. Troubleshooting

**MySQL connection error:**
- Verify DB credentials in `.env`
- Ensure MySQL service is running: `sudo service mysql start`

**Email not sending:**
- Check SMTP credentials
- For Gmail, ensure App Password is used (not account password)
- Check spam folder in test emails

**Cloudinary upload fails:**
- Verify all three Cloudinary credentials
- Check file size limits (5MB for images, 50MB for videos)

**CORS errors:**
- Ensure `FRONTEND_URL` in backend `.env` matches actual frontend URL
- For production, update to your domain
