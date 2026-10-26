# 📦 StockSphere — Intelligent Inventory & Knowledge Graph Management System

StockSphere is a modern, enterprise-grade Inventory Management System powered by a **Hybrid MongoDB + Neo4j Graph Architecture**. It combines document store transactional reliability and aggregation speed with graph-native path traversal for supply chain intelligence, alternative vendor discovery, and bottleneck prevention.

---

## 🌟 Key Features

* **📊 Operations Dashboard:** Real-time catalog analytics powered by MongoDB `$facet`, `$group`, and `$lookup` aggregation pipelines.
* **📦 Product Catalog & Stock Control:** Full inventory tracking with SKU classification, stock-on-hand thresholds, and safety buffer calculations.
* **🔍 Forensic Stock Movement Ledger:** Complete audit trail tracking `STOCK_IN`, `STOCK_OUT`, and `ADJUSTMENT` operations with timestamps and user attribution.
* **🚚 Supplier & Warehouse Management:** Vendor lead times, contact details, multi-warehouse physical storage allocation.
* **📑 Purchase Order Workflow:** Dynamic draft, submission, and fulfillment lifecycle tracking with automatic inventory restock.
* **🧠 Inventory Intelligence (Neo4j Graph Engine):**
  * Cypher multi-hop traversals detecting single points of failure.
  * Faster alternative vendor discovery (e.g. 2-day delivery vs 10-day primary lead times).
  * Cross-SKU substitute recommendations based on shared category taxonomy.
  * **Interactive Topology Canvas:** React Flow visualization with live search, alert filters, and path isolation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Recharts, @xyflow/react |
| **Backend** | Node.js, Express.js, Helmet, Morgan, JSON Web Tokens (JWT), Bcrypt |
| **Primary Database** | MongoDB (with automatic in-memory fallback via `mongodb-memory-server`) |
| **Graph Database** | Neo4j Bolt Protocol (with authoritative dual-mode in-memory graph engine) |

---

## 🚀 Quick Start (Windows)

### 1-Click Startup
Double-click **`start-all.bat`** in the root directory. It will launch both backend (Port 5000) and frontend (Port 5173) and open your browser automatically!

### Manual Terminal Launch

#### Backend Server:
```powershell
cd server
npm install
npm run dev
```

#### Frontend Client:
```powershell
cd client
npm install
npm run dev
```

Access the application in your browser at:
[`http://localhost:5173`](http://localhost:5173)

---

## 🔐 Demo Credentials

Quick Fill buttons are built into the login screen:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@stocksphere.com` | `admin123` |
| **Staff / Store Keeper** | `staff@stocksphere.com` | `staff123` |

---

## 📂 Project Structure

```text
stocksphere/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── api/                # Axios API client
│   │   ├── components/         # Common UI & Graph Components
│   │   ├── context/            # AuthContext & Session management
│   │   ├── pages/              # Dashboard, Products, Stock, Intelligence, etc.
│   │   └── utils/              # Currency and Number formatters
│   └── vite.config.js          # Dev server with /api proxy
├── server/                     # Express.js Backend
│   ├── scripts/                # Baseline database seeding scripts
│   ├── src/
│   │   ├── config/             # MongoDB and Neo4j connection drivers
│   │   ├── controllers/        # REST route handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/             # Mongoose schemas (Product, Supplier, etc.)
│   │   ├── routes/             # Express API routes
│   │   └── services/           # Graph sync & Intelligence algorithms
│   └── package.json
├── package.json                # Monorepo root scripts
├── start-all.bat               # 1-Click Windows Batch Launcher
└── README.md
```

---

## 📄 License
Academic and Educational Project — 2026.
