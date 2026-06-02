# OTBL Management System – Standard Operating Procedure (SOP)

**Audience:** All web portal users — Administrators, Office Managers, Office Operators, Site Operators, and Viewers.
**Purpose:** Provide a complete, step-by-step guide to operating the OTBL (ONGC TERI Biotech Limited) Web Management System — an internal platform for managing clients, offices, sites, proposals, and work orders related to oil-contamination remediation services (Bioremediation, Restoration, and combined processes).
**Scope:** This SOP covers the **web portal** only. (A companion read-only mobile app exists but is not covered here.)

> **About screenshots:** Throughout this document you will see placeholders such as
> `📸 [SCREENSHOT: Login screen]`.
> Replace each placeholder by inserting an image of the corresponding screen.
> Recommended image format: PNG, 1280×800 (web view) or 390×844 (mobile/responsive view).
> Store screenshots in a folder named `docs/screenshots/` at the project root and reference them with relative paths.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Roles & Access Levels](#2-user-roles--access-levels)
3. [Getting Started: Login, Landing & Logout](#3-getting-started-login-landing--logout)
4. [Dashboard / Overview Home Page](#4-dashboard--overview-home-page)
5. [Profile Management](#5-profile-management)
6. [User Management (Admin Only)](#6-user-management-admin-only)
7. [Offices & Sites Management](#7-offices--sites-management)
8. [Clients & Contacts](#8-clients--contacts)
9. [Proposals → Work Orders (Admin Workflow)](#9-proposals--work-orders-admin-workflow)
10. [Work Orders – Detail, Sites & Schedule of Rates](#10-work-orders--detail-sites--schedule-of-rates)
11. [Work-Order-Site Detail – Activities, Expenses & Uploads](#11-work-order-site-detail--activities-expenses--uploads)
12. [Recording Expenses](#12-recording-expenses)
13. [Field Operator Site Uploads](#13-field-operator-site-uploads)
14. [Common Tasks – Quick Reference](#14-common-tasks--quick-reference)
15. [Permissions Matrix](#15-permissions-matrix)
16. [Troubleshooting & FAQs](#16-troubleshooting--faqs)
17. [Glossary](#17-glossary)
18. [Where to Add Screenshots – Index](#18-where-to-add-screenshots--index)

---

## 1. System Overview

### 1.1 What is OTBL?
The **OTBL Management System** is the official internal web portal of **ONGC TERI Biotech Limited (OTBL)** — a joint venture specialising in **eco-friendly remediation of oil-contaminated soil and sludge**. The portal digitises the complete project lifecycle, from initial client proposal through field execution, expense tracking, and final reconciliation, replacing paper-based workflows with a single source of truth accessible from desktop and mobile browsers.

### 1.2 What problems does it solve?
- **Eliminates paper trails** – proposals, site activity sheets, and expense vouchers are captured digitally and time-stamped.
- **Real-time visibility** – head office can monitor field progress, completion, and costs as they happen.
- **Centralised Schedule of Rates (SOR)** – every work order is priced from a controlled rate sheet (with fixed 18% GST), preventing billing errors.
- **Auditable expense tracking** – every rupee spent at a site is attributed to an activity and a category (Contractor / Labour / Material / Equipment / Miscellaneous) and rolled up into a per-site and per-work-order Profit & Loss view.
- **Field-to-office evidence chain** – field operators upload geo-relevant photos and documents straight from the worksite to SharePoint, instantly viewable by the office.
- **Controlled approvals** – proposals and work orders follow an admin-gated approval workflow so nothing goes live without sign-off.

### 1.3 Core entity model
The system is organised around a small set of interconnected entities. Understanding the hierarchy makes every page easier to navigate.

```
Client ──► Proposal ──► Work Order ──► Work-Order-Site ──► Activities · Expenses · Operator Uploads
   │          │             │                ▲
   │          │             │                │
   │        Office ◄────────┘             Site (master physical location)
   │          ▲                              ▲
   └──────────┴── Offices own Sites and have Members (office manager + operators)
```

| Entity | What it represents | Created / controlled by |
|---|---|---|
| **Client** | The customer company commissioning remediation work (e.g. ONGC, IOCL, refineries). | Admin / Office staff |
| **Office** | A physical OTBL branch (e.g. *Mumbai Office*) that executes projects in its region. Owns sites and has members. | **Admin** (create); membership managed by Admin / Office Manager |
| **Site** | A reusable master physical location belonging to an office (e.g. *ONGC Mehsana Pit 14*). | Admin / Office Manager |
| **Proposal** | A formal proposal filed for a client + office, awaiting approval. The precursor to a work order. | **Admin only** |
| **Work Order (WO)** | The contract created from an approved proposal, priced against a Schedule of Rates. Bundles many work-order-sites, activities, and expenses. | **Admin only** |
| **Work-Order-Site** | A site attached to a specific work order, with its own job number, dates, activities, expenses, and operator uploads. | Office Manager / Admin (and office staff for linking existing sites) |

> **Site vs. Work-Order-Site:** A **Site** is a reusable master location owned by an office. A **Work-Order-Site** is that site *attached to one specific work order*, carrying the job details, activity entries, expenses, and uploads for that engagement. The same master site can appear under more than one work order.

### 1.4 Process types supported
Each Work Order is tagged with one of three process types, which determines the activities available in its Schedule of Rates and the forms shown on the Work-Order-Site detail dialog:

| Process | Internal value | Typical activities |
|---|---|---|
| **Bioremediation** | `bioremediation` | Bioremediation of oil-contaminated soil, plus bio-sample & oil-zapping monitoring |
| **Restoration** | `restoration` | Cleaning soil area, lifting oily slush / recovery of oil, excavation, transportation, refilling |
| **Bioremediation & Restoration (Both)** | `bioremediation_restoration` | All of the above; the process type is chosen per site |

The full activity catalogue is: *Cleaning Up Soil Area · Lifting Oily Slush / Recovery of Oil · Excavation Oil Contaminated Soil · Transportation Contaminated Soil · Refilling Excavated Oil Contaminated Soil Land · Bioremediation Oil Contaminated Soil.*
Units of measure: **m² (Square Meter), m³ (Cubic Meter), MT (Metric Ton)**. GST is fixed at **18%**.

### 1.5 Key capabilities at a glance
- Five-role, role-based access with office-scoped permissions and a read-only Viewer role.
- Admin-gated **Proposal → Work Order** approval workflow.
- Per-work-order **Schedule of Rates** with automatic budget vs. completion vs. expense reconciliation.
- Two-phase activity tracking per site: **Estimate / sub-WO → Completion**.
- Itemised expense entry with category breakdown, contractor tracking, over-budget ("Exceeded") handling, and per-site **Profit & Loss**.
- Browser-based field operator upload workspace with camera capture and mandatory file descriptions.
- SharePoint integration for secure, long-term storage of proposals, work orders, expenses, and field evidence.
- Live dashboards for clients, sites, work orders, and statuses, scoped to each user's access.

### 1.6 Supported devices & browsers
- **Desktop:** Chrome, Edge, or Firefox (latest two versions). Recommended resolution ≥ 1280×800.
- **Mobile browser:** Chrome (Android) and Safari (iOS) for field operator uploads. Camera capture requires HTTPS and camera permission.
- **Tablet:** Fully supported in landscape orientation.

📸 **[SCREENSHOT: Login / landing page]** – capture the login screen with the OTBL logo and "ONGC TERI Biotech Limited" title.
📸 **[SCREENSHOT: Entity-relationship diagram]** – optional, useful for new-joiner training decks.

---

## 2. User Roles & Access Levels

The system enforces **five roles**. Each role sees a different subset of pages, and most data is additionally **scoped to the offices or sites a user is assigned to**.

### 2.1 The five roles

| Role | Internal value | Level | What they can do |
|---|---|---|---|
| **Administrator** | `admin` | 4 | Full, unrestricted access. The only role that can create users, create offices, appoint office managers, and create / approve / cancel proposals and work orders. |
| **Office Manager** | `office_manager` | 3 | Office-scoped. Manages office operator membership, creates sites, adds sites to work orders, and records activities/expenses for their office(s). **Read-only on proposals and work orders** (cannot create, approve, or cancel them). |
| **Office Operator** | `office_operator` | 2 | Office-scoped. A member of one or more offices; can view and work within their assigned office(s) but cannot manage membership or the office-manager seat. **Read-only on proposals and work orders.** |
| **Site Operator** | `site_operator` | 2 | Field user assigned to specific work-order-sites. Used to upload photos / documents from the worksite. No general dashboard navigation. |
| **Viewer** | `viewer` | 1 | **Read-only** across everything visible to them. Can open pages and view data but cannot save any change (all write actions are blocked). |

> **Two kinds of "role".** Every user has one **global role** (above), stored on their account. Separately, when a user is added to an **office**, they hold an **office-scoped role** within that office — either **office manager** or **office operator**. These are independent: a user can be the manager of one office and merely an operator in another. Office-level authority (e.g. managing members) is always decided per-office, not from the global role alone.

📸 **[SCREENSHOT: User role badges in the User Management table]** – shows the colour-coded role chips.

### 2.2 Membership model
- **Office Operators** are added to **offices** (they cannot be assigned to individual sites).
- **Site Operators** are assigned to **work-order-sites** (they are not office members).
- The **office manager seat** is filled by a user whose global role is *Office Manager*, and **only an Administrator can appoint or remove it**.

### 2.3 Dashboard "modes" — what each user lands on
After login, the portal places each user into one of four UI modes based on their role and assignments:

| Mode | Who | Navigation | Lands on |
|---|---|---|---|
| **Full access** | Admin, Viewer | Full sidebar | Overview (`/dashboard`) |
| **Office-scoped** | Office Managers / Office Operators assigned to ≥ 1 office | Full sidebar; figures limited to assigned offices | Overview (`/dashboard`) |
| **Field upload** | Site Operators with work-order-site assignments | **No sidebar** | Their site upload workspace (`/dashboard/wo-site`, or straight into the site if they have only one) |
| **Site assignment / no access** | Users with no office and no site assignment yet | **No sidebar** | "No dashboard access yet" screen (`/dashboard/site-assigned`) |

> **How to check your role and scope:** Open the **Overview** page — a banner at the top states your access level ("Full access", "Office-scoped", "Field upload", or "Site assignment") and your status. Your role is also shown on the **Profile** page.

📸 **[SCREENSHOT: Sidebar comparison]** – take screenshots of the sidebar for Admin vs. an office-scoped user (and note that Site Operators / no-access users see no sidebar).

---

## 3. Getting Started: Login, Landing & Logout

### 3.1 Logging in
1. Open the application URL in any modern browser (Chrome, Edge, or Firefox).
2. The login screen displays the OTBL logo and the "ONGC TERI Biotech Limited" title.
3. Enter:
   - **Email** – your registered email address.
   - **Password** – provided by your administrator.
4. Click **Login**.
5. On success you are taken to `/dashboard`, and the portal then routes you to the right place for your role (see §3.2).

📸 **[SCREENSHOT: Login screen – fields visible, no credentials filled]**
📸 **[SCREENSHOT: Login screen – with validation error message]** (optional)

### 3.2 Where you land after login
- **Admin / Viewer** → **Overview** page (full access).
- **Office Manager / Office Operator** (assigned to an office) → **Overview** page (figures limited to your office(s)).
- **Site Operator** with work-order-site assignment(s) → your **site upload workspace** (`/dashboard/wo-site`). If you have exactly one assignment, you are taken straight into that site.
- **No assignment yet** → a **"No dashboard access yet"** screen prompting you to contact your administrator.

### 3.3 Logging out
Depending on your view, **Log out** is available in any of these places:
- **Sidebar → Account section** (office-scoped / admin views).
- **Overview page → top-right Log out button.**
- **Field upload workspace → header Log out button** (Site Operators).
- **"No dashboard access yet" screen → Log out button.**

📸 **[SCREENSHOT: Sidebar with Logout option highlighted]**

### 3.4 Forgot password
Passwords are administrator-managed. To reset, contact your administrator. (You can change your *own* password from the Profile page once logged in — see §5.)

---

## 4. Dashboard / Overview Home Page

After logging in, full-access and office-scoped users see the **Overview** page (`/dashboard`):

1. **Access banner** – states your scope (Full access / Office-scoped / Field upload / Site assignment), your status badge, and your email.
2. **"At a glance" statistics** – eight tiles:
   - Clients · Client Contacts · Offices · Sites
   - Total Work Orders · Pending · Completed · Cancelled
   (For office-scoped users these counts reflect only your assigned office(s).)
3. **Recent Work Orders table** – the most recent work orders with code (clickable), title, client, office, last updated, and a colour-coded status badge. A **View all** link opens the Work Orders page.
4. **Quick navigation** – shortcut cards to Clients, Work Orders, Offices & Sites, and (admins only) User Management.

📸 **[SCREENSHOT: Overview page – full view showing access banner, stats, recent work orders, and quick navigation]**

---

## 5. Profile Management

**Path:** Sidebar → Profile (or the footer Account section).

Every logged-in user (except Viewers, who cannot save changes) can manage their own profile.

The page shows:
- **Profile header** – avatar (initials), your name, a **role badge**, a **status badge** (Active / Inactive), and your "member since" date.
- **Account details** – name, email, contact number, and join date.
- **Security** – change-password form.

**To update your details:**
1. Click **Profile**.
2. In the **Account details** card, click the **Edit** (pencil) icon.
3. Update your **Name**, **Email**, and/or **Contact Number**.
4. Click **Save Changes**.

> **Note:** Your **role** and **account status** can only be changed by an administrator — they are read-only on your own profile.

**To change your password:**
1. Open the **Change Password** (Security) card.
2. Enter your **Current password**.
3. Enter and confirm your **New password** (use the eye icon to toggle visibility).
4. Click to update. You will see a "Password changed" confirmation.

📸 **[SCREENSHOT: Profile page – view mode]**
📸 **[SCREENSHOT: Profile page – edit name/contact mode]**
📸 **[SCREENSHOT: Profile page – change password section]**

---

## 6. User Management (Admin Only)

**Path:** Sidebar → User Management. **Visible only to Administrators.**

### 6.1 Listing users
The page has two tabs:
- **Show All** – a paginated table of every user.
- **Categorized** – users grouped by role (Office Manager / Office Operator / Site Operator).

A search-and-filter bar lets you:
- **Search** by name, email, or contact number.
- **Filter by role** – All Roles / Office Manager / Office Operator / Site Operator / Viewer.
- **Filter by status** – All / Active / Inactive.
- **Reset** all filters.

**Table columns:** Status · Name (sortable: Latest / Oldest / A–Z / Z–A) · Email · Contact · Role (colour-coded badge) · Offices/Sites (assignment badges) · Actions (Edit). Use **Load More** to page through results.

📸 **[SCREENSHOT: User Management – Show All tab]**
📸 **[SCREENSHOT: User Management – Categorized tab]**
📸 **[SCREENSHOT: User search & filter bar with filters open]**

### 6.2 Creating a new user
1. Click **+ Create User**.
2. Fill in:
   - **Name** (required)
   - **Email** (required, must be unique)
   - **Password** (required — type it; use the eye icon to show/hide)
   - **Contact number** (optional, 10-digit)
   - **Role** (required) — selectable options are **Office Manager, Office Operator, Site Operator, Viewer**.
     > Administrators cannot be created through this form. New admin accounts are provisioned outside the standard UI.
3. Click **Create**.
4. A **credentials confirmation** screen appears showing the new email and password with **Copy** buttons (and a **Copy All Credentials** button).
   > ⚠️ **The password is shown only once and cannot be retrieved later.** Copy and share it securely with the new user before clicking **Done**.

📸 **[SCREENSHOT: Create User dialog – empty form]**
📸 **[SCREENSHOT: Create User dialog – credentials confirmation screen with copy buttons]**

### 6.3 Editing a user
1. In the user table, open the row's **Actions** menu → **Edit User**.
2. Update Name, Email, Contact Number, and Role as needed (the password field is not shown when editing).
3. Click **Update**.

### 6.4 Account status
Account **status** (Active / Inactive) is an administrator-controlled attribute. **Inactive users cannot log in.** If a user needs to be activated or deactivated, contact an administrator.

---

## 7. Offices & Sites Management

**Path:** Sidebar → Offices & Sites.

An **Office** is a physical OTBL branch. Each office **owns Sites** (reusable master locations) and **has Members** (one office manager + any number of office operators).

### 7.1 Office list
Offices are shown as cards. Each card displays:
- Office name and status (Active / Inactive).
- An **Info** panel: address, email, GST number, the assigned manager (if any), site count, operator count, and creation date.
- A **site count** badge and an arrow to open **Office Details**.
- **Members** and **Create Site** buttons — **shown only if you can manage this office** (i.e. you are an Administrator or *this* office's manager).
- A short list of the office's sites (up to six), with a "+N more sites" note when there are more.

A filter row supports search (name / address / contact) and status filtering, with a reset.

📸 **[SCREENSHOT: Offices & Sites – list of office cards]**

### 7.2 Creating an office (Admin only)
1. Click **+ Create Office**.
2. Fill in (all required): **Office Name, Email, Address, State, City, Pincode, GST Number.**
3. *(Optional)* Assign members at creation:
   - **Manager** – a single user whose global role is *Office Manager*.
   - **Office Operators** – one or more users whose global role is *Office Operator*.
   > Only Office Operators may be added as operators; Site Operators belong to sites, not offices.
4. Click **Create Office**.

📸 **[SCREENSHOT: Create Office dialog – info fields]**
📸 **[SCREENSHOT: Create Office dialog – member assignment tabs]**

### 7.3 Office Details dialog
Click the arrow on an office card to open **Office Details**. It contains:
- **Office info** – address, city/state/pincode, email, GST, status, and manager.
- **Sites table** – paginated list of the office's sites with status, name, address, pincode, created date, and a **Work Orders & Operators** button.
- A **search** box for sites within this office, and **Load More** paging.

📸 **[SCREENSHOT: Office Details dialog – sites table]**

### 7.4 Creating a site
**Who:** Administrator or the office's manager (the **Create Site** button is hidden otherwise).
1. From the office card (or details), click **Create Site**.
2. Enter (all required): **Site Name, Address, City, State, Pincode.**
3. Click **Create Site**.

> Operators are **not** assigned at site-creation time. Site Operators are assigned later, per work-order-site (see §11). Office membership is managed separately (§7.5).

📸 **[SCREENSHOT: Create Site dialog]**

### 7.5 Managing office members
**Who:** Administrator or the office's manager (the **Members** button is hidden otherwise).

Open **Members** on an office card. The dialog has two parts:

**A. Currently assigned**
- **Manager** row – shows the current manager (or "None"). The **remove** control is **visible only to Administrators**.
- **Office Operators** row – lists current operators, each with a remove control (usable by an Administrator *or* the office manager).

**B. Add members (tabs)**
- **Managers tab** – **visible to Administrators only.** Search the Office-Manager pool and **Assign** a manager. An office can have **at most one** manager; to change it, remove the existing one first.
- **Office Operators tab** – visible to Administrators and the office manager. Search the Office-Operator pool and **Add** operators.

> **Key rule (enforced in the UI *and* on the server):** Only an **Administrator** can appoint or remove an office's **manager**. Office managers can only add or remove **office operators**. Office operators cannot manage membership at all.

📸 **[SCREENSHOT: Manage Office Members dialog – Admin view (Managers + Operators tabs)]**
📸 **[SCREENSHOT: Manage Office Members dialog – Office Manager view (Operators tab only)]**

---

## 8. Clients & Contacts

**Path:** Sidebar → Clients.

### 8.1 Clients & Contacts tabs
The page has two tabs (each with a count badge):
- **Clients** – all client companies.
- **Contacts** – all individual contact persons across clients.

A search-and-filter bar narrows the lists. Each client card shows name, email, contact number, address, status, and roll-up counts (contacts, work orders, proposals, sites).

📸 **[SCREENSHOT: Clients page – Clients tab with cards]**
📸 **[SCREENSHOT: Clients page – Contacts tab]**

### 8.2 Creating a client
1. Click **+ Create Client**.
2. Enter (all required): **Name, Address, State, City, Pincode, GST Number, Contact Number, Email.**
3. Add at least one **contact** — either select existing contacts or create new ones inline (contact fields: **Name** and **Contact Number** and **Email** required; **Designation** and **Contact Type** optional).
4. Click **Create**.

📸 **[SCREENSHOT: Create Client dialog]**

### 8.3 Creating a contact
1. On the **Contacts** tab, click **+ Create Contact**.
2. Pick the **Client** (required).
3. Enter **Name**, **Contact Number**, **Email** (required); **Designation** and **Contact Type** are optional.
4. Click **Create**.

📸 **[SCREENSHOT: Create Contact dialog]**

### 8.4 Client detail page
Click a client card to open the **Client Detail** page (`/dashboard/client/<id>`):
- **Header** – client name with an **Edit details** button.
- **Client info card** – full address, GST (masked by default, with a show/hide toggle), linked contacts, and status. A **View Contacts** button lists all contacts.
- **Stats** – total sites, completed sites, total budget, completed-work-order budget, and budget utilization %.
- **Proposals – Work Orders section** – the proposals filed for this client and the work orders created from them (see §9).

📸 **[SCREENSHOT: Client Detail page – full view]**
📸 **[SCREENSHOT: Client Detail page – Edit client dialog]**
📸 **[SCREENSHOT: Client Detail page – Proposals & Work Orders section]**

---

## 9. Proposals → Work Orders (Admin Workflow)

This is the controlled, **admin-gated** core workflow. Office Managers and Office Operators can **view** proposals and work orders filed under their office, but **cannot create, approve, reject, or cancel** them — those actions are **Administrator-only**.

```
Create Proposal (PENDING)  ──►  Approve  ──►  Create Work Order (PENDING, from approved proposal)
        │                                              │
        └──► Reject (REJECTED)                         └──► Approve (sets approval gate) · Cancel (with reason)
```

### 9.1 Creating a proposal (Admin only)
From the Client Detail page (Proposals – Work Orders section):
1. Click to create a proposal.
2. Fill in: **Code, Title, Description, Office** (an active office), **Proposal Submission Date**, and upload the **proposal document** (stored in SharePoint).
3. Save. The proposal is created in **Pending** status.

📸 **[SCREENSHOT: Create Proposal dialog]**

### 9.2 Proposal statuses & approval (Admin only)
A proposal moves through: **Pending → Approved** or **Pending → Rejected**.
- Open a proposal to view its code, title, description, dates, and any linked work order.
- When the proposal is **Pending** and you are an Administrator, **Approve** and **Reject** buttons are shown.
- Only **Pending** proposals can be approved or rejected.

📸 **[SCREENSHOT: Proposal detail dialog – Approve / Reject buttons]**

### 9.3 Creating a work order (Admin only)
A work order is created **from an approved proposal**. The creation dialog has two steps:

**Step 1 – Basic details:**
- **Title** (required), **Work Order Code** (required)
- **Process Type** (required) – Bioremediation / Restoration / Both
- **Agreement Number** (required), **Rate Contract Number** (required)
- **Start Date** (required), **End Date** (required)
- **Handing-over Date** (optional), **Description** (optional)
- **Work order document** upload (required; stored in SharePoint)

**Step 2 – Schedule of Rates (SOR):**
Add one or more activity rows. For each row:
- **Activity** – chosen from the activities valid for the work order's process type.
- **Unit** – m² / m³ / MT.
- **Estimated Quantity** (must be greater than 0).
- **RC Unit Rate**.
- **GST %** – fixed at 18%.
- **Unit Rate (incl. GST)** and **Total Cost** – calculated automatically.
- **Transportation (km)** – optional.

At least one valid activity row is required. On save, the work order is created in **Pending** status.

📸 **[SCREENSHOT: Create Work Order – Step 1 (basic details)]**
📸 **[SCREENSHOT: Create Work Order – Step 2 (Schedule of Rates)]**

### 9.4 Work order approval gate (Admin only)
Separately from its status, a work order carries an **approval gate**. An Administrator can **Approve** a work order to flip this gate (recording who approved it and when). Approving does **not** change the pending/completed status — it marks the work order as signed off / live.

---

## 10. Work Orders – Detail, Sites & Schedule of Rates

**Path:** Sidebar → Work Orders (`/dashboard/work-order`).

### 10.1 Work Order list
A paginated table of all work orders within your scope. Tools:
- **Search** by code, title, agreement number, client, or office.
- **Filters** – status (pending / completed / cancelled), office, and ordering (latest / oldest / title A–Z / Z–A).
- **Columns** – Title (sortable), Code, Client, Office, Agreement Number, Start Date, End Date, and a colour-coded **Status** badge.
- **Load More** paging.

Click a row to open the Work Order Detail page.

📸 **[SCREENSHOT: Work Order list page with filters]**

### 10.2 Work Order Detail page
Path: `/dashboard/work-order/<id>`.

**A. Header card** – code, title, process type, status badge, description, agreement number, RC number, and start/end dates.

**B. Statistics** –
- Total sites · Completed sites
- Total budget amount · Total completion amount · Budget utilization %
- Total expenses · Net surplus · Expenses by type (Contractor / Labour / Material / Equipment / Miscellaneous)

**C. Approval actions (Administrators only, when the WO is not cancelled):**
- **Approve** – flips the approval gate (see §9.4); shown while the WO is not yet approved.
- **Cancel WO** – opens a dialog requiring a **cancellation reason** (up to 1000 characters). Cancellation is terminal.

**D. Sites section** – all work-order-sites attached, shown in a **Card view** or **Table view** (toggle at top), paginated. Click a site to open its detail dialog (§11).

**E. Action buttons:**
- **View Schedule of Rates** – the SOR table (read-only at WO level).
- **View All Expenses** – every expense across all of this WO's sites, grouped by type with totals and net surplus.
- **Operator Uploads (N)** – all files uploaded by field operators across this WO's sites.
- **Create Site** – attach a site to this work order (§11.1).

**F. Schedule of Rates table** – each activity with unit, estimated quantity, RC unit rate, GST %, unit rate (incl. GST), total cost, and transportation km.

📸 **[SCREENSHOT: Work Order Detail – header + statistics]**
📸 **[SCREENSHOT: Work Order Detail – Sites in card view]**
📸 **[SCREENSHOT: Work Order Detail – Sites in table view]**
📸 **[SCREENSHOT: Schedule of Rates table]**
📸 **[SCREENSHOT: Approve / Cancel Work Order actions (admin)]**
📸 **[SCREENSHOT: Work Order Expenses dialog (View All Expenses)]**

### 10.3 How a Work Order becomes "Completed"
Work order status is computed for display as follows:
- If it was **cancelled** in the database → **Cancelled** (terminal).
- If it was explicitly marked **completed** → **Completed**.
- Otherwise → it shows **Completed** automatically once **every Schedule-of-Rates line has completion quantity (summed across all of its sites) that meets or exceeds the estimated quantity**; until then it stays **Pending**.

This means completion is driven by the **Completion** entries you record per site (see §11.3) — as the field work is logged, the work order rolls up toward Completed on its own.

⚠️ **Cancelling a work order requires a reason and is permanent.** Only Administrators can cancel.

📸 **[SCREENSHOT: Cancel Work Order dialog with reason field]**

---

## 11. Work-Order-Site Detail – Activities, Expenses & Uploads

### 11.1 Adding a site to a Work Order
On the Work Order Detail page, click **Create Site**. The dialog is a two-step flow:

**Step 1 – Choose how to attach the site:**
- **Select an existing site** from the office (search and pick), **or**
- **Create a new site** inline (Name, Address, City, State, Pincode).
  > Linking an *existing* site can be done by any office member. **Creating a brand-new site requires the office manager (or an Administrator).**

**Step 2 – Work-order-site details:**
- **Process Type** – for "Both" work orders you choose Bioremediation or Restoration for this site; otherwise it is set automatically.
- **Start Date**, **End Date**.
- **Job Number**, **Joint Estimate Number**, **Area**, **Installation Type** (in-situ / ex-situ), **Land Owner Name**, **Remarks**.
- **Select Activities** – tick the activities (from the work order's Schedule of Rates) that apply to this site.

Click **Create** to attach the work-order-site.

📸 **[SCREENSHOT: Create Work-Order-Site – Step 1 (existing vs new)]**
📸 **[SCREENSHOT: Create Work-Order-Site – Step 2 (details + activity selection)]**

### 11.2 The Site Detail dialog
Click any site card/row on the Work Order Detail page to open the **Site Detail** dialog. It is titled with the site name and shows the work order code/title beneath. The dialog contains:

- **Details card** – site name, address, dates, and status, plus an **Operator Uploads** counter and a button to open the uploads list.
- **Assigned operators section** – the Site Operators assigned to this work-order-site (assigned/removed here by an Administrator or office staff).
- **Three tabs:**

**Tab 1 — Estimate / sub-WO**
Per-activity estimate entry for this site. For each selected activity you record values such as **estimated quantity**, **amount**, and **transportation km**, and you can attach supporting documents for this phase. For **bioremediation** work orders, this tab also surfaces the bioremediation-specific forms (bio samples and oil-zapping data).

**Tab 2 — Expenses & P&L**
The itemised expense list for this site with an **Add Expense** button (§12), plus totals (regular and "exceeded"/over-budget amounts) and the running Profit & Loss.

**Tab 3 — Completion**
Per-activity **completion** entry — the actual quantities completed (this is what drives the work order toward "Completed"; see §10.3). For bioremediation work orders, the completion bio-sample / oil-zapping data is captured here. Below the activities is a **Expense & P&L Summary** showing **Income** (from completion activities), **Total Expenses** (regular + exceeded), and **Net P&L** (surplus or deficit).

📸 **[SCREENSHOT: Site Detail dialog – Estimate/sub-WO tab]**
📸 **[SCREENSHOT: Site Detail dialog – Expenses & P&L tab]**
📸 **[SCREENSHOT: Site Detail dialog – Completion tab with P&L summary]**
📸 **[SCREENSHOT: Site Detail dialog – assigned operators section]**
📸 **[SCREENSHOT: Site Detail dialog – Operator Uploads list]**

### 11.3 Editing activity entries
Activity rows can be amended via their **Edit** (pencil) control. Changes flow immediately into the site totals and the work order statistics (and can move the work order's effective status — see §10.3).

📸 **[SCREENSHOT: Activity row with Edit control]**

---

## 12. Recording Expenses

Expenses are recorded per work-order-site, from the **Expenses & P&L** tab of the Site Detail dialog (§11.2) → **Add Expense**.

**The Add Expense form:**
- **Activity** – **required** when the site has activities; the expense is tied to a specific activity so it can be reconciled against that activity's budget.
- **Quantity** – optional; when an activity is selected the form shows the remaining quota and warns if you exceed it.
- **Expense type** – **optional**; if you don't choose one, the expense is recorded as **Miscellaneous**. Available types: **Contractor Payment, Labour, Material, Equipment, Miscellaneous.** You can add multiple type+amount rows under one expense.
- **Description** – **required** (shared across the rows of one expense).
- **Contractor** – shown only when a row uses **Contractor Payment**: pick an existing contractor or create one inline (Name required; Contact and GST optional).
- **Date** – **required**; **Invoice number** – optional.
- **Notes** – optional free text.
- **Supporting document** – optional upload (PDF, Word, Excel, JPG, PNG; up to 50 MB; stored in SharePoint).

**Exceeded (over-budget) expenses:** When an activity's estimated quantity is fully consumed, the form switches to **Exceeded** mode — the expense is recorded as over-budget and is rolled up separately in the totals and the P&L (shown in orange).

📸 **[SCREENSHOT: Add Expense dialog – activity + type rows]**
📸 **[SCREENSHOT: Add Expense dialog – Exceeded (over-budget) mode]**
📸 **[SCREENSHOT: Add Expense dialog – contractor section]**

---

## 13. Field Operator Site Uploads

**Audience:** Site Operators (also viewable by Administrators / office staff via the Work Order and Site Detail screens).

### 13.1 The operator workspace
A Site Operator who is assigned to one or more work-order-sites lands (after login) in their upload workspace:
- **`/dashboard/wo-site`** lists all assigned work-order-sites as cards (work order code + status, site name, job number, dates, area/location, and an upload count). If they have only one assignment, they go straight into it.
- Clicking a card opens that site's **upload page**.

📸 **[SCREENSHOT: Operator workspace – list of assigned sites]**

### 13.2 Uploading photos and documents
On a work-order-site upload page:
1. Click **Select files** to pick one or more files, **or** **Take photo** to capture directly from the device camera (the camera button uses the rear/environment camera on mobile).
2. Each selected file appears under **Pending upload** with a **mandatory Description** field.
3. Enter a short description for **every** file (e.g. *"Excavation start – north side"*). The **Upload all** button stays disabled until each pending file has a description.
4. Click **Upload all**. Files are sent to SharePoint and recorded against the site. Use **Clear all** or the per-file **✕** to discard pending items.
5. Uploaded files appear under **Uploaded** as a grid — each shows the file name (a link that opens the file in SharePoint), the description, and the uploader's name and date.

To **delete** an uploaded file, use its delete control and confirm.

📸 **[SCREENSHOT: Operator upload page – empty / select files]**
📸 **[SCREENSHOT: Operator upload page – pending files with description boxes]**
📸 **[SCREENSHOT: Operator upload page – upload progress]**
📸 **[SCREENSHOT: Operator upload page – uploaded files grid]**
📸 **[SCREENSHOT: Operator upload page – delete confirmation]**

### 13.3 Where office staff view operator uploads
- **Per work order:** Work Order Detail → **Operator Uploads (N)**.
- **Per site:** Site Detail dialog → **Operator Uploads** (opened from the details card).

📸 **[SCREENSHOT: Work Order Operator Uploads dialog]**

---

## 14. Common Tasks – Quick Reference

| Task | Who | Path / Steps |
|---|---|---|
| Onboard an office manager | Admin | User Management → + Create User → role = **Office Manager** → share credentials → Offices & Sites → office **Members** → Managers tab → Assign |
| Onboard an office operator | Admin (create) / Admin or office manager (assign) | + Create User → role = **Office Operator** → Offices & Sites → office **Members** → Office Operators tab → Add |
| Onboard a site operator | Admin (create) / office staff (assign) | + Create User → role = **Site Operator** → open the relevant Work-Order-Site → assign operator |
| File a proposal for a client | **Admin** | Clients → open client → create proposal → fill details + upload document |
| Approve / reject a proposal | **Admin** | Open the pending proposal → Approve / Reject |
| Create a work order | **Admin** | From an **approved** proposal → Create Work Order → Step 1 details → Step 2 Schedule of Rates |
| Approve (sign off) a work order | **Admin** | Work Order Detail → Approve |
| Attach a site to a work order | Office member (existing site) / Office Manager or Admin (new site) | Work Order Detail → Create Site |
| Record estimate / completion | Office staff | Work Order → open site → Estimate/sub-WO or Completion tab → enter quantities |
| Capture a site expense | Office staff | Work Order → open site → Expenses & P&L → Add Expense (Activity required) |
| Field operator daily upload | Site Operator | Login → upload workspace → Take photo / Select files → description → Upload all |
| Cancel a work order | **Admin** | Work Order Detail → Cancel WO → enter reason → confirm |
| Change your own password | Any (not Viewer) | Profile → Change Password |

---

## 15. Permissions Matrix

| Action | Admin | Office Manager | Office Operator | Site Operator | Viewer |
|---|---|---|---|---|---|
| View data (within scope) | ✔ (all) | ✔ (office) | ✔ (office) | ✔ (assigned sites) | ✔ (read-only) |
| Create / edit users | ✔ | — | — | — | — |
| Edit own profile / password | ✔ | ✔ | ✔ | ✔ | — |
| Create office | ✔ | — | — | — | — |
| Appoint / remove office manager | ✔ | — | — | — | — |
| Add / remove office operators | ✔ | ✔ (own office) | — | — | — |
| Create site | ✔ | ✔ (own office) | — | — | — |
| Create / approve / reject proposal | ✔ | — | — | — | — |
| Create / approve / cancel / delete work order | ✔ | — | — | — | — |
| Add site to a work order (link existing) | ✔ | ✔ | ✔ | — | — |
| Add site to a work order (create new) | ✔ | ✔ | — | — | — |
| Record activities & expenses | ✔ | ✔ | ✔ | — | — |
| Upload field photos/documents | ✔ | ✔ | ✔ | ✔ (assigned sites) | — |

> Viewers can open everything visible to them but **every save/change action is blocked** for them system-wide.

---

## 16. Troubleshooting & FAQs

**Q. I logged in but see "No dashboard access yet."**
A. You have no office or site assignment yet. Office Managers/Operators must be added to an office (Offices & Sites → Members); Site Operators must be assigned to a work-order-site. Contact your administrator.

**Q. I can't see the User Management menu.**
A. Only Administrators see User Management. Check your role on the Profile page.

**Q. I can't create a proposal or work order.**
A. Proposals and work orders are **Administrator-only**. Office Managers and Operators can view them but cannot create, approve, reject, or cancel them.

**Q. I can't appoint or remove the office manager.**
A. Only Administrators can fill or change an office's **manager** seat. Office managers can only add/remove **office operators**.

**Q. I'm an office manager but the "Create Site"/"Members" buttons are missing on an office.**
A. Those controls appear only for an office you actually manage (or for Administrators). Confirm you are the manager of *that* office.

**Q. "Upload all" is disabled.**
A. Every pending file must have a **description** before you can upload. Add a description to each file.

**Q. Upload failed.**
A. Check your internet connection, keep file size reasonable (≤ 50 MB), and ensure a description is set for each file.

**Q. Nothing saves and I only see data — am I a Viewer?**
A. Likely yes. The **Viewer** role is read-only and all write actions are blocked. Check your role on the Profile page.

**Q. The page kicked me back to login mid-session.**
A. Your session expired. Log in again. If it recurs, clear the site's cookies.

**Q. I see "UNAUTHORIZED" or "FORBIDDEN" in a red toast.**
A. Your role/scope doesn't allow that action. Contact your administrator.

📸 **[SCREENSHOT: "No dashboard access yet" screen]**
📸 **[SCREENSHOT: Permission error toast]**

---

## 17. Glossary

- **Global role:** The role on a user's account — Admin, Office Manager, Office Operator, Site Operator, or Viewer.
- **Office-scoped role:** A user's role *within a specific office* (office manager or office operator), independent of their global role.
- **Office:** A physical OTBL branch that owns sites and has members.
- **Site:** A reusable master physical location owned by an office.
- **Work Order (WO):** The contract created from an approved proposal, priced against a Schedule of Rates.
- **Work-Order-Site:** A site attached to a specific work order, carrying that engagement's job details, activities, expenses, and uploads.
- **Proposal:** The admin-created precursor to a work order; statuses Pending → Approved / Rejected.
- **Approval gate (work order):** A sign-off flag (who approved, and when) that is separate from the WO's pending/completed status.
- **Schedule of Rates (SOR):** The per-activity rate sheet attached to a work order (with fixed 18% GST).
- **Activity phases:** Each site records **Estimate / sub-WO** and **Completion** quantities per activity.
- **In-situ / Ex-situ:** Whether remediation is performed at the contaminated location or off-site (the work-order-site's installation type).
- **Exceeded expense:** An expense recorded against an activity whose estimated quantity is fully consumed; tracked as over-budget.
- **Net P&L / Net surplus:** Income (from completion activities) minus expenses, per site and per work order.
- **Operator upload:** A photo or document uploaded by a Site Operator for a work-order-site, stored in SharePoint.
- **Viewer:** A read-only role; can view but cannot change anything.
- **GSTIN / GST number:** The GST identification number of a client or office.

---

## 18. Where to Add Screenshots – Index

Capture each in order and replace the corresponding placeholder.

1. Login / landing page (§1.6)
2. Entity-relationship diagram – optional (§1.6)
3. User role badges in the User Management table (§2.1)
4. Sidebar comparison: Admin vs. office-scoped (§2.3)
5. Login screen – empty (§3.1)
6. Login screen – with validation error (§3.1, optional)
7. Sidebar with Logout highlighted (§3.3)
8. Overview page – full view (§4)
9. Profile page – view mode (§5)
10. Profile page – edit mode (§5)
11. Profile page – change password (§5)
12. User Management – Show All tab (§6.1)
13. User Management – Categorized tab (§6.1)
14. User search & filter open (§6.1)
15. Create User dialog – empty form (§6.2)
16. Create User dialog – credentials confirmation (§6.2)
17. Offices & Sites – office card list (§7.1)
18. Create Office dialog – info fields (§7.2)
19. Create Office dialog – member assignment tabs (§7.2)
20. Office Details dialog – sites table (§7.3)
21. Create Site dialog (§7.4)
22. Manage Office Members – Admin view (Managers + Operators tabs) (§7.5)
23. Manage Office Members – Office Manager view (Operators tab only) (§7.5)
24. Clients page – Clients tab (§8.1)
25. Clients page – Contacts tab (§8.1)
26. Create Client dialog (§8.2)
27. Create Contact dialog (§8.3)
28. Client Detail page – full (§8.4)
29. Client Detail page – Edit client (§8.4)
30. Client Detail page – Proposals & Work Orders (§8.4)
31. Create Proposal dialog (§9.1)
32. Proposal detail dialog – Approve / Reject (§9.2)
33. Create Work Order – Step 1 basic details (§9.3)
34. Create Work Order – Step 2 Schedule of Rates (§9.3)
35. Work Order list page with filters (§10.1)
36. Work Order Detail – header + statistics (§10.2)
37. Work Order Detail – Sites in card view (§10.2)
38. Work Order Detail – Sites in table view (§10.2)
39. Schedule of Rates table (§10.2)
40. Approve / Cancel Work Order actions (§10.2)
41. Work Order Expenses dialog (§10.2)
42. Cancel Work Order dialog with reason (§10.3)
43. Create Work-Order-Site – Step 1 (existing vs new) (§11.1)
44. Create Work-Order-Site – Step 2 (details + activities) (§11.1)
45. Site Detail dialog – Estimate/sub-WO tab (§11.2)
46. Site Detail dialog – Expenses & P&L tab (§11.2)
47. Site Detail dialog – Completion tab with P&L summary (§11.2)
48. Site Detail dialog – assigned operators section (§11.2)
49. Site Detail dialog – Operator Uploads list (§11.2)
50. Activity row with Edit control (§11.3)
51. Add Expense dialog – activity + type rows (§12)
52. Add Expense dialog – Exceeded (over-budget) mode (§12)
53. Add Expense dialog – contractor section (§12)
54. Operator workspace – list of assigned sites (§13.1)
55. Operator upload page – empty / select files (§13.2)
56. Operator upload page – pending files with descriptions (§13.2)
57. Operator upload page – upload progress (§13.2)
58. Operator upload page – uploaded files grid (§13.2)
59. Operator upload page – delete confirmation (§13.2)
60. Work Order Operator Uploads dialog (§13.3)
61. "No dashboard access yet" screen (§16)
62. Permission error toast (§16)

---

**End of SOP** — Version 2.0
For technical issues that block your work, contact the system administrator at `itadmin@teri.res.in`.
