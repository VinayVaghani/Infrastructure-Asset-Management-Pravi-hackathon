# 🏛️ InfraTrack: Government Infrastructure Asset Lifecycle Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)

An enterprise-grade, high-transparency platform engineered for municipal corporations, state departments, and infrastructure authorities to monitor, manage, and govern public infrastructure assets across their complete lifecycle.

---

## 🌟 Key Capabilities & Modules

- 🗺️ **Interactive GIS Map Explorer**: Geospatial mapping of public assets (highways, bridges, water supply, schools, hospitals) with live condition status tags.
- 📦 **Asset Registry & Lifecycle Management**: End-to-end tracking from acquisition, commissioning, operational depreciation, maintenance histories, through decommissioning.
- 🏗️ **Capital Projects & Work Works**: Real-time project tracking with milestone progress, physical & financial completion percentages, contractor allocations, and geo-fenced verification.
- 🛠️ **Preventive & Corrective Maintenance**: Work order assignment, technician dispatch, schedule tracking, and automated degradation alerts.
- 🔍 **Inspections & Condition Assessment**: Standardized inspection checklists, condition rating scores (1-100), risk matrix, and photo uploads with geo-tagging.
- 📢 **Citizen Grievance Redressal**: Public portal for citizens to report infrastructure defects (potholes, water leaks, streetlights) with SLA tracking.
- 💰 **Departmental Budget & Fiscal Governance**: Allocation tracking, expenditure vs budget reconciliation, and audit trails.
- 🔐 **Role-Based Access Control (RBAC)**: Segregated roles for Administrators, Department Officers, Field Inspectors, Financial Auditors, and Citizens.

---

## 🏗️ Architecture & Tech Stack

```text
InfraTrack Monorepo
│
├── client/              # React 18 SPA (Vite, TailwindCSS, Leaflet, Recharts)
│   ├── src/pages/       # Dashboard, Assets, Projects, Maintenance, Grievances, etc.
│   ├── src/components/  # Navigation, Modal, Tables, GIS Maps, Charts
│   └── src/services/    # Axios API client with automatic JWT bearer interceptor
│
├── server/              # Node.js + Express REST API Server
│   ├── config/          # Database (Mongoose) & Cloudinary configurations
│   ├── controllers/     # Controller business logic
│   ├── models/          # MongoDB Mongoose schemas
│   ├── routes/          # Express API route endpoints
│   └── seed/            # Mock dataset seeder for quick demos
│
└── package.json         # Root orchestrator for concurrently running client & server
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection string.

### 2. Clone and Install Dependencies

```bash
git clone https://github.com/VinayVaghani/Infrastructure-Asset-Management-Pravi-hackathon.git
cd Infrastructure-Asset-Management-Pravi-hackathon

# Install root, backend, and frontend dependencies in one command:
npm run install:all
```

### 3. Configure Environment Variables

#### Backend (`server/.env`):
Create a file at `server/.env` (or copy from `server/.env.example`):
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/infratrack
JWT_SECRET=your_jwt_super_secret_key_change_in_production_2026
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173

# Optional: Cloudinary for cloud image storage (defaults to local /uploads if left empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
UPLOAD_DIR=./uploads
```

#### Frontend (`client/.env`):
Create a file at `client/.env` (optional for local, defaults to port 5000):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Seed Demo Data (First time run)
Populate sample departments, infrastructure assets, capital projects, work orders, and demo users:
```bash
npm run seed
```

### 5. Run the Application
From the root directory, run both Backend & Frontend simultaneously with a single command:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Login Credentials

Once seeded, you can test different role perspectives:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@infratrack.gov.in` | `Admin@123` |
| **Public Works Officer** | `pwd.officer@infratrack.gov.in` | `Officer@123` |
| **Field Inspector** | `inspector.patel@infratrack.gov.in` | `Inspector@123` |
| **Finance Auditor** | `auditor.sharma@infratrack.gov.in` | `Auditor@123` |
| **Citizen User** | `citizen.verma@example.com` | `Citizen@123` |

---

## ⚡ Deploying Everything on Vercel (Unified Monorepo)

The repository is already configured with Serverless API functions and Vercel routing rewrites:

1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Keep the default settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
3. Add the following **Environment Variables**:
   - `MONGO_URI`: `mongodb+srv://...` (Your MongoDB Atlas connection URI)
   - `JWT_SECRET`: *Your JWT Secret*
   - `JWT_EXPIRE`: `30d`
   - `CLOUDINARY_CLOUD_NAME`: `dkwlzcbha`
   - `CLOUDINARY_API_KEY`: `835179794795973`
   - `CLOUDINARY_API_SECRET`: `BvubRzsZsgOhZv--8UBtBzzs3Lc`
4. Click **Deploy**. Your frontend and serverless API will both be live under the same domain!

---

### Backend (Web Service)
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: *Your MongoDB Atlas connection URI*
   - `JWT_SECRET`: *A secure random string*
   - `CLIENT_URL`: *Your Render Frontend URL (e.g. `https://infratrack.onrender.com`)*
5. Note your backend service URL (e.g. `https://infratrack-api.onrender.com`).

### Frontend (Static Site)
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your GitHub repository.
3. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://infratrack-api.onrender.com/api`
5. **SPA Rewrite Rule** (*Required*):
   - Under **Redirects/Rewrites**, add:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`

---

## 📜 Available NPM Scripts

From the root directory:
- `npm run dev` — Starts both backend (port 5000) and frontend (port 5173) in parallel.
- `npm run dev:server` — Starts only the Express backend with hot-reload (`nodemon`).
- `npm run dev:client` — Starts only the Vite frontend dev server.
- `npm run build` — Compiles and optimizes the React frontend for production (`client/dist`).
- `npm run seed` — Seeds MongoDB with mock infrastructure dataset.
- `npm run install:all` — Installs dependencies across root, server, and client.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
