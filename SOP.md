# OTBL Management System – Standard Operating Procedure (SOP)

**Audience:** All system users (Administrators, Managers, and Operators).
**Purpose:** Provide a complete, step-by-step guide to operating the OTBL (ONGC TERI Biotech Limited) Web Management System – an internal platform for managing clients, offices, sites, and work orders related to oil contamination remediation services (Bioremediation, Restoration, and combined processes).

> Screenshots: Throughout this document you will see placeholders such as
> `📸 [SCREENSHOT: Login screen]`.
> Replace each placeholder by inserting an image of the corresponding screen.
> Recommended image format: PNG, 1280×800 (web view) or 390×844 (mobile view).
> Store screenshots in a folder named `docs/screenshots/` at the project root and reference them with relative paths.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [Getting Started: Login & Logout](#3-getting-started-login--logout)
4. [Dashboard Overview (Home Page)](#4-dashboard-overview-home-page)
5. [Profile Management](#5-profile-management)
6. [User Management (Admin Only)](#6-user-management-admin-only)
7. [Offices & Sites Management](#7-offices--sites-management)
8. [Clients Management](#8-clients-management)
9. [Work Orders – End-to-End Lifecycle](#9-work-orders--end-to-end-lifecycle)
10. [Operator Site Uploads](#10-operator-site-uploads)
11. [Common Tasks – Quick Reference](#11-common-tasks--quick-reference)
12. [Troubleshooting & FAQs](#12-troubleshooting--faqs)
13. [Glossary](#13-glossary)
14. [Where to Add Screenshots – Index](#14-where-to-add-screenshots--index)

---

## 1. System Overview

### 1.1 What is OTBL?
The **OTBL Management System** is the official internal web portal of **ONGC TERI Biotech Limited (OTBL)** — a joint venture specialising in **eco-friendly remediation of oil-contaminated soil and sludge**. The portal digitises the complete project lifecycle, from initial client enquiry through field execution and final billing, replacing paper-based workflows with a single source of truth that is accessible from desktop and mobile browsers.

### 1.2 What problems does it solve?
- **Eliminates paper trails** – job cards, site logs, and expense vouchers are captured digitally and time-stamped.
- **Real-time visibility** – head office can monitor field progress, costs, and completion rates the moment they happen.
- **Centralised SOR (Schedule of Rates)** – every work order is priced from a controlled rate sheet, preventing billing errors.
- **Auditable expense tracking** – every rupee spent at a site is attributed to a category (Contractor / Labour / Material / Equipment / Misc.) and rolled up automatically.
- **Field-to-office evidence chain** – operators upload geo-tagged photos and documents straight from the worksite to SharePoint, instantly viewable by managers.

### 1.3 Core entity model
The system is organised around five interconnected entities. Understanding the hierarchy makes every page in the portal easier to navigate.

```
Client ──► Work Order ──► Work-Order-Sites ──► Activities · Expenses · Operator Uploads
              │                  ▲
              │                  │
            Office ──────────► Sites
                            (physical locations)
```

| Entity | What it represents | Owned / managed by |
|---|---|---|
| **Client** | The customer company commissioning remediation work (e.g. ONGC, IOCL, refineries). | Admin / Manager |
| **Office** | A physical OTBL branch (e.g. *Mumbai Office*) that executes projects in its region. | Admin |
| **Site** | A physical contamination location belonging to an office (e.g. *ONGC Mehsana Pit 14*). | Office Manager |
| **Work Order (WO)** | The formal contract issued for a Client, executed by an Office, against a Schedule of Rates. Bundles many sites, activities, expenses, and completion data. | Admin / Manager |
| **Operator** | Field worker assigned to one or more work-order-sites. Uploads photos / documents and records on-ground evidence. | Office Manager |

### 1.4 Process types supported
Each Work Order is tagged with one of three process types, which determines the activity rows in the Schedule of Rates and the data-entry forms shown on the Site Detail dialog:

| Process | Description | Typical activities |
|---|---|---|
| **Bioremediation** | Biological treatment of oil-contaminated soil using microbial cultures developed by TERI. | Soil sampling, oil-zapping, bio-pile preparation, monitoring |
| **Restoration** | Physical clean-up, excavation, transportation, and refilling. | Excavation, transportation, disposal, refilling |
| **Bioremediation + Restoration (Both)** | Combined workflow — physical site preparation followed by biological treatment. | All of the above |

### 1.5 Key capabilities at a glance
- Role-based access (Admin / Manager / Operator) with office-scoped permissions.
- Per-work-order Schedule of Rates with automatic budget vs. completion vs. expense reconciliation.
- Three-phase activity tracking: **Work Estimate → Order → Completion**.
- Itemised expense entry with built-in category breakdown and net-surplus calculation.
- Mobile-friendly operator upload screen with camera capture and mandatory file descriptions.
- SharePoint integration for secure, long-term storage of field evidence.
- Live dashboards for clients, sites, work orders, and statuses.

### 1.6 Supported devices & browsers
- **Desktop:** Chrome, Edge, or Firefox (latest two versions). Recommended resolution ≥ 1280×800.
- **Mobile:** Chrome (Android) and Safari (iOS) for field operator uploads. Camera capture requires HTTPS and camera permission.
- **Tablet:** Fully supported in landscape orientation for managers reviewing site data on the move.

📸 **[SCREENSHOT: High-level architecture / landing page]** – capture the login screen with the OTBL logo and "Management System Portal" tagline.
📸 **[SCREENSHOT: Entity-relationship diagram]** – optional, useful for new-joiner training decks.

---

## 2. User Roles & Access Levels

The system enforces three roles. Each role sees a different subset of menu items and pages.

| Role | Access Level | Sees in Sidebar |
|---|---|---|
| **Administrator (admin)** | Full system access. Can create / edit / delete any user, office, site, client, or work order. | Overview · User Management · Offices & Sites · Clients · Work Orders · Profile |
| **Manager (manager)** | Office-scoped. Can manage clients, work orders, and sites for offices they belong to. Cannot create users. | Overview · Offices & Sites · Clients · Work Orders · Profile |
| **Operator (operator)** | Site-scoped. Sees only the site(s) or work-order-site(s) they are assigned to – usually used for uploading site documents and photos from the field. | (No sidebar) – routed directly to their assigned site upload page. |

📸 **[SCREENSHOT: Sidebar comparison]** – take three side-by-side screenshots of the sidebar as it appears for Admin, Manager, and Operator users.

> **How to determine your role:** Open the **Profile** page (sidebar → Profile) or look at the top of the **Overview** page – your name and role are shown beside the "Signed in as …" label.

---

## 3. Getting Started: Login & Logout

### 3.1 Logging in
1. Open the application URL in any modern browser (Chrome, Edge, or Firefox).
2. The login screen displays the OTBL logo and a "Welcome Back" card.
3. Enter:
   - **Email** – your registered email address.
   - **Password** – provided by your administrator.
4. Click **Login**.
5. On success you will be redirected:
   - **Admin / Manager** → Overview page (`/dashboard`).
   - **Operator** → directly to their assigned site upload page (`/dashboard/wo-site/<id>`) or a "No dashboard access yet" screen if not yet assigned.

📸 **[SCREENSHOT: Login screen – fields visible, no credentials filled]**
📸 **[SCREENSHOT: Login screen – with validation error message]** (optional)

### 3.2 Logging out
- Sidebar → **Logout** (Account section), **or**
- Profile page → "Log out" button, **or**
- Overview page → top-right **Log out** button.

📸 **[SCREENSHOT: Sidebar with Logout option highlighted]**

### 3.3 Forgot password
Currently passwords are admin-managed. Contact your administrator to reset.

---

## 4. Dashboard Overview (Home Page)

After logging in (admin / manager), the **Overview** page (`/dashboard`) shows:

1. **Access & scope card** – reminds you whether you have full or office-scoped access.
2. **Your profile card** – email, role, user ID.
3. **At-a-glance tiles** – live counters for:
   - Clients · Client contacts · Offices · Sites
   - Work Orders · Pending · Completed · Cancelled
4. **Recent Work Orders table** – the last 8 work orders with code, title, client, office, last update, and status.
5. **Quick Navigation card** – shortcut links to Clients, Work Orders, Offices & Sites, and (for admins) User Management.

📸 **[SCREENSHOT: Overview page – full view showing scope card, stats, recent work orders, and quick navigation]**

---

## 5. Profile Management

**Path:** Sidebar → Profile

You can:
- View your name, email, role, contact number, account status, and join date.
- Update your name and contact number.
- Change your password (current + new password required).

**Steps to update profile:**
1. Click **Profile** in the sidebar.
2. Click the **Edit** (pencil) icon next to the field you want to change.
3. Enter new value.
4. Click **Save**.

**Steps to change password:**
1. Open the **Change Password** card.
2. Enter your current password.
3. Enter your new password (visibility toggle available via the eye icon).
4. Click **Update Password**.

📸 **[SCREENSHOT: Profile page – view mode]**
📸 **[SCREENSHOT: Profile page – edit name/contact mode]**
📸 **[SCREENSHOT: Profile page – change password section]**

---

## 6. User Management (Admin Only)

**Path:** Sidebar → User Management

Visible only to Administrators.

### 6.1 Listing users
The page has two tabs:
- **Show All** – paginated table of every user with name, email, role, status, contact, created date.
- **Categorized** – users grouped by role (Admin / Manager / Operator).

A search-and-filter bar at the top lets you find users by name, email, role, or status.

📸 **[SCREENSHOT: User Management – Show All tab]**
📸 **[SCREENSHOT: User Management – Categorized tab]**
📸 **[SCREENSHOT: User search & filter bar with filters open]**

### 6.2 Creating a new user
1. Click **+ Create User** (top right).
2. Fill in:
   - **Name** (required)
   - **Email** (required, must be unique)
   - **Contact number** (10-digit)
   - **Role** – Admin / Manager / Operator
   - **Password** – type or click the **Generate** button to auto-create a strong one.
3. Click **Create**.
4. A confirmation screen shows the new credentials with **Copy** buttons next to each field – share these securely with the new user.

📸 **[SCREENSHOT: Create User dialog – empty form]**
📸 **[SCREENSHOT: Create User dialog – credentials confirmation screen with copy buttons]**

### 6.3 Editing a user
1. From the user table, click the **Edit** icon on the user's row.
2. Update fields as needed.
3. Click **Save**.

### 6.4 Deactivating / activating a user
Toggle the **Status** switch on the user row (active ⇄ inactive). Inactive users cannot log in.

📸 **[SCREENSHOT: User row with status toggle highlighted]**

---

## 7. Offices & Sites Management

**Path:** Sidebar → Offices & Sites

An **Office** is a physical branch (e.g. *Mumbai Office*). Each office owns **Sites** (physical locations where work is performed) and **Members** (managers / operators assigned to that office).

### 7.1 Office list
The page shows all offices as cards. Each card displays:
- Office name, address, status (active/inactive)
- Site count, member count
- Quick links: **View details**, **Manage members**

A filter row supports search, status filter, and reset.

📸 **[SCREENSHOT: Offices & Sites – list of office cards]**

### 7.2 Creating an office
1. Click **+ Create Office** (top right).
2. Fill in office name, contact, address, city, state, pincode.
3. Click **Create**.

📸 **[SCREENSHOT: Create Office dialog]**

### 7.3 Office Details dialog
Click **View details** on any office card to open the Office Details dialog. It contains:
- **Office info card** – address, contact info, status.
- **Sites table** – paginated list of sites belonging to this office, with name, address, status, and assigned operators.
- **Search bar** for sites within this office.

From here you can:
- **Add a new site** to this office.
- **Open a site** to view assigned operators.
- **Remove an operator** from a site.

📸 **[SCREENSHOT: Office Details dialog – sites table view]**
📸 **[SCREENSHOT: Office Details dialog – operator chip with remove button]**

### 7.4 Creating a site
1. Inside the Office Details dialog, click **+ Add Site**.
2. Enter:
   - Site name, address, city, state, pincode
   - (Optional) initial operators to assign
3. Click **Create**.

📸 **[SCREENSHOT: Create Site dialog]**

### 7.5 Managing office members
1. From the office card, click **Manage Members**.
2. Add a user (manager / operator) by searching their name or email.
3. Set their role within this office.
4. Remove members by clicking the trash icon.

📸 **[SCREENSHOT: Manage Office Members dialog]**

---

## 8. Clients Management

**Path:** Sidebar → Clients

### 8.1 Clients & Contacts tabs
The Clients page has two tabs at the top right:
- **Clients** – list of all client companies (with count badge).
- **Contacts** – list of individual contact persons (with count badge).

A search-and-filter bar lets you narrow down by name, email, or other fields.

📸 **[SCREENSHOT: Clients page – Clients tab with cards]**
📸 **[SCREENSHOT: Clients page – Contacts tab]**

### 8.2 Creating a client
1. Click **+ Create Client**.
2. Enter company name, GSTIN (optional), address, city, state, pincode.
3. Click **Create**.

📸 **[SCREENSHOT: Create Client dialog]**

### 8.3 Creating a client contact
1. Click **+ Create Contact** (visible on the Contacts tab).
2. Pick the client from the dropdown.
3. Enter name, designation, email, phone.
4. Click **Create**.

📸 **[SCREENSHOT: Create Contact dialog]**

### 8.4 Client detail page
Click any client card to open the **Client Detail** page (`/dashboard/client/<id>`). This page shows:
- **Client info card** – address, GST, contacts, status. Click **Edit details** to update.
- **Proposals & Work Orders section** – the proposals submitted for this client and their work orders.

From here you can create a new proposal / work order for the client.

📸 **[SCREENSHOT: Client Detail page – full view]**
📸 **[SCREENSHOT: Client Detail page – edit client dialog]**
📸 **[SCREENSHOT: Client Detail page – proposals section]**

---

## 9. Work Orders – End-to-End Lifecycle

**Path:** Sidebar → Work Orders (`/dashboard/work-order`)

The Work Orders module is the heart of the system. It tracks the work from creation to billing.

### 9.1 Work Order list
- A paginated list/table of all work orders within your scope.
- Search bar + filters (status: pending / completed / cancelled, office filter, ordering).
- Click any row to open the Work Order Detail page.

📸 **[SCREENSHOT: Work Order list page]**
📸 **[SCREENSHOT: Work Order search & filter open]**

### 9.2 Creating a Work Order
Work orders are usually created from the **Client Detail** page (Section 8.4), inside the Proposals & Work Orders area.

1. Open a Client → click **+ Create Work Order**.
2. Fill in:
   - **Title**, **Code** (auto-generated), **Description**
   - **Process Type** – Bioremediation / Restoration / Both
   - **Office** – pick the executing office
   - **Start date**, **End date**
   - **Rate contract number**, **Agreement number** (optional)
3. Click **Save**. The work order opens in the detail view.

📸 **[SCREENSHOT: Create Work Order form]**

### 9.3 Work Order Detail page
Path: `/dashboard/work-order/<id>`

This page has several sections:

**A. Work Order Details Card** – header with code, title, client, office, dates, status, and high-level statistics:
- Total sites · Completed sites
- Total budget amount · Total completion amount · Budget utilization %
- Total expenses · Net surplus · Expenses by type

**B. Work Order Sites section** – grid (Card view) or Table view of all sites attached. Use the **Card / Table** toggle at the top.

**C. Action buttons (top right):**
- **View Schedule of Rates** – open the SOR dialog.
- **View All Expenses** – open the expenses dialog.
- **Operator Uploads (N)** – all files uploaded by field operators across this work order's sites.
- **+ Create Site** – attach a new site to this work order.

**D. Schedule of Rates table** – at the bottom, shows each activity (e.g. *Excavation*, *Transportation*, *Bioremediation*) with rate, unit, estimated quantity, and total cost.

📸 **[SCREENSHOT: Work Order Detail page – top section (header + stats)]**
📸 **[SCREENSHOT: Work Order Detail page – Sites in card view]**
📸 **[SCREENSHOT: Work Order Detail page – Sites in table view]**
📸 **[SCREENSHOT: Schedule of Rates table]**

### 9.4 Adding a site to a Work Order
1. On the Work Order Detail page, click **+ Create Site**.
2. Choose how to attach the site:
   - Pick an **existing site** from the office, **or**
   - Create a **new site** inline.
3. Enter:
   - Job number · Start/end date
   - Activity type (in-situ / ex-situ)
   - Metric tonnes / rate / budget amount
4. Click **Create**.

📸 **[SCREENSHOT: Create Work-Order-Site dialog – step 1 (choose existing or new)]**
📸 **[SCREENSHOT: Create Work-Order-Site dialog – step 2 (form fields)]**

### 9.5 Site Detail dialog (inside a Work Order)
Click any site card or row to open the Site Detail dialog. Tabs include:

- **Details** – site address, dates, activity type, operators assigned.
- **Activities** – per-phase data entry for each activity from the Schedule of Rates:
  - **Work Estimate** phase – planned quantities.
  - **Order** phase – ordered quantities.
  - **Completion** phase – actual completed quantities (this drives `total_completion_amount`).
- **Bioremediation** (visible for bioremediation work orders) – special forms for bio samples & oil zapping data.
- **Expenses** – itemised list of expenses incurred at this site, with the option to **+ Add Expense**.
- **Operator Uploads** – the documents uploaded by the field operator(s) for this site (read-only on this dialog; managed via the operator upload screen, Section 10).

📸 **[SCREENSHOT: Site Detail dialog – Details tab]**
📸 **[SCREENSHOT: Site Detail dialog – Activities tab with phases]**
📸 **[SCREENSHOT: Site Detail dialog – Bioremediation tab]**
📸 **[SCREENSHOT: Site Detail dialog – Expenses tab]**
📸 **[SCREENSHOT: Add Expense dialog]**
📸 **[SCREENSHOT: Site Detail dialog – Operator Uploads]**

### 9.6 Editing activity submissions
Each row in the **Activities** tab has an **Edit** (pencil) icon. Click it to amend a previously submitted quantity. The change is reflected immediately in the work order statistics.

📸 **[SCREENSHOT: Activity row with Edit icon highlighted]**

### 9.7 Work Order expenses (all-work-order view)
From the Work Order Detail page, click **View All Expenses**:
- Aggregates every expense entered across every site of this work order.
- Grouped by expense type (Contractor / Labour / Material / Equipment / Misc).
- Shows totals, exceeded totals, and the net surplus.

📸 **[SCREENSHOT: Work Order Expenses dialog]**

### 9.8 Completing or cancelling a Work Order
A work order is auto-marked **Completed** when every site reaches its full estimated quantity (this is calculated; see `getEffectiveWorkOrderStatus`). To **cancel** a work order:
1. Open the Work Order Detail page.
2. Click **Cancel Work Order** (admin/manager only).
3. Enter a **cancellation reason** and confirm.

⚠️ Once a Work Order is **Completed**, you cannot add new sites to it.

📸 **[SCREENSHOT: Cancel Work Order dialog with reason field]**

---

## 10. Operator Site Uploads

**Audience:** Operators (also visible to admins/managers via the Work Order Detail page).

### 10.1 Operator landing page
When an operator logs in, they are routed automatically to one of:
- A single site upload page (`/dashboard/wo-site/<id>`) if they have one assignment.
- A list of their assigned work-order sites if multiple.

📸 **[SCREENSHOT: Operator landing page – list of assigned sites]**
📸 **[SCREENSHOT: Operator landing page – auto-redirect to single site]**

### 10.2 Uploading site documents and photos
On the work-order-site page, the operator can:
1. Click **Select files** to pick one or more files from the device, **or**
2. Click **Take photo** to open the camera (mobile / laptop).
3. Each selected file appears under **Pending upload** with a mandatory **Description** field.
4. Add a short description for each file (e.g. *"Excavation start – north side"*).
5. Click **Upload all**. Files are sent to SharePoint and recorded in the system.
6. Uploaded files appear under **Uploaded** with the operator's name, date, and an **External link** to open in SharePoint.

To **delete** a file: click the trash icon next to it and confirm.

📸 **[SCREENSHOT: Operator upload page – empty state]**
📸 **[SCREENSHOT: Operator upload page – pending files with description boxes]**
📸 **[SCREENSHOT: Operator upload page – uploading progress bar at 50%]**
📸 **[SCREENSHOT: Operator upload page – uploaded files grid]**
📸 **[SCREENSHOT: Operator upload page – delete confirmation]**

### 10.3 Admin / Manager view of operator uploads
- **Per Work Order:** Work Order Detail page → **Operator Uploads (N)** button.
- **Per Site:** Site Detail dialog → **Operator Uploads** tab.

📸 **[SCREENSHOT: Work Order Operator Uploads dialog]**

---

## 11. Common Tasks – Quick Reference

| Task | Path / Steps |
|---|---|
| Onboard a new manager | User Management → + Create User → role = Manager → share credentials → Offices & Sites → Manage Members → add user |
| Onboard a new operator | User Management → + Create User → role = Operator → share credentials → Open the relevant site → assign operator |
| Start a new project for an existing client | Clients → open client → + Create Work Order → fill details → + Create Site → attach SOR rates |
| Record day-to-day completion | Work Order → open site → Activities tab → fill Completion phase quantities → Save |
| Capture a site expense | Work Order → open site → Expenses tab → + Add Expense |
| Field operator daily upload | Login → upload page opens → take photo / pick file → description → Upload all |
| Cancel a work order | Work Order Detail → Cancel Work Order → enter reason → confirm |
| Reset a user's password | Profile (the user) → Change Password, or admin re-create credentials and share |

---

## 12. Troubleshooting & FAQs

**Q. I logged in but see "No dashboard access yet".**
A. You are logged in as an operator but no site assignment exists yet. Ask your administrator to assign you to a site via Offices & Sites → Office Details → site → Operators.

**Q. I can't see the User Management menu.**
A. Only Administrators see User Management. Check your role on the Profile page.

**Q. I can't add a new site to a Work Order.**
A. Check the work order's status – if it is **Completed**, sites cannot be added. Either reopen an existing site or create a new work order.

**Q. Upload failed.**
A. (a) Check internet connection. (b) Ensure file size is reasonable (< 50 MB). (c) Make sure a Description is entered for every pending file – uploads are blocked until each file has one.

**Q. The page kicked me back to login mid-session.**
A. Your session token has expired. Log in again. If this happens repeatedly, clear browser cookies for the site.

**Q. I see "UNAUTHORIZED" / "FORBIDDEN" in a red toast.**
A. Your role does not allow that action. Contact your administrator.

📸 **[SCREENSHOT: Common error toast – session expired]**
📸 **[SCREENSHOT: "No dashboard access yet" screen]**

---

## 13. Glossary

- **Work Order (WO):** A contract with a client to perform remediation work, linked to one office and many sites.
- **Schedule of Rates (SOR):** The per-activity rate sheet attached to a work order.
- **Activity Phase:** Each activity progresses through **Work Estimate → Order → Completion** phases, each storing a quantity.
- **Insitu / Exsitu:** Whether the remediation is performed at the contaminated location or off-site.
- **Bioremediation:** Treatment of oil-contaminated soil using biological agents (the core service).
- **Operator Upload:** A file (photo or document) uploaded by a field operator for a specific work-order-site, stored in SharePoint.
- **GSTIN:** The GST identification number of a client.
- **Net Surplus:** Total income (completion amount) minus total expenses for a work order.

---

## 14. Where to Add Screenshots – Index

Below is the complete list of screenshot placeholders used in this SOP. Capture each in order and replace the corresponding line.

1. High-level architecture / landing page (Section 1)
2. Sidebar comparison: Admin / Manager / Operator (Section 2)
3. Login screen – empty (Section 3.1)
4. Login screen – with validation error (Section 3.1, optional)
5. Sidebar with Logout highlighted (Section 3.2)
6. Overview page – full view (Section 4)
7. Profile page – view mode (Section 5)
8. Profile page – edit mode (Section 5)
9. Profile page – change password (Section 5)
10. User Management – Show All tab (Section 6.1)
11. User Management – Categorized tab (Section 6.1)
12. User search & filter open (Section 6.1)
13. Create User dialog – empty form (Section 6.2)
14. Create User dialog – credentials confirmation (Section 6.2)
15. User row with status toggle (Section 6.4)
16. Offices & Sites – office card list (Section 7.1)
17. Create Office dialog (Section 7.2)
18. Office Details dialog – sites table (Section 7.3)
19. Office Details dialog – operator chip with remove (Section 7.3)
20. Create Site dialog (Section 7.4)
21. Manage Office Members dialog (Section 7.5)
22. Clients page – Clients tab (Section 8.1)
23. Clients page – Contacts tab (Section 8.1)
24. Create Client dialog (Section 8.2)
25. Create Contact dialog (Section 8.3)
26. Client Detail page – full (Section 8.4)
27. Client Detail page – Edit client (Section 8.4)
28. Client Detail page – Proposals section (Section 8.4)
29. Work Order list page (Section 9.1)
30. Work Order search & filter open (Section 9.1)
31. Create Work Order form (Section 9.2)
32. Work Order Detail – header + stats (Section 9.3)
33. Work Order Detail – Sites in card view (Section 9.3)
34. Work Order Detail – Sites in table view (Section 9.3)
35. Schedule of Rates table (Section 9.3)
36. Create Work-Order-Site dialog – step 1 (Section 9.4)
37. Create Work-Order-Site dialog – step 2 (Section 9.4)
38. Site Detail dialog – Details tab (Section 9.5)
39. Site Detail dialog – Activities tab (Section 9.5)
40. Site Detail dialog – Bioremediation tab (Section 9.5)
41. Site Detail dialog – Expenses tab (Section 9.5)
42. Add Expense dialog (Section 9.5)
43. Site Detail dialog – Operator Uploads (Section 9.5)
44. Activity row with Edit icon highlighted (Section 9.6)
45. Work Order Expenses dialog (Section 9.7)
46. Cancel Work Order dialog (Section 9.8)
47. Operator landing – list of assigned sites (Section 10.1)
48. Operator landing – auto-redirect to single site (Section 10.1)
49. Operator upload – empty state (Section 10.2)
50. Operator upload – pending files with descriptions (Section 10.2)
51. Operator upload – upload progress (Section 10.2)
52. Operator upload – uploaded files grid (Section 10.2)
53. Operator upload – delete confirmation (Section 10.2)
54. Work Order Operator Uploads dialog (Section 10.3)
55. Common error toast – session expired (Section 12)
56. "No dashboard access yet" screen (Section 12)

---

**End of SOP** — Version 1.0
For technical issues that block your work, contact the system administrator at `itadmin@teri.res.in`.
