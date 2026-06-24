# ✦ Luxe Salon Management System

A complete, production-ready luxury salon management system with a premium black/gold UI, comprehensive admin panel, customer booking portal, billing, memberships, email marketing, and more.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js 18, Vite, Tailwind CSS, Chart.js |
| Backend | Node.js, Express.js |
| Database | MySQL 8+ |
| Auth | JWT (Access + Refresh Tokens) |
| Storage | Cloudinary (images/videos) |
| Email | Nodemailer (SMTP) |
| PDF | PDFKit |
| Cron | node-cron |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8+
- Cloudinary account
- SMTP email account (Gmail, SendGrid, etc.)

### 1. Clone & Install

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Database Setup

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p salon_db < database/seed.sql
```

### 3. Run Development Servers

```bash
# Terminal 1 – Backend
cd backend
npm run dev

# Terminal 2 – Frontend
cd frontend
npm run dev
```

### 4. Access the App

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Customer Website |
| http://localhost:5173/admin/login | Admin Panel |
| http://localhost:5000/api | API Base URL |

### Default Admin Credentials
```
Email:    admin@luxesalon.com
Password: Admin@123456
```

---

## 📁 Project Structure

```
salon-management/
├── frontend/                  # React Vite app
│   └── src/
│       ├── components/
│       │   ├── admin/         # AdminLayout, Sidebar
│       │   └── common/        # Navbar, Footer
│       ├── pages/
│       │   ├── admin/         # All 12 admin pages
│       │   └── client/        # All 10 client pages
│       ├── context/           # Auth context
│       └── services/          # Axios API layer
│
├── backend/                   # Node.js Express API
│   └── src/
│       ├── controllers/       # Business logic
│       ├── middleware/        # Auth, upload
│       ├── routes/            # Express routers
│       ├── services/          # Cron jobs
│       └── utils/             # Email, PDF, invoice
│
├── database/
│   ├── schema.sql             # Full DB schema (17 tables)
│   └── seed.sql               # Sample data
│
└── docs/
    ├── API.md                 # API documentation
    ├── SETUP.md               # Setup guide
    └── DEPLOYMENT.md          # Deployment guide
```

---

## ✨ Features

### Admin Panel (`/admin/*`)
- 📊 **Dashboard** — Revenue charts, customer stats, staff performance, today's bookings
- 📅 **Appointments** — Full CRUD, status management, walk-in creation
- 👥 **Customers** — Profiles, history, spending, membership status
- ✂️ **Services** — Add/edit/delete with images and category management
- 👤 **Staff** — Management + detailed analytics per staff member
- 🧾 **Billing** — Invoice generation, PDF download, payment tracking
- 👑 **Memberships** — Plan management, active members view
- 🖼️ **Gallery** — Instagram-style photo/video uploads
- 🎯 **Leads** — Capture & track potential customers
- 📧 **Email Marketing** — Templates, campaigns, automated win-back

### Customer Portal
- 🏠 **Home** — Hero slider, services preview, specialists, gallery
- ✂️ **Services** — Filterable service catalog
- 👤 **Specialists** — Staff profiles with ratings
- 👑 **Memberships** — Plan comparison & purchase
- 🖼️ **Gallery** — Lightbox gallery with filters
- 📅 **Book Appointment** — 4-step guided booking
- 📊 **Dashboard** — Appointments, bills, membership, profile

### Automation
- 🔄 Win-back emails at 30, 60, 90 days since last visit
- ⏰ Membership expiry reminders at 7 days
- 🎯 Lead capture on service browse without booking
- 📧 Instant confirmation/cancellation emails

---

## 🔐 Security
- JWT with refresh token rotation
- Bcrypt password hashing (cost factor 12)
- Role-based access control (customer / admin / super_admin)
- Rate limiting on all API routes (stricter on auth)
- Helmet.js HTTP security headers
- Admin routes completely isolated from customer routes

---

## 📄 License
MIT License — Free for commercial and personal use.
