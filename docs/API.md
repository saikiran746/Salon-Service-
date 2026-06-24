# API Documentation — Luxe Salon Management System

**Base URL:** `http://localhost:5000/api`  
**Auth:** Bearer Token in `Authorization` header  
**Format:** JSON

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Customer registration |
| POST | `/auth/login` | None | Customer/any login |
| POST | `/auth/admin/login` | None | Admin-only login |
| GET | `/auth/me` | Required | Get current user |
| POST | `/auth/forgot-password` | None | Send reset email |
| POST | `/auth/reset-password` | None | Reset with token |
| PUT | `/auth/change-password` | Required | Change password |
| POST | `/auth/refresh-token` | None | Refresh JWT |

---

## Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/appointments` | Admin | List all appointments |
| GET | `/appointments/today` | Admin | Today's appointments |
| GET | `/appointments/my` | Customer | My appointments |
| GET | `/appointments/available-slots` | None | Available time slots |
| POST | `/appointments` | Required | Create appointment |
| PUT | `/appointments/:id` | Admin | Update appointment |
| PATCH | `/appointments/:id/cancel` | Customer | Cancel appointment |

**Query params (GET /appointments):** `page, limit, status, date, staff_id, customer_id, search`

---

## Services

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/services` | None | List services |
| GET | `/services/:id` | None | Get service |
| GET | `/services/:id/staff` | None | Get staff for service |
| POST | `/services` | Admin | Create service (multipart) |
| PUT | `/services/:id` | Admin | Update service (multipart) |
| DELETE | `/services/:id` | Admin | Delete service |

---

## Staff

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/staff` | None | List staff |
| GET | `/staff/:id` | None | Get staff member |
| GET | `/staff/:id/analytics` | Admin | Staff performance |
| POST | `/staff` | Admin | Add staff (multipart) |
| PUT | `/staff/:id` | Admin | Update staff (multipart) |
| DELETE | `/staff/:id` | Admin | Remove staff |
| POST | `/staff/reviews` | Customer | Add review |

---

## Customers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/customers` | Admin | List customers |
| GET | `/customers/stats` | Admin | Customer statistics |
| GET | `/customers/:id` | Admin | Customer detail |
| PUT | `/customers/:id` | Admin | Update customer |
| GET | `/customers/me` | Customer | My profile |
| PUT | `/customers/me` | Customer | Update my profile |

---

## Billing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/billing` | Admin | List all bills |
| POST | `/billing` | Admin | Create bill & invoice |
| GET | `/billing/:id` | Required | Get bill |
| GET | `/billing/:id/download` | Required | Download PDF invoice |
| GET | `/billing/my` | Customer | My bills |

---

## Memberships

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/memberships` | None | List plans |
| GET | `/memberships/admin/all` | Admin | All plans with stats |
| GET | `/memberships/admin/members` | Admin | Active members |
| POST | `/memberships/purchase` | Customer | Purchase plan |
| POST | `/memberships` | Admin | Create plan |
| PUT | `/memberships/:id` | Admin | Update plan |
| DELETE | `/memberships/:id` | Admin | Delete plan |

---

## Gallery

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/gallery` | None | Published posts |
| GET | `/gallery/admin/all` | Admin | All posts |
| POST | `/gallery` | Admin | Create post (multipart) |
| PUT | `/gallery/:id` | Admin | Update post |
| DELETE | `/gallery/:id` | Admin | Delete post |

---

## Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reports/dashboard` | Admin | Dashboard statistics |
| GET | `/reports/revenue` | Admin | Revenue report |

**Query params (revenue):** `from, to, group_by (day/month/year)`

---

## Leads

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/leads/capture` | None | Capture lead |
| GET | `/leads` | Admin | List leads |
| PATCH | `/leads/:id` | Admin | Update lead status |

---

## Email Marketing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/email-marketing/templates` | Admin | List templates |
| POST | `/email-marketing/templates` | Admin | Create template |
| PUT | `/email-marketing/templates/:id` | Admin | Update template |
| POST | `/email-marketing/send` | Admin | Send campaign |
| GET | `/email-marketing/campaigns` | Admin | Campaign history |

---

## Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful.",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description."
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limited |
| 500 | Server Error |
