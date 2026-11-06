#!/usr/bin/env node
/**
 * OTBL demo data loader: one file, no build step.
 *
 * Fills every table of the app with a large demo data set, 500+ rows per
 * table by default, that follows the app's own rules: one manager per office,
 * office operators on offices and site operators on work order sites, one work
 * order per approved proposal, a restoration row for restoration work orders,
 * bio samples whose TPH falls below the target only on completed sites, oil
 * zapper applied only once a purchase order has procured it, purchase order
 * costs recorded as the sites' expenses, job orders whose completion
 * certificates use up the schedule of rates, and so on.
 *
 * Usage, from the repo root:
 *   node packages/db/scripts/seed-demo-data.mjs --dry-run   build and check the data, write nothing
 *   node packages/db/scripts/seed-demo-data.mjs --reset     empty the app's tables, then load
 *   node packages/db/scripts/seed-demo-data.mjs --append --password <pw>
 *                                                           add to the data already there
 *   node packages/db/scripts/seed-demo-data.mjs --undo <manifest.json>
 *                                                           remove what an --append run added
 *
 * Options:
 *   --reset              Empty every app table first. Needed when the database already holds data.
 *   --append             Keep the data already there and add the demo data alongside it. Saves the
 *                        ids it adds to a manifest file, for --undo.
 *   --undo <file>        Delete exactly the rows an --append run added, as listed in its manifest.
 *   --count <n>          Base size: offices, work orders, vendors and so on (default 500).
 *   --seed <n>           Random seed, so a run can be repeated exactly (default 2026).
 *   --password <pw>      Password for every demo user (default Demo@1234; required with --append).
 *   --dry-run            Build and check the data and print the counts, without writing. With
 *                        --append it reads the database, to show what it would add.
 *   --yes                Skip the 5 second pause before writing to a database in use.
 *   --allow-production   Run even when NODE_ENV is production.
 *
 * The database comes from DATABASE_URL, else from apps/server/.env. Apply the
 * migrations first (pnpm --filter @pkg/db db:migrate). Document links open
 * DEMO_DOCUMENT_URL, a sample PDF by default; none are uploaded to SharePoint.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

if (flag("help") || flag("h")) {
  const source = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").replace(/\r/g, "");
  console.log(source.split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
  process.exit(0);
}

const COUNT = Number(option("count", 500));
const SEED = Number(option("seed", 2026));
const PASSWORD = String(option("password", "Demo@1234"));
const RESET = flag("reset");
const APPEND = flag("append");
const UNDO = option("undo", null);
const DRY_RUN = flag("dry-run");

if (APPEND && RESET) {
  console.error("Choose --append or --reset, not both.");
  process.exit(1);
}
// The default password is written in this file, so it mustn't guard an admin
// on a database that's in use.
if (APPEND && !args.includes("--password")) {
  console.error(
    "--append adds demo users, an admin among them, to a database that's in use. " +
      "Give them a password of your own with --password <pw>.",
  );
  process.exit(1);
}
if (args.includes("--undo") && !UNDO) {
  console.error("--undo needs the manifest file an --append run saved.");
  process.exit(1);
}
const DOC_URL =
  process.env.DEMO_DOCUMENT_URL ||
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

if (!Number.isInteger(COUNT) || COUNT < 10) {
  console.error("--count must be a whole number of at least 10.");
  process.exit(1);
}
if (!Number.isFinite(SEED)) {
  console.error("--seed must be a number.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Randomness and dates
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (min, max) =>
  max <= min ? min : min + Math.floor(rand() * (max - min + 1));
const real = (min, max) => (max <= min ? min : min + rand() * (max - min));
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const pickWeighted = (weights) => {
  const entries = Object.entries(weights);
  let r = rand() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) if ((r -= w) < 0) return key;
  return entries[0][0];
};
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (list, n) => shuffle(list).slice(0, Math.max(0, n));
const round2 = (n) => Math.round(n * 100) / 100;
const dec = (n) => round2(Number(n)).toFixed(2);
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Splits a total into random shares, to 2 decimals, that add up to it exactly.
// Shares may be zero with the given chance, but never all of them.
function split(total, parts, zeroChance = 0) {
  if (parts <= 0) return [];
  const weights = Array.from({ length: parts }, () =>
    chance(zeroChance) ? 0 : real(0.5, 1.5),
  );
  if (weights.every((w) => w === 0)) weights[int(0, parts - 1)] = 1;
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => Math.floor((total * w * 100) / sum) / 100);
  const holder = weights.indexOf(Math.max(...weights));
  const others = shares.reduce((a, s, i) => (i === holder ? a : a + s), 0);
  shares[holder] = round2(total - others);
  return shares;
}

const DAY = 86_400_000;
const NOW = new Date();
const addDays = (d, days) => new Date(d.getTime() + days * DAY);
const addHours = (d, hours) => new Date(d.getTime() + hours * 3_600_000);
const daysBetween = (a, b) => Math.floor((b.getTime() - a.getTime()) / DAY);
const earliest = (...ds) => new Date(Math.min(...ds.map((d) => d.getTime())));
const latest = (...ds) => new Date(Math.max(...ds.map((d) => d.getTime())));
const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const randDate = (from, to) =>
  to <= from ? new Date(from) : new Date(from.getTime() + rand() * (to - from));
const atWorkHour = (d) => {
  const x = new Date(d);
  x.setHours(int(9, 18), int(0, 59), int(0, 59), 0);
  return x;
};
// Nothing is dated after the moment the script runs.
const clampPast = (d) =>
  d > NOW ? new Date(NOW.getTime() - int(5, 180) * 60_000) : d;
const stamp = (d) => {
  const t = clampPast(d);
  return { created_at: t, updated_at: t };
};
const yy = (d) => String(d.getFullYear()).slice(2);
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Everything happens within the last four years.
const BASE = dayStart(addDays(NOW, -1500));

// ---------------------------------------------------------------------------
// The app's constants (mirroring packages/utils/src/constants.ts)
// ---------------------------------------------------------------------------

const ZERO_DAY = "Zero Day";
const TPH_TARGET = 0.5;
const GST = 18;
const ACT = {
  CLEAN: "clean_soil_area",
  LIFT: "lifting_oily_slush_or_recovery_of_oil",
  EXCAV: "excavation_oil_contaminated_soil",
  TRANS: "transportation_contaminated_soil",
  REFILL: "refilling_excavated_oil_contaminated_soil_land",
  BIO: "bioremediation_oil_contaminated_soil",
};
const RESTORATION_ACTS = [ACT.CLEAN, ACT.LIFT, ACT.EXCAV, ACT.TRANS, ACT.REFILL];
const ACTIVITY_INFO = {
  [ACT.CLEAN]: { label: "Cleaning up soil area", unit: "m²", rate: [140, 420], qty: [400, 9000] },
  [ACT.LIFT]: { label: "Lifting oily slush / recovery of oil", unit: "m³", rate: [900, 2600], qty: [15, 450] },
  [ACT.EXCAV]: { label: "Excavation of oil contaminated soil", unit: "m³", rate: [320, 950], qty: [80, 3200] },
  [ACT.TRANS]: { label: "Transportation of contaminated soil", unit: "km/m³" },
  [ACT.REFILL]: { label: "Refilling of excavated land", unit: "m³", rate: [260, 720], qty: [80, 3000] },
  [ACT.BIO]: { label: "Bioremediation of oil contaminated soil", unit: "MT", rate: [3600, 7800] },
};
const SLABS = {
  up_to_5_km: { qty: [40, 1600], rate: [110, 260], p: 1 },
  over_20_km: { qty: [50, 900], rate: [320, 640], p: 0.55 },
  over_40_km: { qty: [500, 18000], rate: [9, 26], p: 0.3 },
};
// The rows of the client's job order form and completion certificate, in order.
const JO_ROWS = [
  { key: "spill_cleaning", sor: ACT.CLEAN, measured: true },
  { key: "oily_slush_lifting", sor: ACT.LIFT, measured: true },
  { key: "excavation", sor: ACT.EXCAV, measured: true },
  { key: "transportation", sor: ACT.TRANS, header: true },
  { key: "transportation_up_to_5_km", sor: ACT.TRANS, slab: "up_to_5_km", measured: true },
  { key: "transportation_over_20_km", sor: ACT.TRANS, slab: "over_20_km", measured: true },
  { key: "transportation_over_40_km", sor: ACT.TRANS, slab: "over_40_km", measured: true },
  { key: "refilling", sor: ACT.REFILL, measured: true, formYesNo: true },
  { key: "bioremediation_volume", sor: ACT.BIO, bio: true },
  { key: "bioremediation_weight", sor: ACT.BIO, bio: true },
];
const SC_ITEMS = {
  jcb: { label: "JCB hire", unit: "hours", qty: [20, 320], cost: [900, 1600] },
  labour: { label: "Labour", unit: "man-days", qty: [30, 650], cost: [450, 720] },
  transport: { label: "Transport", unit: "trips", qty: [4, 140], cost: [2500, 9000] },
  other: { label: "Other", unit: "Nos", qty: [1, 60], cost: [500, 20000] },
};

const monthLabel = (n) => {
  const j = n % 10;
  const k = n % 100;
  let suffix = "th";
  if (j === 1 && k !== 11) suffix = "st";
  if (j === 2 && k !== 12) suffix = "nd";
  if (j === 3 && k !== 13) suffix = "rd";
  return `${n}${suffix} Month`;
};

// The number a quantity written on a job order form stands for, as the app
// reads it (packages/utils/src/job-order-sor.ts).
const formQuantity = (text) => {
  const result = String(text ?? "").split("=").pop().replace(/,/g, "").trim();
  const match = /^(\d+(?:\.\d+)?)[a-z²³.\s]*$/i.exec(result);
  return match ? Number(match[1]) : null;
};
const qtyText = (n) => String(round2(n));

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const FIRST = [
  "Aarav", "Aditi", "Akash", "Amit", "Ananya", "Anil", "Anjali", "Arjun", "Ashok", "Bhavna",
  "Bikash", "Bhupen", "Chetan", "Deepa", "Deepak", "Dhruba", "Divya", "Gaurav", "Geeta", "Harish",
  "Hemanta", "Hitesh", "Isha", "Jatin", "Jayesh", "Jyoti", "Kalpana", "Kavita", "Kiran", "Kunal",
  "Lakshmi", "Mahesh", "Manish", "Meena", "Mohit", "Neha", "Nikhil", "Nisha", "Pankaj", "Pooja",
  "Prakash", "Pranjal", "Priya", "Rahul", "Rajesh", "Rakesh", "Ravi", "Rekha", "Rohit", "Sachin",
  "Sandeep", "Sanjay", "Shalini", "Shweta", "Sneha", "Sunil", "Sunita", "Suresh", "Tanvi", "Tarun",
  "Uma", "Varun", "Vikas", "Vikram", "Vinod", "Yash", "Zoya",
];
const LAST = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta", "Joshi", "Desai",
  "Reddy", "Rao", "Nair", "Menon", "Iyer", "Pillai", "Das", "Bora", "Gogoi", "Baruah",
  "Saikia", "Kalita", "Hazarika", "Borah", "Dutta", "Chakraborty", "Banerjee", "Mukherjee", "Ghosh", "Sen",
  "Mishra", "Tiwari", "Pandey", "Yadav", "Chauhan", "Rathore", "Solanki", "Parmar", "Chaudhary", "Malhotra",
  "Kapoor", "Bhatia", "Negi", "Rawat", "Bisht", "Thakur", "Naidu", "Varma", "Kulkarni", "Jain",
];
const STATE_CODES = {
  Gujarat: "24", Assam: "18", Rajasthan: "08", "Andhra Pradesh": "37", "Tamil Nadu": "33",
  Puducherry: "34", Tripura: "16", Maharashtra: "27", Delhi: "07", Uttarakhand: "05",
  Haryana: "06", "Uttar Pradesh": "09", "West Bengal": "19", Odisha: "21", Karnataka: "29",
  Kerala: "32", "Madhya Pradesh": "23", Punjab: "03", Bihar: "10", Telangana: "36",
};
const LOCATIONS = [
  ["Ahmedabad", "Gujarat", 380], ["Mehsana", "Gujarat", 384], ["Kalol", "Gujarat", 382],
  ["Ankleshwar", "Gujarat", 393], ["Bharuch", "Gujarat", 392], ["Vadodara", "Gujarat", 390],
  ["Khambhat", "Gujarat", 388], ["Surat", "Gujarat", 395], ["Jamnagar", "Gujarat", 361],
  ["Sivasagar", "Assam", 785], ["Nazira", "Assam", 785], ["Jorhat", "Assam", 785],
  ["Golaghat", "Assam", 785], ["Dibrugarh", "Assam", 786], ["Duliajan", "Assam", 786],
  ["Digboi", "Assam", 786], ["Guwahati", "Assam", 781], ["Barmer", "Rajasthan", 344],
  ["Jaisalmer", "Rajasthan", 345], ["Jodhpur", "Rajasthan", 342], ["Rajahmundry", "Andhra Pradesh", 533],
  ["Kakinada", "Andhra Pradesh", 533], ["Amalapuram", "Andhra Pradesh", 533], ["Narsapur", "Andhra Pradesh", 534],
  ["Chennai", "Tamil Nadu", 600], ["Nagapattinam", "Tamil Nadu", 611], ["Thiruvarur", "Tamil Nadu", 610],
  ["Karaikal", "Puducherry", 609], ["Agartala", "Tripura", 799], ["Mumbai", "Maharashtra", 400],
  ["Uran", "Maharashtra", 400], ["Panvel", "Maharashtra", 410], ["New Delhi", "Delhi", 110],
  ["Dehradun", "Uttarakhand", 248], ["Gurugram", "Haryana", 122], ["Panipat", "Haryana", 132],
  ["Noida", "Uttar Pradesh", 201], ["Mathura", "Uttar Pradesh", 281], ["Kolkata", "West Bengal", 700],
  ["Haldia", "West Bengal", 721], ["Paradip", "Odisha", 754], ["Bhubaneswar", "Odisha", 751],
  ["Mangaluru", "Karnataka", 575], ["Bengaluru", "Karnataka", 560], ["Kochi", "Kerala", 682],
  ["Bina", "Madhya Pradesh", 470], ["Bhopal", "Madhya Pradesh", 462], ["Bathinda", "Punjab", 151],
  ["Barauni", "Bihar", 851], ["Patna", "Bihar", 800], ["Hyderabad", "Telangana", 500],
].map(([city, state, pin]) => ({ city, state, pin }));
// The oil producing regions come up twice as often.
const FIELD_LOCATIONS = [...LOCATIONS, ...LOCATIONS.slice(0, 24)];
const locationsByState = new Map();
for (const loc of LOCATIONS) {
  if (!locationsByState.has(loc.state)) locationsByState.set(loc.state, []);
  locationsByState.get(loc.state).push(loc);
}
const STREETS = [
  "Station Road", "MG Road", "GIDC Industrial Estate", "Ring Road", "Civil Lines", "Nehru Nagar",
  "Gandhi Chowk", "Refinery Road", "AT Road", "Thana Road", "NH-27 Bypass", "Tank Farm Road",
  "Club Road", "Sector 15", "Old Highway", "Shastri Nagar", "Collectorate Road",
  "Industrial Area Phase II", "Mission Road", "Rajpath",
];
const OFFICE_KINDS = [
  "Regional Office", "Project Office", "Field Office", "Site Office", "Zonal Office",
  "Branch Office", "Liaison Office",
];
const REAL_PARENTS = [
  ["Oil and Natural Gas Corporation Ltd", "ONGC"], ["Oil India Ltd", "OIL"],
  ["Indian Oil Corporation Ltd", "IOCL"], ["Bharat Petroleum Corporation Ltd", "BPCL"],
  ["Hindustan Petroleum Corporation Ltd", "HPCL"], ["GAIL (India) Ltd", "GAIL"],
  ["Cairn Oil & Gas", "Cairn"], ["Numaligarh Refinery Ltd", "NRL"],
  ["Chennai Petroleum Corporation Ltd", "CPCL"], ["Mangalore Refinery and Petrochemicals Ltd", "MRPL"],
];
const NAME_PREFIXES = [
  "Shakti", "Bharat", "Indus", "Ganga", "Brahmaputra", "Narmada", "Saraswati", "Konkan", "Deccan",
  "Sahyadri", "Himalaya", "Aravali", "Vindhya", "Kaveri", "Godavari", "Krishna", "Mahanadi", "Tapti",
  "Sabarmati", "Luni", "Satpura", "Nilgiri", "Eastern", "Western", "Northern", "Southern", "Coastal",
  "Frontier", "Pioneer", "Sunrise", "Trident", "Vasundhara", "Prithvi", "Agni", "Akash", "Sagar",
  "Urja", "Jyoti", "Tejas", "Vayu",
];
const NAME_CORES = [
  "Petroleum", "Oil & Gas", "Energy", "Hydrocarbons", "Petrochem", "Refineries", "Exploration",
  "Pipelines", "Gas Distribution", "Offshore", "Drilling", "Fuels",
];
const NAME_SUFFIXES = ["Ltd", "Pvt Ltd", "Corporation", "Industries Ltd"];
const BRANCH_KINDS = ["Asset", "Basin", "Block", "Unit", "Field", "Refinery", "Terminal"];
const DESIGNATIONS = [
  "General Manager (Production)", "Deputy General Manager (HSE)", "Chief Manager (Drilling)",
  "Superintending Engineer", "Executive Engineer (Civil)", "Installation Manager", "Senior Geologist",
  "Asset Manager", "Manager (Contracts)", "Assistant Executive Engineer", "Chief Chemist",
];
const CONTACT_TYPES = ["Primary", "Technical", "Billing", "Site In-charge", "HSE", "Contracts"];
const TRADES = [
  "Enterprises", "Earthmovers", "Construction Co.", "Transport Co.", "Infra Projects", "Agro Services",
  "Bio Solutions", "Engineering Works", "Logistics", "Contractors", "Envirotech", "Oilfield Services",
  "Roadlines", "Builders",
];
const DEITIES = [
  "Ganesh", "Ram", "Krishna", "Hanuman", "Durga", "Ambe", "Sai", "Balaji", "Shiv", "Laxmi",
  "Kamakhya", "Jagannath",
];
const INSTALLATIONS = [
  "Well", "GGS", "GCS", "CTF", "EPS", "Pipeline", "Drill Site", "Tank Farm", "Oil Collecting Station",
];
const LAND_TITLES = [
  "Govt. land (Revenue Dept.)", "Acquired land of the client", "Panchayat land", "Forest Dept. land",
];
const REMARKS = [
  "", "", "Work to be executed as per OISD guidelines.", "Joint measurement with the client before billing.",
  "Site access through the client's approach road only.", "Monsoon break to be accounted in the schedule.",
  "Land owner's NOC obtained.",
];
const CANCEL_REASONS = [
  "Client withdrew the requirement after a site re-survey.",
  "Land owner did not give access to the spill site.",
  "Scope merged into a larger annual rate contract.",
  "Budget not approved by the asset for this financial year.",
  "Spill site cleaned up by the client's own team.",
  "Work order reissued under a revised agreement number.",
];
const JO_TITLES = [
  "Restoration of oil spill site", "Cleaning and restoration of spill area",
  "Excavation and refilling of contaminated land", "Recovery of oil and restoration of land",
  "Restoration of pipeline leak area",
];
const LOCATION_HINTS = [
  "Near well plinth", "Along the flow line", "Behind the GGS boundary wall", "Paddy field near the pipeline",
  "Village approach road", "Drain near the tank farm", "Low-lying area near the CTF",
];
const OTHER_ITEMS = [
  "Water tanker", "Tarpaulin sheets", "Fencing material", "Tilling machine", "HDPE liner",
  "Bamboo barricades", "Diesel generator",
];
const MISC_TITLES = [
  "Site office rent", "Water tanker hire", "Electricity charges", "Generator fuel (diesel)",
  "Staff travel and conveyance", "TPH lab testing charges", "Security guard services",
  "Tarpaulin and HDPE sheets", "Safety PPE kits", "Drinking water supply", "Stationery and printing",
  "Vehicle hire", "Courier charges", "Mobile and internet charges", "First-aid supplies",
  "Signboards and barricading", "Soil sample transport",
];
const UPLOAD_DESCRIPTIONS = [
  "Daily progress report", "Site photographs - pit preparation", "Oil zapper application record",
  "Tilling and watering log", "Sample collection for TPH analysis", "Nutrient dosing record",
  "Weekly HSE checklist", "Labour attendance sheet", "Material receipt at site",
  "Joint site inspection report",
];

// ---------------------------------------------------------------------------
// The rows, held in memory until they are inserted. Tables are listed in the
// order they are inserted, so each one's references already exist.
// ---------------------------------------------------------------------------

const COLUMNS = {
  users: ["id", "name", "email", "password", "contact_number", "role", "created_by", "status", "created_at", "updated_at"],
  offices: ["id", "name", "address", "state", "city", "gst_number", "pincode", "email", "status", "created_at", "updated_at"],
  parent_clients: ["id", "name", "created_at", "updated_at"],
  clients: ["id", "parent_client_id", "name", "address", "state", "city", "pincode", "gst_number", "contact_number", "email", "status", "created_at", "updated_at"],
  client_contacts: ["id", "client_id", "name", "designation", "contact_number", "email", "contact_type", "created_at", "updated_at"],
  contractors: ["id", "name", "contact_number", "email", "address", "gst_number", "pan_number", "status", "created_at", "updated_at"],
  office_users: ["id", "user_id", "office_id", "assigned_by", "role", "created_at", "updated_at"],
  sites: ["id", "name", "address", "state", "city", "pincode", "office_id", "status", "created_at", "updated_at"],
  proposals: ["id", "client_id", "office_id", "code", "title", "document_key", "documents", "description", "proposal_submission_date", "status", "created_by", "created_at", "updated_at"],
  work_orders: ["id", "code", "agreement_number", "rate_contract_number", "title", "proposal_id", "client_id", "office_id", "start_date", "end_date", "handing_over_date", "document_key", "documents", "process_type", "description", "job_number", "area", "installation", "joint_estimate_number", "land_owner_name", "remarks", "status", "cancellation_reason", "approved_at", "approved_by", "created_by", "created_at", "updated_at"],
  schedule_of_rates: ["id", "work_order_id", "activity", "unit", "estimated_quantity", "rc_unit_rate", "gst_percentage", "unit_rate_inc_gst", "total_cost", "transportation_km", "transportation_slabs", "created_at", "updated_at"],
  work_order_sites: ["id", "work_order_id", "client_id", "site_id", "date", "end_date", "process_type", "status", "isCompleted", "created_at", "updated_at"],
  site_activity_items: ["id", "work_order_site_id", "schedule_of_rates_id", "activity", "unit", "created_at", "updated_at"],
  work_order_site_users: ["id", "work_order_site_id", "user_id", "created_at", "updated_at"],
  wo_site_contractors: ["id", "work_order_site_id", "contractor_id", "assigned_by", "created_at"],
  work_order_site_docs: ["id", "work_order_site_id", "document_url", "document_id", "type", "created_at", "updated_at"],
  wo_site_oprtr_docs: ["id", "work_order_site_id", "uploaded_by_user_id", "description", "file_name", "document_url", "document_id", "created_at", "updated_at"],
  biorem_cont_soil: ["id", "site_activity_id", "work_order_site_id", "estimated_quantity", "amount", "transportation_km", "oil_zapper_quantity", "type", "created_at", "updated_at"],
  bio_samples: ["id", "site_activity_id", "work_order_site_id", "biorem_cont_soil_id", "tph_document_url", "documents", "tph_value", "application_month", "sampled_on", "created_at", "updated_at"],
  bio_oil_zapping: ["id", "site_activity_id", "work_order_site_id", "bio_sample_id", "document_url", "documents", "estimated_quantity", "applied_on", "created_at", "updated_at"],
  job_orders: ["id", "work_order_site_id", "jo_number", "title", "start_date", "end_date", "description", "issued_by", "rc_noa_number", "rc_noa_date", "ola_number", "po_number", "installation_name", "location", "mobilization_date", "activities", "completed_on", "completion_activities", "documents", "created_by", "created_at", "updated_at"],
  job_order_contractors: ["id", "job_order_id", "contractor_id", "created_at"],
  contract_orders: ["id", "work_order_id", "type", "order_number", "order_date", "description", "unit_rate", "gst_percentage", "invoice_number", "documents", "completion_documents", "created_by", "created_at", "updated_at"],
  contract_order_items: ["id", "contract_order_id", "work_order_site_id", "item", "description", "quantity", "unit", "created_at", "updated_at"],
  contract_order_contractors: ["id", "contract_order_id", "contractor_id", "created_at"],
  wo_site_expenses: ["id", "work_order_site_id", "contractor_id", "contract_order_item_id", "from_order", "job_order_id", "title", "amount", "start_date", "end_date", "invoice_number", "activity_key", "quantity", "is_exceeded", "document_url", "document_id", "documents", "created_by", "created_at", "updated_at"],
};
// Tables older versions of the app had, emptied too on a reset if still there.
const LEGACY_TABLES = [
  "site_users", "clean_soil_area", "lifting_oil_slush", "excav_cont_soil", "trans_cont_soil",
  "refill_excav_soil",
];

const data = Object.fromEntries(Object.keys(COLUMNS).map((t) => [t, []]));
// The highest id already in each table. New rows follow on from it, so an
// --append run's rows don't clash with those already there.
const ID_BASE = Object.fromEntries(Object.keys(COLUMNS).map((t) => [t, 0]));
// Ids are given here, so they line up with the references between rows.
const add = (table, row) => {
  const record = { id: ID_BASE[table] + data[table].length + 1, ...row };
  data[table].push(record);
  return record;
};

let docSeq = 0;
// A stored document, as the app keeps it in a `documents` list.
const doc = (name) => ({
  url: `${DOC_URL}#demo-${++docSeq}`,
  id: null,
  name: name.replace(/[\\/:*?"<>|]+/g, "-"),
});

// Values of unique columns already in use, kept in lower case, as MySQL
// compares them without regard to case.
const usedEmails = new Set();
const takenParentNames = new Set();
const takenProposalCodes = new Set();
const takenWorkOrderCodes = new Set();

// ---------------------------------------------------------------------------
// The database. It is read before anything is built: to check its schema, and
// for --append, to learn the ids and names already used.
// ---------------------------------------------------------------------------

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

async function openDatabase() {
  if (process.env.NODE_ENV === "production" && !flag("allow-production")) {
    console.error("NODE_ENV is production. Pass --allow-production if you really mean to run this here.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    const { default: dotenv } = await import("dotenv");
    dotenv.config({ path: path.resolve(scriptDir, "../../../apps/server/.env"), quiet: true });
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL isn't set, and apps/server/.env doesn't give one.");
    process.exit(1);
  }
  let target = "the database";
  try {
    const parsed = new URL(url);
    target = `${parsed.pathname.replace(/^\//, "")} on ${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    // Not a URL mysql2 would reject either; it reports the problem on connecting.
  }
  const { default: mysql } = await import("mysql2/promise");
  return { conn: await mysql.createConnection({ uri: url }), target };
}

// The tables and columns must be those of the current schema. Returns the
// database's tables.
async function checkSchema(conn, target) {
  const [columnRows] = await conn.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS dflt, EXTRA AS extra
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`,
  );
  const dbColumns = new Map();
  for (const r of columnRows) {
    if (!dbColumns.has(r.t)) dbColumns.set(r.t, []);
    dbColumns.get(r.t).push(r);
  }
  const drift = [];
  for (const [table, columns] of Object.entries(COLUMNS)) {
    const existing = dbColumns.get(table);
    if (!existing) {
      drift.push(`table ${table} is missing`);
      continue;
    }
    const names = new Set(existing.map((r) => r.c));
    for (const c of columns) if (!names.has(c)) drift.push(`${table}.${c} is missing`);
    for (const r of existing) {
      const required = r.nullable === "NO" && r.dflt === null && !/auto_increment/i.test(r.extra);
      if (required && !columns.includes(r.c)) drift.push(`${table}.${r.c} is required but unknown to this script`);
    }
  }
  if (drift.length) {
    console.error(`${target} doesn't match the app's schema:`);
    for (const d of drift) console.error(`  - ${d}`);
    console.error("Apply the migrations first: pnpm --filter @pkg/db db:migrate");
    process.exit(1);
  }
  return dbColumns;
}

const pause = async (message) => {
  console.log(message);
  if (!flag("yes")) {
    console.log("Press Ctrl+C within 5 seconds to stop.");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

// Deletes exactly the rows an --append run added, children first.
async function undoAppend(file) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  const { conn, target } = await openDatabase();
  try {
    if (manifest.database !== target) {
      console.error(`${file} lists rows added to ${manifest.database}, but this is ${target}. Nothing was deleted.`);
      process.exitCode = 1;
      return;
    }
    const tables = Object.keys(COLUMNS).filter((t) => manifest.tables?.[t]).reverse();
    const total = tables.reduce((sum, t) => sum + manifest.tables[t][1] - manifest.tables[t][0] + 1, 0);
    await pause(
      `About to delete the ${total} demo rows added to ${target} on ${manifest.loadedAt}. ` +
        "Rows that point at them, such as expenses added to a demo site, go with them.",
    );
    await conn.beginTransaction();
    try {
      for (const table of tables) {
        const [from, to] = manifest.tables[table];
        const [result] = await conn.query(`DELETE FROM \`${table}\` WHERE id BETWEEN ? AND ?`, [from, to]);
        console.log(`  ${table.padEnd(28)} ${String(result.affectedRows).padStart(7)} deleted`);
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    }
    console.log(`\nRemoved the demo data from ${target}.`);
  } catch (error) {
    console.error(`\nUndo failed, so nothing was deleted: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

if (UNDO) {
  await undoAppend(path.resolve(UNDO));
  process.exit();
}

let db = null;
if (!DRY_RUN || APPEND) {
  db = await openDatabase();
  db.tables = await checkSchema(db.conn, db.target);

  if (APPEND) {
    for (const table of Object.keys(COLUMNS)) {
      const [[{ maxId }]] = await db.conn.query(`SELECT COALESCE(MAX(id), 0) AS maxId FROM \`${table}\``);
      ID_BASE[table] = Number(maxId);
    }
    const lowerSet = async (sql, set) => {
      const [rows] = await db.conn.query(sql);
      for (const r of rows) set.add(String(r.v).toLowerCase());
    };
    await lowerSet("SELECT email AS v FROM users", usedEmails);
    await lowerSet("SELECT name AS v FROM parent_clients", takenParentNames);
    await lowerSet("SELECT code AS v FROM proposals", takenProposalCodes);
    await lowerSet("SELECT code AS v FROM work_orders", takenWorkOrderCodes);
  } else {
    const filled = [];
    for (const table of Object.keys(COLUMNS)) {
      const [[{ n }]] = await db.conn.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      if (n > 0) filled.push(`${table} (${n})`);
    }
    if (filled.length && !RESET) {
      console.error(`${db.target} already holds data: ${filled.join(", ")}.`);
      console.error("Run again with --append to add the demo data alongside it, or with --reset to empty");
      console.error("those tables first, deleting every row in them.");
      process.exit(1);
    }
  }
}

// ---------------------------------------------------------------------------
// People, places and companies
// ---------------------------------------------------------------------------

const personName = () => `${pick(FIRST)} ${pick(LAST)}`;
const uniqueEmail = (local, domain) => {
  const base = slug(local).replace(/-/g, ".") || "user";
  let email = `${base}@${domain}`;
  for (let n = 2; usedEmails.has(email); n++) email = `${base}${n}@${domain}`;
  usedEmails.add(email);
  return email;
};
const phone = () => `${pick(["6", "7", "8", "9"])}${String(int(0, 999_999_999)).padStart(9, "0")}`;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const letters = (n) => Array.from({ length: n }, () => pick(LETTERS)).join("");
const pan = (kind, name) =>
  `${letters(3)}${kind}${(name.match(/[a-z]/i)?.[0] ?? "X").toUpperCase()}${String(int(0, 9999)).padStart(4, "0")}${letters(1)}`;
const gstin = (state, panNumber) =>
  `${STATE_CODES[state] ?? "07"}${panNumber}${int(1, 9)}Z${pick([...LETTERS, ..."0123456789"])}`;
const pincode = (loc) => `${loc.pin}${String(int(1, 99)).padStart(3, "0")}`;
const address = (loc) => `${int(1, 450)}, ${pick(STREETS)}, ${loc.city}`;
const nearby = (state) => pick(locationsByState.get(state) ?? LOCATIONS);

const OTBL_PAN = "AAACO4521K";
const passwordHash = DRY_RUN
  ? "dry-run"
  : await (async () => {
      const { default: bcrypt } = await import("bcrypt");
      return bcrypt.hash(PASSWORD, 10);
    })();

function addUser(role, { name = personName(), email, createdBy = null, status } = {}) {
  return add("users", {
    name,
    email: email ? uniqueEmail(email.split("@")[0], email.split("@")[1]) : uniqueEmail(name, "otbl.test"),
    password: passwordHash,
    contact_number: phone(),
    role,
    created_by: createdBy,
    status: status ?? (chance(0.05) ? "inactive" : "active"),
    ...stamp(atWorkHour(addDays(BASE, int(0, 90)))),
  });
}

const admin = addUser("admin", { name: "Demo Admin", email: "admin@otbl.test", status: "active" });

// Offices, each with its one manager.
const offices = [];
const managerOf = new Map();
const usedOfficeNames = new Set();
for (let i = 0; i < COUNT; i++) {
  const loc = pick(FIELD_LOCATIONS);
  let name = `${loc.city} ${pick(OFFICE_KINDS)}`;
  for (let n = 2; usedOfficeNames.has(name); n++) name = `${loc.city} ${pick(OFFICE_KINDS)} ${n}`;
  usedOfficeNames.add(name);
  const office = add("offices", {
    name,
    address: address(loc),
    state: loc.state,
    city: loc.city,
    gst_number: gstin(loc.state, OTBL_PAN),
    pincode: pincode(loc),
    email: uniqueEmail(name, "otbl.test"),
    status: i > 0 && chance(0.04) ? "inactive" : "active",
    ...stamp(atWorkHour(addDays(BASE, int(0, 60)))),
  });
  offices.push(office);
  const manager = addUser("office_manager", {
    createdBy: admin.id,
    status: "active",
    ...(i === 0 && { name: "Demo Manager", email: "manager@otbl.test" }),
  });
  managerOf.set(office.id, manager);
  add("office_users", {
    user_id: manager.id,
    office_id: office.id,
    assigned_by: admin.id,
    role: "office_manager",
    ...stamp(addHours(office.created_at, int(1, 72))),
  });
}
const activeOffices = offices.filter((o) => o.status === "active");

// Office operators, on their own office and sometimes on a second one.
const officeOpsOf = new Map(offices.map((o) => [o.id, []]));
for (let i = 0; i < COUNT; i++) {
  const home = offices[i];
  const manager = managerOf.get(home.id);
  const op = addUser("office_operator", {
    createdBy: manager.id,
    ...(i === 0 && { name: "Demo Office Operator", email: "office.operator@otbl.test", status: "active" }),
  });
  const homes = [home];
  if (chance(0.4)) {
    const other = pick(offices);
    if (other.id !== home.id) homes.push(other);
  }
  for (const office of homes) {
    officeOpsOf.get(office.id).push(op);
    add("office_users", {
      user_id: op.id,
      office_id: office.id,
      assigned_by: managerOf.get(office.id).id,
      role: "operator",
      ...stamp(addHours(op.created_at, int(1, 240))),
    });
  }
}

// Site operators, given work order sites as the work orders come in.
const siteOps = [];
for (let i = 0; i < COUNT; i++) {
  siteOps.push(
    addUser("site_operator", {
      createdBy: managerOf.get(pick(offices).id).id,
      ...(i === 0 && { name: "Demo Site Operator", email: "site.operator@otbl.test", status: "active" }),
    }),
  );
}
const siteOpQueue = shuffle(siteOps.filter((u) => u.status === "active"));
let siteOpCursor = 0;
const nextSiteOp = () => siteOpQueue[siteOpCursor++ % siteOpQueue.length];

const viewerCount = Math.max(20, Math.round(COUNT / 10));
for (let i = 0; i < viewerCount; i++) {
  addUser("viewer", {
    createdBy: admin.id,
    ...(i === 0 && { name: "Demo Viewer", email: "viewer@otbl.test", status: "active" }),
  });
}
// One login per role, with the email it got: on an --append run, a number is
// added to one already taken.
const DEMO_LOGINS = [
  ["Admin", "Demo Admin"],
  ["Office manager", "Demo Manager"],
  ["Office operator", "Demo Office Operator"],
  ["Site operator", "Demo Site Operator"],
  ["Viewer", "Demo Viewer"],
].map(([role, name]) => [role, data.users.find((u) => u.name === name).email]);

// Main clients and their branches.
const parentNames = [
  ...REAL_PARENTS.map(([name, short]) => ({ name, short })),
  ...shuffle(
    NAME_PREFIXES.flatMap((p) =>
      NAME_CORES.flatMap((c) => NAME_SUFFIXES.map((s) => ({ name: `${p} ${c} ${s}`, short: `${p} ${c}` }))),
    ),
  ),
];
const parents = [];
let nameCursor = 0;
for (let i = 0; i < COUNT; i++) {
  // Main client names are unique, so skip any already taken.
  let base;
  let name;
  do {
    base = parentNames[nameCursor % parentNames.length];
    const round = Math.floor(nameCursor / parentNames.length);
    name = round === 0 ? base.name : `${base.name} ${round + 1}`;
    nameCursor++;
  } while (takenParentNames.has(name.toLowerCase()));
  takenParentNames.add(name.toLowerCase());
  const parent = add("parent_clients", { name, ...stamp(atWorkHour(addDays(BASE, int(0, 60)))) });
  parent._short = base.short;
  parents.push(parent);
}
const clients = [];
const clientsByState = new Map();
const addBranch = (parent) => {
  const loc = pick(FIELD_LOCATIONS);
  const domain = `${slug(parent._short).replace(/-/g, "")}.test`;
  const client = add("clients", {
    parent_client_id: parent.id,
    name: `${parent._short} ${loc.city} ${pick(BRANCH_KINDS)}`,
    address: address(loc),
    state: loc.state,
    city: loc.city,
    pincode: pincode(loc),
    gst_number: gstin(loc.state, pan("C", parent._short)),
    contact_number: chance(0.9) ? phone() : null,
    email: chance(0.9) ? uniqueEmail(`${loc.city} office`, domain) : null,
    status: chance(0.05) ? "inactive" : "active",
    ...stamp(addHours(parent.created_at, int(1, 24 * 30))),
  });
  client._short = parent._short;
  clients.push(client);
  if (!clientsByState.has(loc.state)) clientsByState.set(loc.state, []);
  clientsByState.get(loc.state).push(client);
  for (let c = int(2, 3); c > 0; c--) {
    const name = personName();
    add("client_contacts", {
      client_id: client.id,
      name,
      designation: pick(DESIGNATIONS),
      contact_number: phone(),
      email: uniqueEmail(name, domain),
      contact_type: pick(CONTACT_TYPES),
      ...stamp(addHours(client.created_at, int(1, 24 * 60))),
    });
  }
  return client;
};
for (const parent of parents) addBranch(parent);
for (let i = Math.ceil(COUNT * 0.2); i > 0; i--) {
  addBranch(chance(0.5) ? pick(parents.slice(0, REAL_PARENTS.length)) : pick(parents));
}
const activeClients = clients.filter((c) => c.status === "active");
const clientFor = (office) => {
  const local = (clientsByState.get(office.state) ?? []).filter((c) => c.status === "active");
  return local.length && chance(0.7) ? pick(local) : pick(activeClients);
};

// Vendors, shared by every office.
const contractorNames = [
  () => `${pick(LAST)} ${pick(TRADES)}`,
  () => `Shree ${pick(DEITIES)} ${pick(TRADES)}`,
  () => `${pick(NAME_PREFIXES)} ${pick(TRADES)}`,
  () => `M/s ${pick(FIRST)} & Sons ${pick(["Contractors", "Transport", "Earthmovers"])}`,
];
for (let i = 0; i < COUNT + 20; i++) {
  const loc = pick(FIELD_LOCATIONS);
  const name = pick(contractorNames)();
  const panNumber = pan(pick(["C", "F", "P"]), name);
  add("contractors", {
    name,
    contact_number: chance(0.9) ? phone() : null,
    email: chance(0.7) ? uniqueEmail("accounts", `${slug(name).replace(/-/g, "")}${i}.test`) : null,
    address: chance(0.85) ? `${address(loc)}, ${loc.state} ${pincode(loc)}` : null,
    gst_number: chance(0.85) ? gstin(loc.state, panNumber) : null,
    pan_number: chance(0.9) ? panNumber : null,
    status: chance(0.05) ? "inactive" : "active",
    ...stamp(atWorkHour(addDays(BASE, int(0, 200)))),
  });
}
const activeContractors = data.contractors.filter((c) => c.status === "active");

// Each office's sites.
const sitesOf = new Map();
for (const office of offices) {
  const list = [];
  for (let n = int(2, 5); n > 0; n--) {
    const loc = nearby(office.state);
    const code = loc.city.slice(0, 3).toUpperCase();
    const name = pick([
      () => `Well ${code}#${int(1, 999)}`,
      () => `GGS-${pick(["I", "II", "III", "IV", "V"])} ${loc.city}`,
      () => `GCS ${loc.city}-${int(1, 9)}`,
      () => `CTF ${loc.city}`,
      () => `EPS-${int(1, 30)} ${loc.city}`,
      () => `Drill Site ${code}-${int(10, 450)}`,
      () => `Pipeline Leak Point KM ${int(1, 180)}.${int(0, 9)}`,
      () => `Bioremediation Pit ${int(1, 40)}, ${loc.city}`,
      () => `Sludge Lagoon ${int(1, 12)} ${loc.city}`,
      () => `Tank Farm ${loc.city}`,
      () => `Oil Collecting Station ${int(1, 15)}`,
    ])();
    list.push(
      add("sites", {
        name,
        address: address(loc),
        state: loc.state,
        city: loc.city,
        pincode: pincode(loc),
        office_id: office.id,
        status: chance(0.06) ? "inactive" : "active",
        ...stamp(atWorkHour(addDays(BASE, int(30, 200)))),
      }),
    );
  }
  sitesOf.set(office.id, list);
}

// ---------------------------------------------------------------------------
// Proposals and work orders
// ---------------------------------------------------------------------------

const PROCESS_TITLES = {
  bioremediation: (c) => `Bioremediation of oil contaminated soil and sludge - ${c.name}`,
  restoration: (c) => `Restoration of oil spill affected land - ${c.city}`,
  bioremediation_restoration: (c) => `Oil spill bioremediation and land restoration - ${c.name}`,
};
let proposalSeq = 0;
function addProposal({ client, office, processType, date, status }) {
  let code;
  do code = `OTBL/PR/${yy(date)}/${String(++proposalSeq).padStart(4, "0")}`;
  while (takenProposalCodes.has(code.toLowerCase()));
  const documents = [doc(`Technical Proposal ${code}.pdf`)];
  if (chance(0.6)) documents.push(doc(`Commercial Offer ${code}.pdf`));
  return add("proposals", {
    client_id: client.id,
    office_id: office.id,
    code,
    title: `Proposal: ${PROCESS_TITLES[processType](client)}`.slice(0, 255),
    document_key: documents[0].url,
    documents,
    description: chance(0.8)
      ? `Techno-commercial offer to treat oil spill sites of ${client.name} with the Oilzapper bioremediation technology.`
      : null,
    proposal_submission_date: dayStart(date),
    status,
    created_by: managerOf.get(office.id).id,
    ...stamp(date),
  });
}

// Every expense's planned quantity, by site and activity, for its is_exceeded flag.
const estimates = new Map();
let woSeq = 0;
const workOrderCode = (start) => {
  let code;
  do code = `OTBL/WO/${yy(start)}/${String(++woSeq).padStart(4, "0")}`;
  while (takenWorkOrderCodes.has(code.toLowerCase()));
  return code;
};
let joSeq = 0;
let poSeq = 0;
let scSeq = 0;

function addSiteDoc(row, type, when) {
  return add("work_order_site_docs", {
    work_order_site_id: row.id,
    document_url: doc(`${type.replace(/_/g, " ")} ${row.id}.pdf`).url,
    document_id: null,
    type,
    ...stamp(atWorkHour(when)),
  });
}

function addExpense({
  site, contractor = null, itemId = null, fromOrder = 0, jobOrderId = null, title, amount,
  start, end, invoice, activityKey = null, quantity = null, createdBy, documents, createdAt,
}) {
  const invoiceNumber =
    invoice !== undefined ? invoice : chance(0.7) ? `INV/${yy(start)}/${int(1000, 99999)}` : null;
  const docs =
    documents ?? (chance(0.85) ? [doc(`${invoiceNumber ? `Invoice ${invoiceNumber}` : title}.pdf`)] : []);
  return add("wo_site_expenses", {
    work_order_site_id: site.id,
    contractor_id: contractor?.id ?? null,
    contract_order_item_id: itemId,
    from_order: fromOrder,
    job_order_id: jobOrderId,
    title: title.slice(0, 500),
    amount: dec(amount),
    start_date: start,
    end_date: end,
    invoice_number: invoiceNumber,
    activity_key: activityKey,
    quantity: quantity == null ? null : dec(quantity),
    is_exceeded: 0,
    document_url: docs[0]?.url ?? null,
    document_id: null,
    documents: docs,
    created_by: createdBy,
    ...stamp(createdAt ?? atWorkHour(addDays(end, int(0, 4)))),
  });
}

function addSor(wo, act) {
  const info = ACTIVITY_INFO[act];
  let qty;
  let rate;
  let slabs = null;
  if (act === ACT.TRANS) {
    slabs = {};
    for (const [key, s] of Object.entries(SLABS)) {
      slabs[key] = { quantity: chance(s.p) ? int(...s.qty) : 0, rate: round2(real(...s.rate)) };
    }
    qty = round2(Object.values(slabs).reduce((a, s) => a + s.quantity, 0));
    rate = round2(Object.values(slabs).reduce((a, s) => a + s.rate, 0));
  } else {
    qty = act === ACT.BIO ? 0 : int(...info.qty);
    rate = round2(real(...info.rate));
  }
  const row = add("schedule_of_rates", {
    work_order_id: wo.id,
    activity: act,
    unit: info.unit,
    estimated_quantity: null,
    rc_unit_rate: dec(rate),
    gst_percentage: dec(GST),
    unit_rate_inc_gst: dec(rate * (1 + GST / 100)),
    total_cost: null,
    transportation_km: null,
    transportation_slabs: slabs,
    ...stamp(wo.created_at),
  });
  row._rate = rate;
  row._incGst = round2(rate * (1 + GST / 100));
  setSorQuantity(row, qty);
  return row;
}
function setSorQuantity(row, qty) {
  row._qty = qty;
  row.estimated_quantity = dec(qty);
  row.total_cost = dec(row._incGst * qty);
}

function assignOperators(ctx, row, ops, until) {
  for (const op of ops) {
    add("work_order_site_users", { work_order_site_id: row.id, user_id: op.id, ...stamp(row.created_at) });
  }
  for (let n = ops.length ? int(0, 3) : 0; n > 0; n--) {
    const description = pick(UPLOAD_DESCRIPTIONS);
    const when = atWorkHour(randDate(row.date, until));
    add("wo_site_oprtr_docs", {
      work_order_site_id: row.id,
      uploaded_by_user_id: pick(ops).id,
      description: `${description} - ${ymd(when)}`,
      file_name: `${slug(description)}-${ymd(when)}.pdf`,
      document_url: doc(`${description}.pdf`).url,
      document_id: null,
      ...stamp(when),
    });
  }
}

// What a job order's form or completion certificate says for each of its rows.
function jobOrderRows(shares, { from, to, completion, exSitu }) {
  const anyTransport = JO_ROWS.some((r) => r.slab && shares[r.key] > 0);
  const date = () => ymd(randDate(from, to));
  return JO_ROWS.map((r) => {
    let quantity;
    let done = false;
    if (r.header) {
      quantity = anyTransport ? "Yes" : "No";
      done = anyTransport;
    } else if (r.bio) {
      if (!exSitu) quantity = "No";
      else if (!completion) quantity = "To be assessed later";
      else quantity = qtyText(r.key === "bioremediation_volume" ? int(20, 400) : int(30, 640));
      done = exSitu;
    } else {
      const q = shares[r.key] ?? 0;
      done = q > 0;
      if (!done) quantity = "No";
      else if (r.formYesNo && !completion) quantity = "Yes";
      else quantity = qtyText(q);
    }
    return { key: r.key, quantity, completion_date: done ? date() : null };
  });
}

// What a restoration's job orders have certified, by schedule of rates activity.
function certifiedByActivity(jobOrders) {
  const totals = {};
  for (const jo of jobOrders) {
    for (const row of jo.completion_activities ?? []) {
      const def = JO_ROWS.find((r) => r.key === row.key);
      const q = formQuantity(row.quantity);
      if (!def?.measured || q === null) continue;
      totals[def.sor] = (totals[def.sor] ?? 0) + q;
    }
  }
  return totals;
}

function buildRestoration(ctx) {
  const { wo, phase, start, end, horizon, manager, staff, rates, client } = ctx;
  const row = add("work_order_sites", {
    work_order_id: wo.id,
    client_id: wo.client_id,
    site_id: null,
    date: start,
    end_date: end,
    process_type: "restoration",
    status: "pending",
    isCompleted: false,
    ...stamp(wo.created_at),
  });
  for (const act of RESTORATION_ACTS) {
    const sor = rates[act];
    add("site_activity_items", {
      work_order_site_id: row.id,
      schedule_of_rates_id: sor.id,
      activity: act,
      unit: sor.unit,
      ...stamp(wo.created_at),
    });
    estimates.set(`${row.id}:${act}`, sor._qty);
  }

  const measured = JO_ROWS.filter((r) => r.measured)
    .map((r) => ({
      ...r,
      qty: r.slab ? rates[ACT.TRANS].transportation_slabs[r.slab].quantity : rates[r.sor]._qty,
    }))
    .filter((r) => r.qty > 0);

  const windowStart = addDays(start, 5);
  const windowEnd = phase === "completed" ? addDays(end, -10) : earliest(end, horizon);
  const span = daysBetween(windowStart, windowEnd);
  let count;
  if (phase === "cancelled") count = span > 20 && chance(0.6) ? 1 : 0;
  else if (span < 25) count = span > 2 ? 1 : 0;
  else count = span < 60 ? int(1, 2) : int(2, 4);

  // Each measured row's quantity, shared out between the job orders. The first
  // row goes to all of them, so a job order still open always has work left.
  const shares = measured.map((m, i) => ({ ...m, parts: split(m.qty, count, i === 0 ? 0 : 0.3) }));
  const segment = count ? span / count : 0;
  const installation = `${pick(INSTALLATIONS)} ${client.city}`;
  const vendorsOnRow = new Set();
  const jobOrders = [];
  let lastCompletion = null;

  for (let j = 0; j < count; j++) {
    const joStart = dayStart(addDays(windowStart, j * segment + int(0, Math.floor(segment * 0.3))));
    let joEnd = dayStart(addDays(joStart, int(20, 75)));
    if (phase === "completed" && joEnd > addDays(end, -3)) joEnd = dayStart(addDays(end, -3));
    if (joEnd <= joStart) joEnd = dayStart(addDays(joStart, 7));
    const completed =
      phase === "completed" ||
      (phase === "ongoing" && j < count - 1 && joEnd <= addDays(NOW, -3) && chance(0.85));
    const completedOn = completed ? dayStart(clampPast(addDays(joEnd, int(-5, 3)))) : null;
    const exSitu = chance(0.15);
    const joShares = Object.fromEntries(shares.map((s) => [s.key, s.parts[j]]));
    const number = `JO/${client._short.replace(/\s+/g, "")}/${yy(joStart)}/${String(++joSeq).padStart(5, "0")}`;
    const created = atWorkHour(addDays(joStart, -int(1, 7)));
    const jo = add("job_orders", {
      work_order_site_id: row.id,
      jo_number: number,
      title: `${pick(JO_TITLES)} at ${installation}`,
      start_date: joStart,
      end_date: joEnd,
      description: chance(0.6) ? `Job order issued under ${wo.code} for restoration work at ${installation}.` : null,
      issued_by: `${personName()}, Installation Manager`,
      rc_noa_number: `RC/NOA/${int(1000, 9999)}/${yy(start)}`,
      rc_noa_date: dayStart(addDays(start, -int(30, 200))),
      ola_number: `OLA/${yy(joStart)}/${int(100, 9999)}`,
      po_number: String(int(4_500_000_000, 4_599_999_999)),
      installation_name: installation,
      location: `${pick(LOCATION_HINTS)}, ${client.city}`,
      mobilization_date: exSitu ? dayStart(addDays(joStart, int(1, 7))) : null,
      activities: jobOrderRows(joShares, { from: joStart, to: joEnd, completion: false, exSitu }),
      completed_on: completedOn,
      completion_activities: completed
        ? jobOrderRows(joShares, { from: joStart, to: completedOn, completion: true, exSitu })
        : null,
      documents: completed ? [doc(`Work Completion Certificate ${number}.pdf`)] : [],
      created_by: manager.id,
      ...stamp(created),
    });
    if (completed) {
      jo.updated_at = clampPast(atWorkHour(completedOn));
      lastCompletion = latest(lastCompletion ?? completedOn, completedOn);
    }
    jobOrders.push(jo);

    const vendors = sample(activeContractors, chance(0.65) ? 1 : 2);
    for (const v of vendors) {
      add("job_order_contractors", { job_order_id: jo.id, contractor_id: v.id, created_at: jo.created_at });
      vendorsOnRow.add(v);
    }

    // Vendor bills against the job order, for the activities it covers.
    if (joStart > addDays(NOW, -2)) continue;
    const spendEnd = completed ? completedOn : earliest(joEnd, NOW);
    for (const act of RESTORATION_ACTS) {
      const share = shares.filter((s) => s.sor === act).reduce((a, s) => a + s.parts[j], 0);
      if (!(share > 0) || chance(0.25)) continue;
      const total = round2(share * (completed ? real(0.97, 1.06) : real(0.2, 0.7)));
      split(total, int(1, 2)).forEach((q, bill) => {
        if (!(q > 0)) return;
        const st = dayStart(randDate(joStart, spendEnd));
        const en = dayStart(earliest(addDays(st, int(0, 10)), spendEnd));
        const unitCost = act === ACT.TRANS ? real(150, 400) : rates[act]._rate * real(0.45, 0.75);
        addExpense({
          site: row,
          contractor: pick(vendors),
          jobOrderId: jo.id,
          title: `${ACTIVITY_INFO[act].label} - ${number} (RA bill ${bill + 1})`,
          amount: q * unitCost,
          start: st,
          end: en,
          activityKey: act,
          quantity: q,
          createdBy: pick(staff).id,
        });
      });
    }
  }

  for (const v of vendorsOnRow) {
    add("wo_site_contractors", {
      work_order_site_id: row.id,
      contractor_id: v.id,
      assigned_by: manager.id,
      created_at: clampPast(addHours(row.created_at, int(1, 240))),
    });
  }

  // Miscellaneous costs, under no vendor.
  const spendTo = earliest(windowEnd, NOW);
  if (spendTo > start) {
    for (let n = int(1, 3); n > 0; n--) {
      const st = dayStart(randDate(start, spendTo));
      addExpense({
        site: row,
        title: pick(MISC_TITLES),
        amount: real(1500, 75000),
        start: st,
        end: dayStart(earliest(addDays(st, int(0, 5)), spendTo)),
        createdBy: pick(staff).id,
      });
    }
  }

  // Complete once the certificates use up every activity with a quantity.
  const certified = certifiedByActivity(jobOrders);
  row.isCompleted = RESTORATION_ACTS.every(
    (act) => !(rates[act]._qty > 0) || (certified[act] ?? 0) + 0.001 >= rates[act]._qty,
  );
  if (count > 0) {
    for (let n = int(1, 2); n > 0; n--) addSiteDoc(row, "measurement_sheet", randDate(start, spendTo));
  }
  if (row.isCompleted && lastCompletion) {
    addSiteDoc(row, "completion", addDays(lastCompletion, int(1, 5)));
    addSiteDoc(row, "completion_certificate", addDays(lastCompletion, int(5, 20)));
  }

  const ops = chance(0.5) ? [nextSiteOp()] : [];
  assignOperators(ctx, row, ops, earliest(spendTo, NOW));
}

// A bioremediation site's plan: its dates, how far its treatment has got, its
// estimate, and the oil zapper it procures and applies.
function planBioSite(ctx, site) {
  const { wo, phase, start, end, horizon, sor } = ctx;
  let date = dayStart(addDays(start, phase === "completed" ? int(0, 40) : int(0, 90)));
  if (phase !== "completed") date = earliest(date, dayStart(addDays(horizon, -5)));
  date = latest(date, start);
  const mob = dayStart(addDays(date, int(2, 10)));
  const treatmentEnd = phase === "completed" ? addDays(end, -15) : horizon;
  const monthsAvailable = mob < treatmentEnd ? Math.floor(daysBetween(mob, treatmentEnd) / 30) : 0;

  let state =
    phase === "completed"
      ? "done"
      : phase === "cancelled"
        ? "cancelled"
        : pickWeighted({ done: 30, treating: 50, mobilizing: 20 });
  if (state === "done" && monthsAvailable < 3) state = monthsAvailable >= 1 ? "treating" : "mobilizing";
  if (state === "treating" && monthsAvailable < 1) state = "mobilizing";

  const hasEstimate = state === "mobilizing" ? chance(0.6) : state === "cancelled" ? chance(0.8) : true;
  const hasZeroDay =
    hasEstimate && mob <= treatmentEnd && (state === "done" || state === "treating" || chance(0.5));
  let months = 0;
  if (hasZeroDay) {
    if (state === "done") months = int(3, Math.min(9, monthsAvailable));
    else if (state === "treating") months = int(1, Math.min(7, monthsAvailable));
    else if (state === "cancelled") months = Math.min(int(0, 2), monthsAvailable);
  }

  const row = add("work_order_sites", {
    work_order_id: wo.id,
    client_id: wo.client_id,
    site_id: site.id,
    date,
    end_date: dayStart(earliest(end, addDays(date, int(180, 360)))),
    process_type: "bioremediation",
    status: "pending",
    isCompleted: false,
    ...stamp(latest(addHours(wo.created_at, int(1, 48)), atWorkHour(addDays(date, -int(1, 10))))),
  });
  const activity = add("site_activity_items", {
    work_order_site_id: row.id,
    schedule_of_rates_id: sor.id,
    activity: ACT.BIO,
    unit: sor.unit,
    ...stamp(row.created_at),
  });

  let estimate = null;
  if (hasEstimate) {
    const qty = round2(real(40, 1200));
    const ozq = Math.round(qty * real(0.8, 1.6));
    const at = atWorkHour(addDays(date, int(0, 2)));
    estimate = add("biorem_cont_soil", {
      site_activity_id: activity.id,
      work_order_site_id: row.id,
      estimated_quantity: dec(qty),
      amount: dec(qty * sor._incGst),
      transportation_km: dec(int(3, 60)),
      oil_zapper_quantity: dec(ozq),
      type: "estimate_sub-wo",
      ...stamp(at),
    });
    estimate._qty = qty;
    estimate._ozq = ozq;
    estimates.set(`${row.id}:${ACT.BIO}`, qty);
    estimates.set(`${row.id}:oil_zapper`, ozq);
    addSiteDoc(row, "estimate", at);
  }

  let procure = 0;
  if (estimate) {
    if (state === "done") procure = round2(estimate._ozq * real(0.95, 1.1));
    else if (state === "treating") procure = round2(estimate._ozq * real(0.5, 1.0));
    else if (chance(0.5)) procure = round2(estimate._ozq * real(0.2, 0.6));
  }
  let applied = 0;
  if (procure > 0 && months > 0) {
    const share = state === "done" ? real(0.9, 1.0) : state === "treating" ? real(0.3, 0.85) : real(0.1, 0.5);
    applied = Math.min(procure, round2(procure * share));
  }

  return {
    row, site, activity, state, date, mob, months, hasZeroDay, estimate, procure, applied,
    firstApplication: applied > 0 ? dayStart(addDays(mob, int(2, 8))) : null,
    vendors: new Set(),
  };
}

function addPurchaseOrder(ctx, date, entries) {
  const vendor = pick(activeContractors);
  const number = `PO/${yy(date)}/${String(++poSeq).padStart(5, "0")}`;
  const rate = round2(real(380, 560));
  const invoice = chance(0.85) ? `INV/${yy(date)}/${int(1000, 99999)}` : null;
  const delivered = entries.every(([plan]) => plan.state === "done");
  const created = clampPast(atWorkHour(date));
  const order = add("contract_orders", {
    work_order_id: ctx.wo.id,
    type: "purchase_order",
    order_number: number,
    order_date: date,
    description: chance(0.7) ? `Supply of Oilzapper for ${entries.length} site(s) under ${ctx.wo.code}.` : null,
    unit_rate: dec(rate),
    gst_percentage: dec(GST),
    invoice_number: invoice,
    documents: [doc(`Purchase Order ${number}.pdf`)],
    completion_documents: delivered && chance(0.8) ? [doc(`Delivery Challan ${number}.pdf`)] : [],
    created_by: ctx.manager.id,
    ...stamp(created),
  });
  add("contract_order_contractors", { contract_order_id: order.id, contractor_id: vendor.id, created_at: order.created_at });
  for (const [plan, qty] of entries) {
    if (!(qty > 0)) continue;
    const item = add("contract_order_items", {
      contract_order_id: order.id,
      work_order_site_id: plan.row.id,
      item: "oil_zapper",
      description: null,
      quantity: dec(qty),
      unit: "kg",
      ...stamp(created),
    });
    // The order records its own cost at the site, from its rate.
    addExpense({
      site: plan.row,
      contractor: vendor,
      itemId: item.id,
      fromOrder: 1,
      title: `${number}: Oil Zapper`,
      amount: qty * rate * (1 + GST / 100),
      start: date,
      end: date,
      invoice,
      activityKey: "oil_zapper",
      quantity: qty,
      createdBy: ctx.manager.id,
      documents: [],
      createdAt: created,
    });
    plan.vendors.add(vendor);
  }
}

// Oil zapper is bought through purchase orders before any of it is applied:
// one for every site that needs it, and sometimes a second, top-up order.
function buildPurchaseOrders(ctx, plans) {
  const buying = plans.filter((p) => p.procure > 0);
  if (!buying.length) return;
  const topUp = ctx.phase !== "cancelled" && chance(0.35) ? sample(buying, int(1, buying.length)) : [];
  const firstShare = new Map(buying.map((p) => [p, topUp.includes(p) ? round2(p.procure * 0.65) : p.procure]));
  const firstDate = earliest(
    latest(ctx.start, dayStart(addDays(earliest(...buying.map((p) => p.mob)), -int(3, 15)))),
    dayStart(earliest(ctx.horizon, NOW)),
  );
  addPurchaseOrder(ctx, firstDate, buying.map((p) => [p, firstShare.get(p)]));
  if (topUp.length) {
    const limit = earliest(ctx.horizon, ...topUp.map((p) => p.firstApplication).filter(Boolean));
    const secondDate = dayStart(addDays(firstDate, int(0, Math.max(0, daysBetween(firstDate, limit) - 1))));
    addPurchaseOrder(ctx, secondDate, topUp.map((p) => [p, round2(p.procure - firstShare.get(p))]));
  }
}

function finishBioSite(ctx, plan) {
  const { wo, phase, horizon, manager, staff, sor } = ctx;
  const { row, state, mob, months, estimate } = plan;

  // The zero day sample, then one a month, with the TPH falling towards the
  // target. Only a completed site's latest sample is below it.
  let lastSample = null;
  if (plan.hasZeroDay) {
    const tph0 = round2(real(3.5, 16));
    const addSample = (label, tph, when) => {
      const documents = [doc(`TPH Report ${label} - site ${row.id}.pdf`)];
      add("bio_samples", {
        site_activity_id: null,
        work_order_site_id: row.id,
        biorem_cont_soil_id: null,
        tph_document_url: documents[0].url,
        documents,
        tph_value: dec(tph),
        application_month: label,
        sampled_on: dayStart(when),
        ...stamp(when),
      });
    };
    addSample(ZERO_DAY, tph0, atWorkHour(mob));
    addSiteDoc(row, "mobilization", mob);
    const final =
      state === "done"
        ? real(0.12, 0.48)
        : state === "treating"
          ? real(0.6, Math.max(0.7, tph0 * 0.5))
          : real(1.5, Math.max(1.6, tph0 * 0.8));
    for (let m = 1; m <= months; m++) {
      let tph = tph0 * Math.pow(final / tph0, m / months) * (m < months ? real(0.95, 1.05) : 1);
      if (m < months || state !== "done") tph = Math.max(tph, 0.55);
      const when = clampPast(atWorkHour(addDays(mob, 30 * m + int(-3, 3))));
      addSample(monthLabel(m), tph, when);
      lastSample = when;
    }
  }

  // Oil zapper applied once a month, never more than was procured.
  if (plan.applied > 0) {
    split(plan.applied, months).forEach((q, i) => {
      if (!(q > 0)) return;
      const when = clampPast(atWorkHour(i === 0 ? plan.firstApplication : addDays(mob, 30 * i + int(2, 8))));
      const documents = [doc(`Oil Zapper Application ${monthLabel(i + 1)} - site ${row.id}.pdf`)];
      add("bio_oil_zapping", {
        site_activity_id: null,
        work_order_site_id: row.id,
        bio_sample_id: null,
        document_url: documents[0].url,
        documents,
        estimated_quantity: dec(q),
        applied_on: dayStart(when),
        ...stamp(when),
      });
    });
  }

  let completionDate = null;
  if (state === "done") {
    completionDate = clampPast(atWorkHour(addDays(lastSample, int(2, 12))));
    const qty = phase === "completed" ? estimate._qty : round2(estimate._qty * real(0.95, 1.05));
    add("biorem_cont_soil", {
      site_activity_id: plan.activity.id,
      work_order_site_id: row.id,
      estimated_quantity: dec(qty),
      amount: dec(qty * sor._incGst),
      transportation_km: estimate.transportation_km,
      oil_zapper_quantity: dec(plan.applied),
      type: "completion",
      ...stamp(completionDate),
    });
    addSiteDoc(row, "completion", completionDate);
    addSiteDoc(row, "completion_certificate", clampPast(addDays(completionDate, int(1, 20))));
    row.isCompleted = true;
    if (row.end_date < completionDate) row.end_date = dayStart(earliest(ctx.end, addDays(completionDate, 1)));
  }
  const activeEnd = earliest(horizon, completionDate ?? horizon, NOW);

  if (estimate) {
    for (let n = int(0, 2); n > 0; n--) addSiteDoc(row, "measurement_sheet", randDate(mob, activeEnd));
  }

  // Sub-contracts for the work at this one site, and their bills.
  const subContracts =
    state === "done" || state === "treating" ? int(1, 2) : estimate && chance(0.3) ? 1 : 0;
  for (let s = 0; s < subContracts; s++) {
    const orderDate = dayStart(randDate(row.date, earliest(addDays(row.date, 25), activeEnd)));
    const vendors = sample(activeContractors, chance(0.7) ? 1 : 2);
    const number = `SC/${yy(orderDate)}/${String(++scSeq).padStart(5, "0")}`;
    const created = clampPast(atWorkHour(orderDate));
    const order = add("contract_orders", {
      work_order_id: wo.id,
      type: "sub_contract",
      order_number: number,
      order_date: orderDate,
      description: chance(0.7) ? `Site works at ${plan.site.name}.` : null,
      unit_rate: null,
      gst_percentage: null,
      invoice_number: null,
      documents: [doc(`Sub-contract ${number}.pdf`)],
      completion_documents: state === "done" && chance(0.8) ? [doc(`Work Completion Report ${number}.pdf`)] : [],
      created_by: manager.id,
      ...stamp(created),
    });
    for (const v of vendors) {
      add("contract_order_contractors", { contract_order_id: order.id, contractor_id: v.id, created_at: order.created_at });
      plan.vendors.add(v);
    }
    for (const kind of sample(Object.keys(SC_ITEMS), int(1, 3))) {
      const spec = SC_ITEMS[kind];
      const qty = int(...spec.qty);
      const description = kind === "other" ? pick(OTHER_ITEMS) : null;
      const item = add("contract_order_items", {
        contract_order_id: order.id,
        work_order_site_id: row.id,
        item: kind,
        description,
        quantity: dec(qty),
        unit: spec.unit,
        ...stamp(created),
      });
      const bills = state === "done" ? int(1, 3) : state === "treating" ? int(0, 2) : int(0, 1);
      for (let b = 0; b < bills; b++) {
        const st = dayStart(randDate(orderDate, activeEnd));
        const portion = Math.max(1, Math.round(qty * real(0.15, 0.5)));
        addExpense({
          site: row,
          contractor: pick(vendors),
          itemId: item.id,
          title: `${description ?? spec.label} - ${number} (${portion} ${spec.unit})`,
          amount: portion * real(...spec.cost),
          start: st,
          end: dayStart(earliest(addDays(st, int(0, 10)), activeEnd)),
          createdBy: pick(staff).id,
        });
      }
    }
  }

  if (chance(0.5)) plan.vendors.add(pick(activeContractors));
  for (const v of plan.vendors) {
    add("wo_site_contractors", {
      work_order_site_id: row.id,
      contractor_id: v.id,
      assigned_by: manager.id,
      created_at: clampPast(addHours(row.created_at, int(1, 240))),
    });
  }

  // Treatment billed by a site vendor against the site's estimated soil.
  if (estimate && (state === "done" || state === "treating") && plan.vendors.size) {
    for (let n = int(0, 2); n > 0; n--) {
      const qty = round2(estimate._qty * real(0.2, 0.55));
      const st = dayStart(randDate(mob, activeEnd));
      addExpense({
        site: row,
        contractor: pick([...plan.vendors]),
        title: `Windrow turning and nutrient dosing - ${dec(qty)} MT`,
        amount: qty * sor._rate * real(0.25, 0.45),
        start: st,
        end: dayStart(earliest(addDays(st, int(0, 10)), activeEnd)),
        activityKey: ACT.BIO,
        quantity: qty,
        createdBy: pick(staff).id,
      });
    }
  }

  for (let n = state === "mobilizing" ? int(0, 2) : int(1, 4); n > 0; n--) {
    const st = dayStart(randDate(row.date, activeEnd));
    addExpense({
      site: row,
      title: pick(MISC_TITLES),
      amount: real(1500, 75000),
      start: st,
      end: dayStart(earliest(addDays(st, int(0, 5)), activeEnd)),
      createdBy: pick(staff).id,
    });
  }

  const ops = new Set([nextSiteOp()]);
  if (chance(0.4)) ops.add(nextSiteOp());
  if (ctx.showcase) ops.add(siteOps[0]);
  assignOperators(ctx, row, [...ops], activeEnd);
}

function buildBioremediation(ctx) {
  const sites = sitesOf.get(ctx.office.id);
  const usable = sites.filter((s) => s.status === "active");
  const pool = usable.length ? usable : sites;
  const n = ctx.phase === "cancelled" ? int(1, 2) : int(1, 4);
  const plans = sample(pool, Math.min(n, pool.length)).map((site) => planBioSite(ctx, site));

  // The schedule of rates covers the sites' estimated soil; a completed work
  // order's sites use all of it.
  const estimated = round2(plans.reduce((a, p) => a + (p.estimate?._qty ?? 0), 0));
  setSorQuantity(
    ctx.sor,
    ctx.phase === "completed" ? estimated : estimated > 0 ? round2(estimated * real(1.1, 1.35)) : int(200, 2000),
  );

  buildPurchaseOrders(ctx, plans);
  for (const plan of plans) finishBioSite(ctx, plan);
}

// The first few work orders belong to the demo manager's office, one of each
// kind, so the demo logins have something to look at.
const SHOWCASE = [
  { phase: "completed", process: "bioremediation_restoration" },
  { phase: "ongoing", process: "bioremediation" },
  { phase: "ongoing", process: "restoration" },
  { phase: "ongoing", process: "bioremediation_restoration" },
  { phase: "cancelled", process: "bioremediation" },
];

function buildWorkOrder(index) {
  const showcase = index < SHOWCASE.length;
  const phase = showcase ? SHOWCASE[index].phase : pickWeighted({ completed: 30, ongoing: 62, cancelled: 8 });
  const processType = showcase
    ? SHOWCASE[index].process
    : pickWeighted({ bioremediation: 40, restoration: 25, bioremediation_restoration: 35 });
  const office = showcase ? offices[0] : pick(activeOffices);
  const manager = managerOf.get(office.id);
  const staff = [manager, ...officeOpsOf.get(office.id)];
  const client = clientFor(office);

  let start;
  let end;
  if (phase === "completed") {
    start = addDays(NOW, -int(500, 1200));
    end = addDays(start, int(240, 420));
  } else if (phase === "ongoing") {
    start = addDays(NOW, -int(20, 700));
    end = addDays(start, int(365, 730));
    if (end < addDays(NOW, 30)) end = addDays(NOW, int(30, 300));
  } else {
    start = addDays(NOW, -int(60, 1100));
    end = addDays(start, int(180, 540));
  }
  start = dayStart(start);
  end = dayStart(end);
  const cancelledAt = phase === "cancelled" ? clampPast(atWorkHour(addDays(start, int(30, 150)))) : null;
  // Nothing is recorded past this: today, or the day the work order was cancelled.
  const horizon = phase === "completed" ? end : phase === "cancelled" ? cancelledAt : NOW;

  const proposal = addProposal({
    client,
    office,
    processType,
    date: atWorkHour(addDays(start, -int(30, 120))),
    status: "approved",
  });
  const created = atWorkHour(addDays(start, -int(3, 25)));
  const awaitingApproval = phase === "ongoing" && daysBetween(start, NOW) < 60 && chance(0.25);
  const approvedAt =
    awaitingApproval || (phase === "cancelled" && chance(0.3)) ? null : atWorkHour(addDays(created, int(1, 6)));
  const documents = [doc(`Work Order ${index + 1}.pdf`)];
  if (chance(0.6)) documents.push(doc(`Agreement ${index + 1}.pdf`));
  if (chance(0.4)) documents.push(doc(`Rate Contract ${index + 1}.pdf`));

  const wo = add("work_orders", {
    code: workOrderCode(start),
    agreement_number: `AGR/${client._short.replace(/\s+/g, "")}/${yy(start)}/${int(100, 999)}`,
    rate_contract_number: `RC-${int(8_000_000_000, 8_099_999_999)}`,
    title: PROCESS_TITLES[processType](client).slice(0, 255),
    proposal_id: proposal.id,
    client_id: client.id,
    office_id: office.id,
    start_date: start,
    end_date: end,
    handing_over_date: dayStart(addDays(start, int(0, 15))),
    document_key: documents[0].url,
    documents,
    process_type: processType,
    description: chance(0.7) ? `Work order against ${proposal.code} for ${client.name}.` : null,
    job_number: `JOB-${int(10000, 99999)}`,
    area: `${client.city} ${pick(["North", "South", "East", "West", "Central"])} Area`,
    installation: pick(INSTALLATIONS),
    joint_estimate_number: `JE/${yy(start)}/${int(100, 9999)}`,
    land_owner_name: chance(0.3) ? pick(LAND_TITLES) : personName(),
    remarks: pick(REMARKS),
    status: phase === "cancelled" ? "cancelled" : "pending",
    cancellation_reason: phase === "cancelled" ? pick(CANCEL_REASONS) : null,
    approved_at: approvedAt ? clampPast(approvedAt) : null,
    approved_by: approvedAt ? admin.id : null,
    created_by: manager.id,
    ...stamp(created),
  });
  if (cancelledAt) wo.updated_at = cancelledAt;

  // Its schedule of rates, in the order the app lists the activities.
  const hasBio = processType !== "restoration";
  const hasRestoration = processType !== "bioremediation";
  const rates = {};
  for (const act of [...RESTORATION_ACTS, ACT.BIO]) {
    if (act === ACT.BIO ? hasBio : hasRestoration) rates[act] = addSor(wo, act);
  }

  const ctx = { wo, phase, start, end, horizon, office, manager, staff, client, rates, sor: rates[ACT.BIO], showcase };
  if (hasRestoration) buildRestoration(ctx);
  if (hasBio) buildBioremediation(ctx);
}

for (let i = 0; i < COUNT; i++) buildWorkOrder(i);

// Proposals still pending, rejected, or approved without a work order yet.
for (let i = Math.ceil(COUNT * 0.35); i > 0; i--) {
  const status = pickWeighted({ pending: 55, rejected: 35, approved: 10 });
  const office = pick(activeOffices);
  addProposal({
    client: clientFor(office),
    office,
    processType: pick(Object.keys(PROCESS_TITLES)),
    date: atWorkHour(status === "rejected" ? randDate(addDays(BASE, 200), addDays(NOW, -20)) : addDays(NOW, -int(2, 120))),
    status,
  });
}

// An expense is flagged exceeded when, with those recorded before it, it uses
// more than its activity's planned quantity. Purchase order expenses aren't
// flagged, but count towards those after them.
{
  const used = new Map();
  const ordered = [...data.wo_site_expenses].sort((a, b) => a.created_at - b.created_at || a.id - b.id);
  for (const e of ordered) {
    if (!e.activity_key || e.quantity == null) continue;
    const key = `${e.work_order_site_id}:${e.activity_key}`;
    const before = used.get(key) ?? 0;
    const q = Number(e.quantity);
    const planned = estimates.get(key);
    if (!e.from_order && planned > 0 && before + q > planned + 0.001) e.is_exceeded = 1;
    used.set(key, before + q);
  }
}

// ---------------------------------------------------------------------------
// Checks: the rules the app relies on, so a mistake here is caught before
// anything is written.
// ---------------------------------------------------------------------------

function verify() {
  const problems = [];
  const unique = (table, keyOf, what) => {
    const seen = new Set();
    for (const r of data[table]) {
      const k = keyOf(r);
      if (k === null) continue;
      if (seen.has(k)) problems.push(`${table}: duplicate ${what} ${k}`);
      seen.add(k);
    }
  };
  unique("users", (r) => r.email, "email");
  unique("parent_clients", (r) => r.name, "name");
  unique("proposals", (r) => r.code, "code");
  unique("work_orders", (r) => r.code, "code");
  unique("work_orders", (r) => r.proposal_id, "proposal");
  unique("work_order_sites", (r) => (r.site_id == null ? null : `${r.work_order_id}:${r.site_id}`), "site");
  unique("office_users", (r) => `${r.office_id}:${r.user_id}`, "assignment");
  unique("office_users", (r) => (r.role === "office_manager" ? r.office_id : null), "office manager for office");
  unique("work_order_site_users", (r) => `${r.work_order_site_id}:${r.user_id}`, "assignment");
  unique("wo_site_contractors", (r) => `${r.work_order_site_id}:${r.contractor_id}`, "vendor");
  unique("job_orders", (r) => `${r.work_order_site_id}:${r.jo_number}`, "job order number");
  unique("job_order_contractors", (r) => `${r.job_order_id}:${r.contractor_id}`, "vendor");
  unique("contract_orders", (r) => `${r.work_order_id}:${r.type}:${r.order_number}`, "order number");
  unique("contract_order_contractors", (r) => `${r.contract_order_id}:${r.contractor_id}`, "vendor");

  const users = new Map(data.users.map((u) => [u.id, u]));
  for (const r of data.office_users) {
    const role = users.get(r.user_id).role;
    if ((r.role === "office_manager") !== (role === "office_manager") || (r.role === "operator" && role !== "office_operator")) {
      problems.push(`office_users ${r.id}: a ${role} assigned as ${r.role}`);
    }
  }
  for (const r of data.work_order_site_users) {
    if (users.get(r.user_id).role !== "site_operator") problems.push(`work_order_site_users ${r.id}: not a site operator`);
  }

  const proposals = new Map(data.proposals.map((p) => [p.id, p]));
  for (const wo of data.work_orders) {
    const p = proposals.get(wo.proposal_id);
    if (p.status !== "approved" || p.office_id !== wo.office_id || p.client_id !== wo.client_id) {
      problems.push(`work order ${wo.code}: doesn't match an approved proposal`);
    }
  }

  // A bioremediation site is complete exactly when its latest sample after the
  // zero day one is below the TPH target.
  const samplesBySite = new Map();
  for (const s of data.bio_samples) {
    if (s.application_month === ZERO_DAY) continue;
    const prev = samplesBySite.get(s.work_order_site_id);
    if (!prev || s.sampled_on > prev.sampled_on || (+s.sampled_on === +prev.sampled_on && s.id > prev.id)) {
      samplesBySite.set(s.work_order_site_id, s);
    }
  }
  const sum = (rows, keyOf, valueOf) => {
    const m = new Map();
    for (const r of rows) m.set(keyOf(r), (m.get(keyOf(r)) ?? 0) + valueOf(r));
    return m;
  };
  const procured = sum(
    data.wo_site_expenses.filter((e) => e.activity_key === "oil_zapper"),
    (e) => e.work_order_site_id,
    (e) => Number(e.quantity),
  );
  const applied = sum(data.bio_oil_zapping, (z) => z.work_order_site_id, (z) => Number(z.estimated_quantity));
  for (const site of data.work_order_sites) {
    if (site.process_type !== "bioremediation") continue;
    const latestSample = samplesBySite.get(site.id);
    const complete = !!latestSample && Number(latestSample.tph_value) < TPH_TARGET;
    if (complete !== site.isCompleted) problems.push(`site ${site.id}: completion doesn't match its latest sample`);
    if ((applied.get(site.id) ?? 0) > (procured.get(site.id) ?? 0) + 0.001) {
      problems.push(`site ${site.id}: more oil zapper applied than procured`);
    }
  }

  // A restoration is complete exactly when its certificates use up its schedule of rates.
  const sorById = new Map(data.schedule_of_rates.map((s) => [s.id, s]));
  const jobOrdersBySite = new Map();
  for (const jo of data.job_orders) {
    if (!jobOrdersBySite.has(jo.work_order_site_id)) jobOrdersBySite.set(jo.work_order_site_id, []);
    jobOrdersBySite.get(jo.work_order_site_id).push(jo);
  }
  const activitiesBySite = new Map();
  for (const a of data.site_activity_items) {
    if (!activitiesBySite.has(a.work_order_site_id)) activitiesBySite.set(a.work_order_site_id, []);
    activitiesBySite.get(a.work_order_site_id).push(a);
  }
  for (const site of data.work_order_sites) {
    if (site.process_type !== "restoration") continue;
    const certified = certifiedByActivity(jobOrdersBySite.get(site.id) ?? []);
    const targets = (activitiesBySite.get(site.id) ?? [])
      .map((a) => ({ activity: a.activity, qty: Number(sorById.get(a.schedule_of_rates_id).estimated_quantity) }))
      .filter((t) => t.qty > 0);
    const complete = targets.length > 0 && targets.every((t) => (certified[t.activity] ?? 0) + 0.001 >= t.qty);
    if (complete !== site.isCompleted) problems.push(`restoration ${site.id}: completion doesn't match its certificates`);
  }

  for (const [table, rows] of Object.entries(data)) {
    if (rows.some((r) => r.created_at > NOW)) problems.push(`${table}: a row is dated in the future`);
  }
  return problems;
}

const problems = verify();
if (problems.length) {
  console.error(`The generated data breaks ${problems.length} rule(s):`);
  for (const p of problems.slice(0, 20)) console.error(`  - ${p}`);
  process.exit(1);
}

const printCounts = () => {
  const width = Math.max(...Object.keys(COLUMNS).map((t) => t.length));
  let total = 0;
  for (const [table, rows] of Object.entries(data)) {
    total += rows.length;
    const note = rows.length < COUNT ? `  (under ${COUNT})` : "";
    console.log(`  ${table.padEnd(width)}  ${String(rows.length).padStart(7)}${note}`);
  }
  console.log(`  ${"total".padEnd(width)}  ${String(total).padStart(7)}`);
};

console.log(`Built the demo data (count ${COUNT}, seed ${SEED}); it follows the app's rules.`);
printCounts();

if (DRY_RUN) {
  console.log(
    APPEND
      ? `\nDry run: nothing was written. --append would add these rows to ${db.target}, after the ids already there.`
      : "\nDry run: nothing was written.",
  );
  await db?.conn.end();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Writing it
// ---------------------------------------------------------------------------

const { conn, target } = db;
let emptied = false;

try {
  if (RESET) {
    await pause(`\nAbout to empty every app table in ${target} and load the demo data.`);
    const legacy = LEGACY_TABLES.filter((t) => db.tables.has(t));
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of [...Object.keys(COLUMNS), ...legacy]) await conn.query(`TRUNCATE TABLE \`${table}\``);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    emptied = true;
    console.log(`Emptied ${Object.keys(COLUMNS).length + legacy.length} tables.`);
  } else if (APPEND) {
    await pause(`\nAbout to add the demo data to ${target}, keeping the data already there.`);
  }

  // One transaction, with foreign keys checked, so a failure writes nothing.
  const BATCH = 500;
  const toSql = (v) =>
    v === undefined ? null : v instanceof Date ? v : v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  await conn.beginTransaction();
  try {
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const rows = data[table];
      const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES ?`;
      for (let i = 0; i < rows.length; i += BATCH) {
        const values = rows.slice(i, i + BATCH).map((row) => columns.map((c) => toSql(row[c])));
        await conn.query(sql, [values]);
      }
      process.stdout.write(`\r  loaded ${table}${" ".repeat(30)}`);
    }
    await conn.commit();
    process.stdout.write("\r" + " ".repeat(60) + "\r");
  } catch (error) {
    await conn.rollback();
    throw error;
  }

  console.log(`\nLoaded the demo data into ${target}.`);

  // The ids an --append run added, so --undo can remove exactly those rows.
  // Each table's run of ids is unbroken, and rows added later come after it.
  if (APPEND) {
    const manifest = {
      database: target,
      loadedAt: new Date().toISOString(),
      count: COUNT,
      seed: SEED,
      tables: Object.fromEntries(
        Object.keys(COLUMNS)
          .filter((t) => data[t].length)
          .map((t) => [t, [data[t][0].id, data[t][data[t].length - 1].id]]),
      ),
    };
    const file = path.resolve(
      `demo-data-${target.split(" ")[0]}-${manifest.loadedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`,
    );
    const json = JSON.stringify(manifest, null, 2);
    try {
      fs.writeFileSync(file, json);
      console.log(`\nSaved the ids it added to ${file}.`);
      console.log(`Keep that file: --undo ${path.basename(file)} removes exactly those rows.`);
    } catch (error) {
      console.log(`\nCouldn't save the manifest (${error.message}). Keep a copy of it to undo this run:\n${json}`);
    }
  }

  console.log(`\nDemo logins, all with the password ${PASSWORD}:`);
  for (const [role, email] of DEMO_LOGINS) console.log(`  ${role.padEnd(16)} ${email}`);
  console.log("Every other demo user has the same password, with the email shown on the Users page.");
} catch (error) {
  console.error(
    `\nLoading failed, so no demo data was written${emptied ? " (the tables were already emptied)" : ""}: ${error.message}`,
  );
  process.exitCode = 1;
} finally {
  await conn.end();
}
