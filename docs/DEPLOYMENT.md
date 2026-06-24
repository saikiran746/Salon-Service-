# Deployment Guide — Luxe Salon Management System

## Option 1: VPS Deployment (Ubuntu 22.04)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 2. MySQL Production Setup

```sql
CREATE DATABASE salon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'salon_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON salon_db.* TO 'salon_user'@'localhost';
FLUSH PRIVILEGES;
```

```bash
mysql -u salon_user -p salon_db < database/schema.sql
mysql -u salon_user -p salon_db < database/seed.sql
```

### 3. Backend Deployment

```bash
cd /var/www/salon-management/backend
cp .env.example .env
nano .env  # Fill in production values

npm install --production

# Start with PM2
pm2 start src/server.js --name "salon-api"
pm2 startup
pm2 save
```

**Production `.env` differences:**
```env
NODE_ENV=production
DB_HOST=localhost
DB_PASSWORD=StrongPassword123!
JWT_SECRET=64_char_random_string_here
FRONTEND_URL=https://yourdomain.com
```

### 4. Frontend Build

```bash
cd /var/www/salon-management/frontend
cp .env.example .env.production
# Set VITE_API_URL=https://yourdomain.com/api
npm install
npm run build
# Output is in dist/
```

### 5. Nginx Configuration

```nginx
# /etc/nginx/sites-available/salon
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (React)
    location / {
        root /var/www/salon-management/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Invoice downloads
    location /invoices {
        alias /var/www/salon-management/backend/uploads/invoices;
        add_header Content-Disposition attachment;
    }

    # Max upload size
    client_max_body_size 50M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/salon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Option 2: Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: salon_db
      MYSQL_USER: salon_user
      MYSQL_PASSWORD: salonpass
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    environment:
      DB_HOST: mysql
      DB_NAME: salon_db
      DB_USER: salon_user
      DB_PASSWORD: salonpass
      JWT_SECRET: your_jwt_secret_here
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - mysql
    volumes:
      - uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
  uploads:
```

### Backend Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN mkdir -p uploads/invoices
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### Frontend Dockerfile

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
docker-compose up -d --build
```

---

## Option 3: Platform-as-a-Service

### Backend → Railway / Render
1. Connect GitHub repo
2. Set root directory: `backend`
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add all environment variables

### Frontend → Vercel / Netlify
1. Connect GitHub repo
2. Set root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env: `VITE_API_URL=https://your-backend-url.com/api`

### Database → PlanetScale / Railway MySQL
1. Create MySQL database
2. Copy connection string to backend `.env`

---

## Post-Deployment Checklist

- [ ] Change default admin password immediately
- [ ] Test all email templates (SMTP working)
- [ ] Verify Cloudinary image uploads work
- [ ] Test appointment booking flow end-to-end
- [ ] Test invoice PDF generation & download
- [ ] Set up database backups (cron + mysqldump)
- [ ] Monitor with PM2 dashboard: `pm2 monit`
- [ ] Set up error monitoring (Sentry recommended)
- [ ] Configure SSL certificate auto-renewal

## Database Backup

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * mysqldump -u salon_user -pPassword salon_db | gzip > /backups/salon_$(date +\%Y\%m\%d).sql.gz
```
