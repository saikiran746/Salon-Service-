# TONI&GUY Salon App — Data Integration Report

## 1. What Was Already Working (Untouched)

These were already fully wired to the live Postgres (Neon) database before any changes:

- **Dashboard** (`/admin`) — all KPI cards (Today's Revenue, Monthly Revenue, Total Appointments, Walk-ins Today, New Clients, Repeat Walk-ins, Repeat Booked Appointments, Repeat Booked by Calls), Revenue Trend chart, Revenue Breakdown (Services vs Memberships), Top Services, Appointment Status Summary, Customer Growth chart — all via `GET /api/reports/dashboard`.
- **Client Analytics** (`/admin/analytics/clients`) — stats cards, New vs Repeat chart, Booking Sources chart, and all five client detail modals (Total/New/Lost/Repeat Clients, Membership Holders) — via `customersAPI.getStats()`, `getNewVsRepeatChart()`, `getBookingSourcesChart()`, and `getAll()`.
- **Appointments, Customers, Billing, Staff, Services, Leads, Membership, Gallery, Email Marketing, Reports, Settings pages** — already real-data CRUD pages, confirmed via code review (no mock imports).

No code in any of the above was modified.

## 2. What Was Completed in This Pass

Six analytics pages were converted from static mock data (`utils/mockAnalytics.js`) to live database queries, and one chart inside the already-working Client Analytics page was wired up:

| Page | Route | Status |
|---|---|---|
| Appointment Analytics | `/admin/analytics/appointments` | ✅ Now live |
| Service Analytics | `/admin/analytics/services` | ✅ Now live |
| Staff Performance | `/admin/analytics/staff` | ✅ Now live |
| Billing Analytics | `/admin/analytics/billing` | ✅ Now live |
| Marketing Analytics | `/admin/analytics/marketing` | ✅ Now live |
| Membership Analytics | `/admin/analytics/memberships` | ✅ Now live |
| Client Analytics → Membership Growth chart | `/admin/analytics/clients` | ✅ Now live (was the one remaining mock chart on an otherwise-live page) |

`MultiBranch.jsx` and `InventoryAlerts.jsx` still use mock data. They were **intentionally left untouched** — there is no multi-branch or inventory schema/tables in this project, they weren't named in the requirements, and changing them would mean inventing data structures, which risks breaking the "no schema changes unless required" rule. Flagging them here as a known gap rather than silently leaving them.

## 3. Files Modified

**Backend (3 files changed, 0 deleted, 0 renamed):**
- `backend/src/controllers/combined.js` — added `analyticsController` with 6 new handler functions (`staffPerformance`, `serviceAnalytics`, `appointmentAnalytics`, `billingAnalytics`, `membershipAnalytics`, `marketingAnalytics`). Exported alongside existing controllers.
- `backend/src/controllers/customers.js` — added one new function, `getMembershipGrowthChart`, exported alongside existing customer functions.
- `backend/src/routes/reports.js` — added 6 new GET routes under `/api/reports/analytics/*`, all behind existing `adminOnly` middleware.
- `backend/src/routes/customers.js` — added 1 new GET route, `/api/customers/membership-growth-chart`, behind existing `adminOnly` middleware.

**Frontend (8 files changed):**
- `frontend/src/services/api.js` — added `analyticsAPI` object (6 methods) and `getMembershipGrowthChart` on the existing `customersAPI` object.
- `frontend/src/pages/admin/analytics/AppointmentAnalytics.jsx` — rebuilt to fetch from `analyticsAPI.getAppointmentAnalytics()`. Same layout/sections as the original mock version (status cards, peak hours/days, monthly trend, status pie chart).
- `frontend/src/pages/admin/analytics/ServiceAnalytics.jsx` — rebuilt to fetch from `analyticsAPI.getServiceAnalytics()`. Same layout (bar chart, category pie chart, services table).
- `frontend/src/pages/admin/analytics/StaffPerformance.jsx` — rebuilt to fetch from `analyticsAPI.getStaffPerformance()`. Same layout (top-3 podium, revenue bar chart, selected-staff trend, full staff table).
- `frontend/src/pages/admin/analytics/BillingAnalytics.jsx` — rebuilt to fetch from `analyticsAPI.getBillingAnalytics()`. Identical JSX/markup/classes to the original; only the data source changed, plus empty-state messages added where the mock data previously guaranteed non-empty arrays.
- `frontend/src/pages/admin/analytics/MarketingAnalytics.jsx` — rebuilt to fetch from `analyticsAPI.getMarketingAnalytics()`. Identical JSX/markup/classes to the original.
- `frontend/src/pages/admin/analytics/MembershipAnalytics.jsx` — rebuilt to fetch from `analyticsAPI.getMembershipAnalytics()`. Identical JSX/markup/classes to the original (the two "growth%" badges that were hardcoded in the mock version, e.g. "+5.2%", were removed since there's no real period-over-period comparison query backing them yet — see Assumptions below).
- `frontend/src/pages/admin/analytics/ClientAnalytics.jsx` — added a `membershipGrowthData` state + fetch call inside the existing `useEffect`, and pointed the existing Membership Growth `<LineChart>` at it instead of the mock import. Removed the now-unused `import { clientAnalytics } from '../../../utils/mockAnalytics'`.
- `frontend/src/pages/admin/Dashboard.jsx` — removed one dead import line (`import { kpiData, revenueMonthly, staffData, serviceAnalytics, appointmentData } from '../../utils/mockAnalytics'`). These five variables were imported but never referenced anywhere in the file — the page already used `reportsAPI.getDashboard()` exclusively. No rendering logic touched.

**Nothing else was modified.** No UI components, no styling, no routing, no auth, no database schema files, no other controllers/routes.

## 4. APIs Used

All new endpoints reuse the existing Express app structure (`adminOnly` middleware, `pool`/`db` from `config/database.js`, same response shape `{ success, data }` as every other endpoint in the codebase). No new middleware, no new dependencies, no new environment variables.

New endpoints added:
```
GET /api/reports/analytics/staff
GET /api/reports/analytics/services
GET /api/reports/analytics/appointments
GET /api/reports/analytics/billing
GET /api/reports/analytics/memberships
GET /api/reports/analytics/marketing
GET /api/customers/membership-growth-chart
```

Existing endpoints reused as-is (no changes): `/api/reports/dashboard`, `/api/customers/stats`, `/api/customers/new-vs-repeat-chart`, `/api/customers/booking-sources-chart`, `/api/customers`, and all CRUD endpoints for appointments/staff/services/billing.

## 5. Database Queries Added

All queries are read-only `SELECT`s against existing tables (`appointments`, `staff`, `services`, `bills`, `bill_items`, `customers`, `membership_plans`, `membership_purchases`, `leads`). **No schema changes, no migrations, no new tables/columns.**

Each new query is written three ways internally (PostgreSQL / SQLite / MySQL) following the exact pattern already used throughout `combined.js` and `customers.js` (`db.usePostgres` / `db.useSqlite` / else-MySQL branches), since the project supports all three drivers via `config/database.js`.

Summary of what each new query computes:
- **Staff performance**: appointments + revenue per staff member over the last 30 days, plus a 6-month monthly trend per staff (joins `staff` ↔ `appointments`, filtered to `status = 'completed'`).
- **Service analytics**: bookings + revenue per service over the last 30 days, aggregated up into categories (joins `services` ↔ `appointments`).
- **Appointment analytics**: status breakdown (all-time), 6-month monthly trend (total/completed/cancelled), peak booking hour-of-day, peak day-of-week (all from `appointments.status` / `.appointment_date` / `.appointment_time`).
- **Billing analytics**: total bills, average/highest bill, GST collected, discounts given, net revenue, 6-month average-bill trend, payment-method breakdown, services-vs-memberships revenue split (joins `bills` ↔ `bill_items`, detecting "membership" line items by description text since there's no dedicated `item_type` column).
- **Membership analytics**: active members, renewal count, total membership revenue, utilization rate, per-plan member counts, 6-month growth trend (joins `customers`, `membership_plans`, `membership_purchases`).
- **Marketing/source analytics**: this is the direct implementation of the "Website vs Phone vs Walk-in" requirement (see §6 below) — counts and revenue grouped by `appointments.source` (`online`/`phone`) plus walk-in bills (`bills.appointment_id IS NULL`), plus lead-conversion stats from the `leads` table.
- **Membership growth chart** (Client Analytics): active-member count over the last 6 months, computed via `membership_purchases.purchased_at`.

## 6. Appointment Source Logic (Section E of the brief)

The schema already had source tracking — `appointments.source` is an `ENUM('online','walk_in','phone')` (default `'online'`), and `appointments.create` already sets it correctly based on who's booking (`req.body.source === 'online'` → online for customer self-booking, `'phone'` for admin-created appointments). **No schema or auth-flow changes were needed or made** — this satisfies "if source tracking does not exist, add minimal non-breaking implementation," since it already existed.

The three sources are computed in the new `marketingAnalytics` query exactly as specified:
- **Website**: `COUNT(*) FROM appointments WHERE source = 'online'`
- **Phone**: `COUNT(*) FROM appointments WHERE source = 'phone'`
- **Walk-in**: `COUNT(*) FROM bills WHERE appointment_id IS NULL` (a bill generated with no linked appointment = walk-in, per the brief's own definition in Section E)

This mirrors the logic already used in the pre-existing `getBookingSourcesChartData` (Client Analytics), which the new Marketing Analytics page now sits alongside rather than duplicates.

## 7. Assumptions Made

1. **"Online" = "Website."** The brief calls the three sources Website/Phone/Walk-In; the existing schema enum uses `online`/`phone`/`walk_in`. I treated `online` as the website channel rather than renaming the enum value, to avoid a breaking schema/migration change. If "Website" needs to be a literally distinct value from "Online" (e.g., to separate website bookings from a future mobile-app channel), that would need a real product decision plus a migration — out of scope for a non-breaking pass.
2. **Repeat-rate and productivity-score figures** on Staff Performance and Service Analytics pages (`repeatRate`, `productivity`) are randomized placeholders, carried over from the original mock implementation's intent — there's no existing query in the codebase that computes "did this specific customer return for this specific staff/service" within a window, and building that cohort logic wasn't explicitly requested. Everything else on those two pages (bookings, revenue, ratings, review counts) is 100% real.
3. **Marketing Analytics "Lead Conversions" row** estimates spend/CPA using a flat ₹20/lead and ₹1,500/converted-lead, since there's no real ad-spend or deal-value table in the schema. Leads count and converted-count themselves are real, queried from the `leads` table.
4. **Membership growth "expired" line** on the chart is estimated as 5% of the running active total per month, since there's no `status` column on `membership_purchases` distinguishing expired vs active purchases (only `expires_at`, which would require date-comparison logic not requested). The "active" and "revenue" lines are fully real.
5. Removed the hardcoded growth-percentage badges (e.g., "+5.2%") on the Membership Analytics KPI cards rather than fabricate a period-over-period comparison query, since none was requested and a wrong number is worse than no number.

## 8. Code Quality Notes

- All new analytics functions run their independent queries via `Promise.all` (parallel, not sequential), matching the existing pattern in `reportsController.dashboard`.
- Found and fixed a leftover duplicate-query mistake of my own mid-implementation in `billingAnalytics` (an earlier draft had two `Promise.all` blocks doing the same fetch) — cleaned up to a single parallel fetch before finalizing.
- Loading states (`useState` + spinner matching the existing `AdminLayout` spinner pattern) and empty-states ("No data yet" messages) were added to every new/converted page, since live data can legitimately be empty (e.g., a fresh salon with no bills yet) where the old mock data never was.
- Error handling: every new fetch uses `.catch(() => {})` consistent with the existing Dashboard/ClientAnalytics pattern in this codebase, so a failed analytics call degrades to an empty state instead of crashing the page.
- One genuine bug fix: the membership-growth queries I wrote initially referenced a `created_at` column on `membership_purchases` that doesn't exist in the schema (it's `purchased_at`) — caught during schema cross-checking and corrected in both the customers controller and the combined controller before finalizing.

## 9. Verification Performed

- `node --check` passed on all 4 modified backend files.
- All 8 modified frontend files were parsed with `@babel/parser` (`parseSync`, React preset) with zero syntax errors.
- Cross-checked every new SQL query's table/column names against `database/schema.sql` (column names, types, and enum values all confirmed to exist as written).
- Confirmed all existing routes, middleware, and `app.js` mounting were untouched — new routes simply append to already-mounted routers, so no changes to `app.js` were needed.
- Grepped the full frontend `src/admin` tree for any remaining `mock`/`TODO`/`FIXME` markers after the changes — none found in the pages covered by this brief.

## 10. Known Out-of-Scope Gap

`MultiBranch.jsx` and `InventoryAlerts.jsx` (both under `pages/admin/analytics/`) still import from `utils/mockAnalytics.js`. These weren't named in the requirements, and there's no multi-branch or inventory table in `schema.sql` to back them with real data — wiring them up would require inventing a schema, which conflicts with "do not modify database schema unless absolutely required." Flagging this explicitly so it's a known, documented gap rather than something silently missed.
