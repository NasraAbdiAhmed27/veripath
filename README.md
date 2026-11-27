# VeriPath — Credential Recognition & Skills Verification System

VeriPath is a web application designed to help displaced professionals and skilled talent with missing or unrecognized credentials build a verifiable **Digital Skills Passport**, complete practical competency checks, estimate fee-waiver or bridging voucher support, and connect with employers through fellowship requests.

Built by **Nasra Abdi Ahmed**.

---

## Core Portals & Features

### 1. Beneficiary Portal
* **Digital Skills Passport Builder:** Captures candidate background, target role, education history, document status (such as missing or unrecognized records), work readiness, practical work proof, and a generated `SHA-256` record fingerprint.
* **Practical Competency Check:** Evaluates scenario-based decision-making and attaches verification status directly to the selected passport record.
* **Fee-Waiver & Bridging Voucher Estimator:** Calculates estimated assessment fees, bridging support, and connectivity/transit allowances for partner NGOs and sponsors.

### 2. Employer Portal
* **Candidate Directory & Search:** Filter candidates by role, skills, location, or verified competency status.
* **Candidate Dossiers:** Review work proof, document status, voucher estimates, and record codes.
* **Fellowship Requests:** Submit fellowship or interview requests and track issued requests in a live table.

---

## Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
* **Backend & Database:** Supabase (PostgreSQL with Row Level Security)
* **Hosting:** GitHub Pages / Netlify

---

## Setup & Deployment

1. **Create Database Tables:** Run `supabase/schema.sql` inside your Supabase project's **SQL Editor**.
2. **Configure Supabase Keys:** Update `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `backend.js` with your project URL and publishable (`anon`) key.
3. **Publish Live:** Push the repository to GitHub and deploy the root directory via **GitHub Pages** or **Netlify**. 