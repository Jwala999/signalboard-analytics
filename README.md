# 🚦 Signalboard Analytics OS

> **AI-powered data analytics dashboard** — Upload any CSV/Excel dataset, get instant visual insights, automated business recommendations, and chat with your data using an AI Data Analyst.

![Signalboard](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-20+-green) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![React](https://img.shields.io/badge/React-19-61dafb)

---

## ✨ Features

### 📊 Core Analytics
- **Upload any structured dataset** (CSV, XLS, XLSX) — Signalboard auto-detects column types (numeric, categorical, date, boolean).
- **Overview Dashboard** — KPI cards (Total Orders, AOV, Return Rate, Rows Analyzed), trend charts, and channel/region breakdowns.
- **Smart Filters** — Auto-generated period, channel, and region filters that adapt to your data.

### 🔍 Data Explorer
- **Full data table** with search, pagination, column sorting, and inline editing.
- **Column Profiler** — Click any column header to see detailed statistics (mean, median, missing values, top values, distribution).
- **Download** original or filtered data as CSV.

### 📈 Chart Builder
- Build custom **Bar, Line, Area, and Pie charts** by selecting X/Y axes from your dataset columns.
- Charts are rendered in large, scrollable containers for detailed viewing.

### 🧹 Data Cleaning Studio
- **Calculated Columns** — Create new computed fields using math expressions (e.g., `orders * aov`) without modifying your original file.
- **Non-destructive pipeline** — All transformations are applied dynamically and can be removed at any time.

### 💡 Insights (Business Recommendations)
- **Automated anomaly detection** — Missing values, duplicate rows, and data quality issues are surfaced instantly.
- **AI-powered recommendations** — The Python analytics engine generates actionable business insights from your data.

### 🤖 AI Data Analyst (Copilot)
- **Chat with your data** — Ask natural language questions like *"What is the top-performing region?"* and get precise, grounded answers.
- **Agentic AI** — The Copilot can take actions on your behalf. Ask it to *"Create a calculated column called revenue by multiplying orders by aov"* and it will automatically execute the transformation.
- Powered by **Hugging Face Inference API** (Llama 3.1 8B) — works with any OpenAI-compatible API.

### 🔐 Authentication
- Full **Sign Up / Login / Logout** system with JWT-based sessions and bcrypt password hashing.
- User profile displayed in sidebar and settings page.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Recharts, Radix UI, Tailwind CSS |
| **Backend** | Node.js, Express, tRPC |
| **AI/LLM** | Hugging Face Inference API (Llama 3.1 8B) |
| **Analytics Engine** | Python 3, Pandas |
| **Auth** | JWT, bcryptjs |
| **Build** | Vite, esbuild |
| **Deployment** | Docker, Render |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** 20+ 
- **Python** 3.10+ with `pip`
- **pnpm** (or npm)

### 1. Clone the Repository
```bash
git clone https://github.com/Jwala-Singh/signalboard-analytics.git
cd signalboard-analytics
```

### 2. Install Dependencies
```bash
# Node.js dependencies
npm install

# Python dependencies
pip install pandas openpyxl
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Required for AI Copilot (Hugging Face)
OPENAI_API_KEY=your_huggingface_api_key_here
OPENAI_BASE_URL=https://router.huggingface.co/v1

# Auto-generated if not set
JWT_SECRET=your_jwt_secret_here
```

### 4. Start the Development Server
```bash
npm run dev
```

The app will be running at **http://localhost:5000**.

---

## 🐳 Docker Deployment

### Build and Run Locally
```bash
docker build -t signalboard-analytics .
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your_key \
  -e OPENAI_BASE_URL=https://router.huggingface.co/v1 \
  -e JWT_SECRET=your_secret \
  signalboard-analytics
```

### Deploy to Render (Recommended)
1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → **New +** → **Blueprint**.
3. Connect the GitHub repository.
4. Render will auto-detect the `render.yaml` and deploy.
5. Add environment variables (`OPENAI_API_KEY`, `OPENAI_BASE_URL`) in the Render dashboard.

---

## 📁 Project Structure

```
signalboard-analytics/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx    # Main application controller
│   │   ├── components/     # Reusable UI components (Radix)
│   │   └── index.css       # Global styles & design system
│   └── index.html
├── server/                 # Node.js backend
│   ├── _core/
│   │   ├── index.ts        # Express server entry point
│   │   ├── llm.ts          # LLM integration (Hugging Face)
│   │   ├── env.ts          # Environment variable config
│   │   └── trpc.ts         # tRPC router setup
│   ├── routers.ts          # API routes (auth, analytics, chat)
│   └── analytics.ts        # Python bridge & chat logic
├── scripts/
│   └── analyze_dataset.py  # Python analytics engine (Pandas)
├── shared/                 # Shared types & constants
├── Dockerfile              # Production Docker image
├── render.yaml             # Render deployment config
├── package.json
└── .env                    # Environment variables (not committed)
```

---

## 🎯 Usage Guide

### Uploading Data
1. Click **Upload dataset** (top right).
2. Select a CSV or Excel file.
3. Signalboard will auto-detect column types and render the dashboard.

### Using the AI Copilot
1. Click the **Copilot** button (top right).
2. Ask questions like:
   - *"What are the top 5 regions by order volume?"*
   - *"Are there any missing values I should worry about?"*
   - *"Create a calculated column called profit using orders * aov"*

### Building Charts
1. Navigate to **Chart builder** in the sidebar.
2. Select chart type (Bar, Line, Area, Pie).
3. Choose X-axis and Y-axis columns.
4. Click **Build chart**.

---

## 🔧 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Hugging Face API key for AI Copilot |
| `OPENAI_BASE_URL` | Yes | `https://router.huggingface.co/v1` |
| `JWT_SECRET` | No | Auto-generated if not set. Used for auth tokens. |
| `PORT` | No | Server port (default: 5000) |

---

## 📝 API Endpoints (tRPC)

| Procedure | Type | Description |
|---|---|---|
| `auth.me` | Query | Get current authenticated user |
| `auth.signup` | Mutation | Register a new user |
| `auth.login` | Mutation | Log in with email/password |
| `auth.logout` | Mutation | Clear session cookie |
| `analytics.analyze` | Mutation | Upload and analyze a dataset (Python) |
| `analytics.chat` | Mutation | Chat with the AI Data Analyst |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 Author

**Jwala Singh**  
📧 jwalakumar961645@gmail.com  
🔗 [GitHub](https://github.com/Jwala-Singh)

---

> Built with ❤️ using React, Node.js, Python, and AI.
