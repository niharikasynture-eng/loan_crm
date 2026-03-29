# 📘 Comprehensive Technical Guide: Frontend & Backend Workflows

This document provides an exhaustive breakdown of every module in the Sales CRM. It explains how the user interface (Frontend) triggers actions, how the server (Backend) processes them, and how the data is stored.

---

## 🔐 1. Authentication & Session Management
This module handles secure entry and identity verification.

### A. Login Workflow
- **Frontend Flow**: The user enters credentials in `src/app/login/page.tsx`. A `POST` request is sent to `/api/auth/login`.
- **Backend Flow (`api/auth/login`)**:
  - Connects to MongoDB via `src/lib/db.ts`.
  - Finds the user by email (case-insensitive).
  - **Security Check**: Verifies if the account is `active`. If not a super_admin, it also checks if the user's **Organization** status is `active` (not pending/rejected).
  - Compares passwords using `bcrypt` (defined in the `User` model).
  - Generates a **JWT Token** containing `userId`, `orgId`, and `role`.
  - Returns the token and user profile.

### B. Registration (New Org)
- **Frontend Flow**: A new company signs up at `src/app/register/page.tsx`.
- **Backend Flow (`api/auth/register`)**:
  - Creates a new `Organization` entry with status `pending`.
  - Creates the first `User` as the `org_admin`.
  - Sends a "Welcome/Pending" email to the user.

---

## 📊 2. Dashboard & Analytics
Provides a high-level view of the company's health.

- **Frontend Flow**: The main dashboard (`src/app/(dashboard)/page.tsx`) calls `GET /api/dashboard` on load.
- **Backend Flow (`api/dashboard`)**:
  - **Data Aggregation**: Uses `Promise.all` to run multiple MongoDB queries simultaneously for performance.
  - **Metrics**: Counts total Leads, Won/Lost ratios, Total Deal Value, and Pending Tasks.
  - **Role-Gating**: Sales agents only see their own metrics; Admins see the whole organization.
  - **Charts**: Uses MongoDB `$aggregate` to group data by status/stage for the visual graphs.

---

## 👤 3. Leads Management
The core of the CRM where potential customers are tracked.

### A. Fetching Leads
- **Frontend Flow**: `src/app/(dashboard)/leads/page.tsx` renders a table and calls `GET /api/leads`.
- **Backend Logic**:
  - Supports pagination (page/limit) and filtering (status, source, search).
  - **Multi-tenancy**: Strictly filters by `organizationId`.
  - **RBAC**: Sales agents are limited to `assignedTo: userId`.

### B. Creating a Lead
- **Frontend Flow**: User clicks "New Lead" in a modal (`LeadForm.tsx`).
- **Backend Logic**:
  - Saves the lead and automatically tags the creator.
  - **Automations**: Triggers a notification for the Org Admin and sends an email to the assigned Sales Agent.

---

## 💰 4. Deals & Pipeline
Managing potential sales through a visual funnel.

- **Frontend Flow**: The Kanban board (`PipelineView.tsx`) allows dragging deals between stages.
- **Backend Logic (`api/deals`)**:
  - **Conversion**: When a Deal is created from a Lead, the Backend automatically updates the Lead's status to "Qualified".
  - **Calculations**: Tracks `probability` and `expectedCloseDate` to forecast revenue.
  - **State Management**: Moving a deal updates its `position` and `stage`.

---

## 📞 5. Activities & Engagement
Logging interactions like calls, emails, and meetings.

- **Frontend Flow**: On a Lead's profile page, a user logs a call.
- **Backend Logic (`api/activities`)**:
  - Records the type of activity and notes.
  - **Smart Update**: If the activity type is "call" or "meeting", the backend automatically updates the `lastContactedAt` timestamp on the parent `Lead` record.

---

## ✅ 6. Tasks & Accountability
A to-do list for sales representatives.

- **Frontend Flow**: Sidebar or Lead profile shows pending tasks.
- **Backend Logic (`api/tasks`)**:
  - Tracks `dueDate` and `priority`.
  - **Notifications**: When a task is near its deadline, the system can flag it (handled via the `dashboard` or specialized cron jobs in `scripts/`).

---

## 🏢 7. Admin & User Management
Managing the team and organizational settings.

- **Frontend Flow**: `src/app/(dashboard)/settings/team` calls `GET /api/users`.
- **Backend Logic (`api/users`)**:
  - Org Admins can invite new users, change their roles (Manager vs. Agent), or deactivate accounts.
  - **Security**: Only users with the `org_admin` role can access the `PATCH` and `DELETE` methods in this folder.

---

## 🌐 8. Public Lead Capture (Web-to-Lead)
Capturing leads from external websites without a login.

- **Frontend Flow**: A standalone page or an embedded iframe uses a specific Organization Slug.
- **Backend Logic (`api/public/lead`)**:
  - **No Auth Required**: This is a "public" endpoint.
  - **Validation**: It looks up the `Organization` by its `slug`.
  - **Ingestion**: Creates a new Lead in that organization's database, marked with the source "Public Form".
  - **Logging**: This route has extra error logging to `error_log.txt` since it's an external-facing entry point.

---

## 🛠️ Summary of the "Technology Bridge"

1.  **Frontend (React/Next.js)**: Responsible for the **User Intent** and **Data Presentation**.
2.  **API Handler (The Bridge)**: Validates **Security** (is the user allowed?) and **Data Integrity** (is the email valid?).
3.  **Mongoose Models (The Blueprint)**: Defines the **Structure** and **Rules** of the data (e.g., "Email must be unique").
4.  **MongoDB (The Vault)**: The persistent **Storage** where everything is kept safe and searchable.
