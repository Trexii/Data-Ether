# Data Ether — AI Tabular Extraction Engine
### Azist Take-Home Project Submission

> A high-performance, full-stack tabular intelligence engine built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **PostgreSQL**, and **Google Gemini API**. Transforms natural language queries into structured, sortable, exportable data tables with client-side Excel generation, persistent cloud storage, and a responsive obsidian-glass UI.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [Two-Phase Generation & AWS Gateway Timeout Solution](#4-two-phase-generation--aws-gateway-timeout-solution)
5. [Database Schema & Design Decisions](#5-database-schema--design-decisions)
6. [API Endpoints](#6-api-endpoints)
7. [Environment Variables](#7-environment-variables)
8. [Local Development Setup](#8-local-development-setup)
9. [AWS RDS PostgreSQL Setup Guide (New AWS Account)](#9-aws-rds-postgresql-setup-guide-new-aws-account)
10. [AWS Amplify Deployment](#10-aws-amplify-deployment)

---

## 1. Project Overview

**Data Ether** was developed as a take-home assessment for **Azist**. The goal was to build a production-grade tool that solves the challenge of extracting structured, tabular information from unstructured user prompts—delivering instantaneous feedback, data integrity, and cross-platform mobile usability without succumbing to cloud infrastructure limitations like serverless execution timeouts.

### Core Highlights:
- **Instant Response Time:** Initial schema and row batch load in under 2 seconds.
- **Client-Side Excel Export:** Zero server load; generates formatted multi-sheet `.xlsx` workbooks directly in the browser.
- **Nexus Vault Persistence:** Persists datasets to PostgreSQL with instant reload capabilities that bypass AI generation costs.
- **100% Mobile Phone Compatible:** Dynamic viewport height (`100dvh`), fluid layouts, touch-friendly targets, and 2D momentum scrolling.
- **Ranking Integrity & Security:** Hardened against prompt injection and arbitrary position bias (*e.g., "put X at #1"*).

---

## 2. Key Features

### 🌌 Liquid Obsidian & Cosmic Phonk Aesthetics
- **Canvas Starfield:** Dynamic 2D HTML5 canvas starfield with 3 parallax depth layers, interactive typing speed hue-shifts, and keystroke shockwaves.
- **Matrix Scramble Reveal (`ScrambleCell`):** Staggered reveal animation with temporary alphanumeric glyph scrambling before locking into selectable text.
- **Kinetic Snapshot Flight (`SnapshotFlyer`):** Camera shutter flash on save or export; captures the table into an animated card that arcs into the Vault icon or browser download tray.

### 📱 100% Phone & Mobile Compatibility
- Uses `100dvh` (dynamic viewport height) to prevent mobile browser address and navigation bars from obscuring action buttons.
- Responsive table container with 2D horizontal and vertical scroll (`touch-pan-x touch-pan-y`).
- Font sizing calibrated (`>= 16px` on inputs) to prevent unwanted iOS Safari auto-zoom.
- Adaptive typography, compact toolbars, and centered bottom toast alerts with independent lifecycles.

### 🛡️ Anti-Manipulation & Ranking Integrity Guard
- **Deterministic Sanitization:** Regex-based pre-flight filter strips prompt commands attempting to bias rankings.
- **Model Guardrails:** Explicit system instructions enforce objective consensus rankings.
- **Transparent Note & Integrity Notice:** Informs the user when custom rank manipulation is rejected while preserving factual data.
- **Sequential Rank Sanitizer:** Server and client verify that `Rank` columns are strictly consecutive positive integers, preventing model year hallucinations (*e.g., 2019 placed into Rank*).

### ⚡ Query Optimizer (`POST /api/optimize-query`)
- Condenses wordy prompts into crisp tabular search terms (*e.g., "Can you list all the biggest tech companies..."* $\rightarrow$ *"Top 20 biggest software companies by market cap"*).
- Detects already-optimized queries and avoids unnecessary modifications.

---

## 3. Architecture & Tech Stack

```
                              +------------------------------------------+
                              |         Next.js App Router (Client)      |
                              |   - Monolithic Phonk Glass UI            |
                              |   - Sortable & Filterable DataTable      |
                              |   - In-Browser ExcelJS (.xlsx) Export    |
                              |   - Nexus Vault Modal & Toasts           |
                              +--------------------+---------------------+
                                                   |
                 +---------------------------------+---------------------------------+
                 |                                 |                                 |
        [Two-Phase Generation]              [Data Persistence]               [Cached Retrieval]
                 |                                 |                                 |
                 v                                 v                                 v
   +---------------------------+       +------------------------+       +-------------------------+
   | POST /api/generate        |       | POST /api/datasets     |       | GET /api/datasets       |
   | Batch 1: initial (<2s)    |       | - Zod validation       |       | GET /api/datasets/:id   |
   | Batch 2: continuation (~2s|       | - Parametrized SQL     |       | DELETE /api/datasets/:id|
   | - IP Rate Limit & Cap     |       +-----------+------------+       +------------+------------+
   +-------------+-------------+                   |                                 |
                 |                                 |                                 |
                 +---------------------------------+---------------------------------+
                                                   |
                                                   v
                                 +-----------------------------------+
                                 |   Amazon RDS PostgreSQL Database  |
                                 | - datasets (JSONB columns & rows) |
                                 | - generation_cache (6h TTL)       |
                                 | - usage_counter (Daily AI cap)    |
                                 +-----------------------------------+
```

### Technology Breakdown
- **Framework:** Next.js 16.4.0 (App Router, Turbopack)
- **Language:** TypeScript 7.0 (strict type safety)
- **Styling:** Tailwind CSS 3.4 (custom glassmorphism, responsive utilities)
- **AI Engine:** Google Gemini Flash (`@google/generative-ai` with automated fallback)
- **Database:** PostgreSQL (`pg` connection pool with auto-reconnection and SSL support)
- **Validation:** Zod 4.6 (runtime API contract enforcement)
- **Animations:** Framer Motion 14.1 & HTML5 Canvas
- **Excel Generation:** ExcelJS 4.4 (dynamically imported in-browser)
- **Icons:** Lucide React

---

## 4. Two-Phase Generation & AWS Gateway Timeout Solution

### The Challenge
AWS Amplify Hosting and AWS API Gateway enforce a strict, non-configurable **30-second gateway timeout** on Server-Side Rendering (SSR) API routes. Heavy LLM queries that generate 25–40 full rows in a single prompt frequently exceed 30 seconds on cold starts or high model load, triggering a `504 Gateway Timeout`.

### The Solution: Background Two-Phase Progressive Batching
1. **Initial Batch (`batch: "initial"`):**
   - The server calls Gemini to determine column definitions, context notes (`Note:`), and the first 10–15 rows.
   - Completes in **~1.5 to 2.2 seconds**, well below the 30-second ceiling.
2. **Continuation Batch (`batch: "continuation"`):**
   - Triggered automatically in the background by the client if more rows are needed (`hasMore: true`).
   - Supplies established columns and existing entity keys to prevent duplicates.
   - Completes in **~1.8 to 2.5 seconds**.
3. **Smooth Reveal:**
   - The user sees a smooth 5-phase progress bar that advances monotonically to 100%.
   - The final, assembled table renders cleanly without partial flashes.
4. **Cache Merging:**
   - The complete merged dataset is saved to `generation_cache`. Repeat queries return in **< 10ms**.

---

## 5. Database Schema & Design Decisions

Raw parameterized SQL is used via `pg.Pool` without heavy ORM overhead to keep the codebase lightweight and performant.

### PostgreSQL Schema (`db/schema.sql`):
```sql
CREATE TABLE IF NOT EXISTS datasets (
  id          SERIAL PRIMARY KEY,
  query       TEXT        NOT NULL,
  note        TEXT,
  columns     JSONB       NOT NULL,
  rows        JSONB       NOT NULL,
  row_count   INTEGER     NOT NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON datasets (created_at DESC);

CREATE TABLE IF NOT EXISTS generation_cache (
  cache_key   TEXT PRIMARY KEY,
  response    JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counter (
  day    DATE PRIMARY KEY,
  calls  INTEGER NOT NULL DEFAULT 0
);
```

### Architectural Decisions & Trade-Offs:
- **Why JSONB for columns and rows?**
  Different queries have completely different schemas (e.g. *Fortune 500* has *Company/CEO/Revenue*, while *Top Cricketers* has *Player/Country/Runs*). JSONB allows persisting arbitrary tabular structures in a single table without continuous schema migrations.
- **Connection Resilience (`lib/db.ts`):**
  Uses a pool with `max: 10`, `connectionTimeoutMillis: 15000`, and automatic single-retry logic for transient connection termination common in serverless cloud databases.

---

## 6. API Endpoints

All error responses adhere to the standard JSON structure:
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable explanation"
  }
}
```

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/generate` | Generates initial or continuation tabular data; checks cache & database | `200`, `400`, `422`, `429`, `502`, `504` |
| `POST` | `/api/optimize-query` | Rewrites user query into crisp search format | `200`, `400`, `429`, `500` |
| `GET` | `/api/datasets` | Lists the 100 most recent saved datasets | `200`, `503` |
| `POST` | `/api/datasets` | Saves a generated dataset to PostgreSQL | `201`, `400`, `503` |
| `GET` | `/api/datasets/:id` | Retrieves full dataset by ID (no AI call) | `200`, `400`, `404`, `503` |
| `DELETE` | `/api/datasets/:id` | Deletes dataset by ID | `204`, `400`, `404`, `503` |
| `GET` | `/api/health` | Health check verifying database responsiveness (`SELECT 1`) | `200`, `503` |

---

## 7. Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Model Selection
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite

# PostgreSQL Database Connection String
DATABASE_URL=postgresql://postgres:your_password@your-rds-endpoint.us-east-1.rds.amazonaws.com:5432/azist_db

# Enable SSL for AWS RDS PostgreSQL
DB_SSL=true

# Security, Caching & Rate Limits
AI_TIME_BUDGET_MS=30000
RATE_LIMIT_PER_MIN=5
DAILY_AI_CAP=150
CACHE_TTL_HOURS=6
```

---

## 8. Local Development Setup

### 1. Prerequisites
- Node.js 18+ (Node 20 or 22 recommended)
- PostgreSQL database instance or local PostgreSQL

### 2. Clone and Install
```bash
git clone https://github.com/Trexii/fictional-spoon.git
cd fictional-spoon
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your GEMINI_API_KEY and DATABASE_URL
```

### 4. Initialize Database & Seed
```bash
# Creates datasets, generation_cache, and usage_counter tables
npm run db:init

# Pre-seeds the Fortune 500 Top 20 dataset into the database & cache
npm run db:seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 9. AWS RDS PostgreSQL Setup Guide (New AWS Account)

Follow these exact steps to create and connect a new Amazon RDS PostgreSQL database on your new AWS account:

### Step 1: Open Amazon RDS Console
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Select your preferred region (e.g., `us-east-1` N. Virginia or `ap-south-1` Mumbai).
3. Search for **RDS** in the top search bar and click **Databases**.

### Step 2: Create Database
1. Click the orange **Create database** button.
2. Choose a database creation method: Select **Standard create**.
3. Engine options: Select **PostgreSQL**.
4. Engine Version: Keep default (e.g., PostgreSQL 16.x or 15.x).
5. Templates: Select **Free tier** (gives 750 hours/month of db.t4g.micro/db.t3.micro).

### Step 3: Configure Settings & Credentials
1. **DB instance identifier:** `azist-db`
2. **Master username:** `postgres`
3. **Master password:** Choose a strong password (e.g., `AzistSecurePass2026!`). Note this down!
4. **Confirm password:** Re-enter your password.

### Step 4: Instance & Connectivity
1. **DB instance class:** `db.t4g.micro` or `db.t3.micro`.
2. **Storage:** Keep 20 GiB (General Purpose SSD gp2/gp3).
3. **Virtual Private Cloud (VPC):** Default VPC.
4. **Public access:** Select **Yes** (required so your local machine and AWS Amplify can connect).
5. **VPC security group:** Select **Create new**, name it `azist-rds-sg`.
6. **Database port:** `5432`.

### Step 5: Additional Configuration
1. Expand **Additional configuration** at the bottom.
2. **Initial database name:** `azist_db`.
3. Uncheck *Enable automated backups* if you want to stay strictly within minimum resource usage for evaluation.
4. Click **Create database**.

### Step 6: Configure Inbound Security Group Rule (CRITICAL)
Once the database status is **Available** (takes ~5–8 minutes):
1. Click on `azist-db`.
2. Under **Connectivity & security**, click the link under **VPC security groups** (`azist-rds-sg`).
3. Select the security group, click the **Inbound rules** tab, and click **Edit inbound rules**.
4. Click **Add rule**:
   - **Type:** `PostgreSQL`
   - **Port:** `5432`
   - **Source:** Select `Anywhere-IPv4` (`0.0.0.0/0`) so AWS Amplify SSR servers and your local terminal can connect.
5. Click **Save rules**.

### Step 7: Get Connection String & Initialize Tables
1. Go back to RDS Database details and copy your **Endpoint** (e.g., `azist-db.cxxxxxx.us-east-1.rds.amazonaws.com`).
2. Construct your `DATABASE_URL`:
   ```
   postgresql://postgres:YOUR_PASSWORD@YOUR_ENDPOINT:5432/azist_db
   ```
3. Update `.env.local`:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_ENDPOINT:5432/azist_db
   DB_SSL=true
   ```
4. Run the database setup commands from your project root:
   ```bash
   npm run db:init
   npm run db:seed
   ```
   You will see: `Database initialized successfully!` and `Cached responses pre-seeded successfully!`.

---

## 10. AWS Amplify Deployment

1. Push your repository to GitHub.
2. Go to **AWS Amplify Console** → **Host web app**.
3. Connect your GitHub repository and select the branch (`main`).
4. In the build configuration step, verify `amplify.yml` (included in repository root).
5. In **Environment variables**, set:
   - `GEMINI_API_KEY`: Your Gemini API Key
   - `DATABASE_URL`: Your Amazon RDS PostgreSQL URL
   - `DB_SSL`: `true`
   - `RATE_LIMIT_PER_MIN`: `5`
   - `DAILY_AI_CAP`: `150`
   - `CACHE_TTL_HOURS`: `6`
6. Click **Save and deploy**. Amplify will build and host the application with full SSR App Router support.

---

*Submitted for the Azist Technical Assessment.*
