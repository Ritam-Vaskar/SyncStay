# 🎯 SyncStay — Group Inventory Management Platform

> **Live:** [staysync.fedkiit.com](https://staysync.fedkiit.com) &nbsp;|&nbsp; **API:** [ssapi.fedkiit.com](https://ssapi.fedkiit.com) &nbsp;|&nbsp; **Telegram Bot:** [@syncstay_bot](https://web.telegram.org/k/#@syncstay_bot)

A comprehensive full-stack platform for managing group hotel inventory for MICE events and destination weddings. SyncStay digitizes the entire event lifecycle — from RFP submission to AI-powered hotel recommendations, flight bookings, guest invitations, and payment — replacing offline chaos with a streamlined digital workflow.

---

## 🌟 Features

### 🏗️ Core Platform
- **Multi-Role System** — Admin, Event Planner, Hotel/Supplier, and Guest roles with granular RBAC permissions
- **Event Management** — Create and manage events with custom pricing tiers, booking rules, and public/private access control
- **Instant Microsite Engine** — Auto-generated branded microsites (slug-based URLs) for each approved event with role-based dashboards
- **Inventory Management** — Lock hotel inventory per event, track real-time room availability via WebSockets
- **RFP & Proposal Workflow** — Hotels browse events, submit proposals (room pricing, facilities, amenities); planners compare and select
- **Booking System** — Self-service booking with integrated Razorpay payment gateway
- **Real-Time Updates** — Socket.IO-powered live inventory changes, booking notifications, and admin↔planner chat

### 🤖 AI & ML Features
- **AI Chatbot Agent** — Natural-language event assistant powered by OpenAI Agents SDK with mem0 persistent memory, MCP tool calling, and input/output guardrails
- **Semantic Event Search** — Events are chunked and embedded (OpenAI `text-embedding-3-large`) into Qdrant vector DB for cosine-similarity search
- **ML Hotel Recommendations** — 4-step pipeline: Haversine radius filtering → Qdrant activity vector search → best-match selection → proximity-sorted candidates
- **Personalized Event Recommendations** — Hybrid scoring (60% vector similarity + 20% popularity + 20% recency) with cold-start fallback to trending events
- **MCP Server** — FastMCP stdio server exposing `search_events` and `get_event_hotel_proposals` tools for the AI agent

### 📱 Telegram Bot Integration
- **[@syncstay_bot](https://web.telegram.org/k/#@syncstay_bot)** — Full Telegram bot for interacting with the SyncStay AI agent
- `/start` — Welcome & account status check
- `/link email password` — Link your SyncStay account to Telegram
- `/unlink` — Disconnect your account
- Any message → forwarded to the AI agent, response sent back in Telegram
- Webhook mode (production) / Polling mode (dev)

### ✈️ Flight Booking (TBO API)
- **Group Flight Management** — Planners configure flights per event, auto-group guests by origin city
- **Live Flight Search** — Real flight search via TBO/TekTravels API with fare quotes
- **Guest Booking** — Guests view assigned flights, book, and receive e-tickets
- **Bulk Payment** — Planner-side upfront payment for private events

### 📨 Guest Invitation System
- **Manual + Bulk Upload** — Add guests individually or via Excel/CSV with auto-generated invitation tokens
- **Email Invitations** — Tokenized invitation links that auto-register/login guests and redirect to the event microsite
- **Group Assignment** — Auto-creation of inventory groups with flexible guest management

### 🛡️ Admin Panel
- **Analytics Dashboard** — Platform-wide stats with interactive Recharts graphs (line, bar, pie) for trends, growth, and revenue
- **Event Approvals** — Review, approve/reject pending events with comments (real-time socket-updated)
- **Audit Logs** — Searchable, filterable, exportable (CSV) audit trail of all platform actions
- **Feedback / Chat** — Real-time bidirectional chat between admins and planners per event
- **User Management** — Full CRUD across all roles with search, filtering, and password reset

### 💳 Payment Integration
- **Razorpay Gateway** — Create orders, verify HMAC signatures server-side, record payments with audit logging
- **Admin Refunds** — Admin-only refund processing

### 📝 Event Activity Logging
- Granular tracking of event-lifecycle actions (bookings, guest changes, event updates, microsite publish)
- Real-time 30s polling with category filtering and deduplication

### 🔧 Technical Features
- JWT Authentication with refresh tokens
- Role-Based Access Control (RBAC)
- RESTful API architecture
- Real-time WebSocket communication (Socket.IO)
- Responsive UI with Tailwind CSS + Framer Motion animations
- Input validation and sanitization
- Rate limiting, Helmet security headers, CORS
- Comprehensive error handling and logging

---

## 🛠️ Tech Stack

### Backend (Node.js)
| Category | Technology |
|----------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Vector DB | Qdrant (5 collections, 3072-dim embeddings) |
| Auth | JWT (jsonwebtoken), bcrypt |
| Real-time | Socket.IO |
| Payments | Razorpay |
| Flights | TBO/TekTravels API |
| Telegram | node-telegram-bot-api |
| Security | Helmet, CORS, Rate Limiting, Express Validator |

### ML Server (Python)
| Category | Technology |
|----------|-----------|
| Framework | FastAPI + Uvicorn |
| AI Agent | OpenAI Agents SDK + mem0 |
| Embeddings | OpenAI `text-embedding-3-large` |
| Vector Search | Qdrant |
| Tool Protocol | MCP (Model Context Protocol) via FastMCP |
| Guardrails | Input/Output tripwire guardrails |
| Geocoding | Nominatim (geopy) |

### Frontend (React)
| Category | Technology |
|----------|-----------|
| Framework | React 18 (JSX) |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Routing | React Router v6 |
| Forms | React Hook Form |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | React Hot Toast |
| Animations | Framer Motion |

### Infrastructure
| Category | Technology |
|----------|-----------|
| Containers | Docker + Docker Compose |
| Frontend Server | Nginx |
| Reverse Proxy | Nginx (production) |
| Vector DB | Qdrant Cloud (or self-hosted via Docker) |

---

## 📁 Project Structure

```
SyncStay/
├── server/                     # Node.js / Express backend
│   ├── src/
│   │   ├── config/            # Environment & DB config
│   │   ├── controllers/       # Route controllers
│   │   ├── middlewares/       # Auth, error handling, RBAC
│   │   ├── models/            # Mongoose models (User, Event, Booking, etc.)
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic (Telegram bot, etc.)
│   │   ├── sockets/           # Socket.IO event handlers
│   │   ├── scripts/           # Seed scripts, embedding generation
│   │   ├── utils/             # Helpers & utilities
│   │   └── app.js             # App entry point
│   ├── Dockerfile
│   └── package.json
│
├── client/                     # React / Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable components (ChatBot, ActivityLog, etc.)
│   │   ├── layouts/           # Dashboard & Microsite layouts
│   │   ├── pages/             # All page components
│   │   ├── services/          # API clients & socket service
│   │   ├── store/             # Zustand stores
│   │   ├── styles/            # Global styles
│   │   └── utils/             # Helper functions
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── ml-server/                  # Python / FastAPI ML backend
│   ├── agent/                 # AI chatbot agent (OpenAI Agents SDK + mem0)
│   ├── event/                 # Event embedding & semantic search
│   ├── hotel/                 # Hotel recommendation engine
│   ├── mcp-server/            # MCP tools (event search, hotel proposals)
│   ├── index.py               # FastAPI app entry point
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml          # Main: backend + frontend + ml-server
├── docker-compose.qdrant.yml   # Self-hosted Qdrant vector DB
└── .env.docker                 # Production environment variables
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB (v6+ or Atlas)
- Docker & Docker Compose (for deployment)

### Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/Ritam-Vaskar/SyncStay.git
cd SyncStay
```

#### 2. Setup Backend
```bash
cd server
npm install
cp .env.example .env   # Edit with your credentials
npm run dev             # Runs on http://localhost:5001
```

#### 3. Setup Frontend
```bash
cd client
npm install
npm run dev             # Runs on http://localhost:5173
```

#### 4. Setup ML Server
```bash
cd ml-server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add OpenAI key, Qdrant credentials
python index.py        # Runs on http://localhost:8020
```

#### 5. Seed Database
```bash
cd server
npm run seed            # Creates sample users, events, inventory, etc.
```

### 🐳 Docker Deployment

```bash
# Start all services (backend + frontend + ml-server)
docker compose up -d --build

# Optional: self-hosted Qdrant
docker compose -f docker-compose.qdrant.yml up -d
```

### Environment Variables

**Backend (`server/.env` or `.env.docker`)**
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `CLIENT_URL` | Frontend URL(s), comma-separated |
| `ML_SERVER_URL` | ML server URL (`http://ml-server:8020` in Docker) |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather |
| `SERVER_URL` | Public backend URL (for webhook mode) |
| `OPENAI_API_KEY` | OpenAI API key |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key |
| `TBO_USERNAME` / `TBO_PASSWORD` | TBO flight API credentials |
| `EMAIL_USER` / `EMAIL_PassKey` | Gmail app password for invitations |

**ML Server (`ml-server/.env`)**
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `BACKEND_URL` | Node backend URL |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key |

---

## 🤖 Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token
2. Set `TELEGRAM_BOT_TOKEN` and `SERVER_URL` in your env
3. Deploy the backend, then register the webhook:
   ```bash
   curl -F "url=https://your-domain.com/api/telegram/webhook" \
        https://api.telegram.org/bot<TOKEN>/setWebhook
   ```
4. Verify:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

**Bot:** [@syncstay_bot](https://web.telegram.org/k/#@syncstay_bot)

---

## 🔐 Demo Credentials

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@example.com | password123 | Full system access |
| **Planner** | planner@example.com | password123 | Event management |
| **Hotel 1** | hotel1@example.com | password123 | Grand Royale Hotel |
| **Hotel 2** | hotel2@example.com | password123 | Ocean View Resort |
| **Guest 1** | guest1@example.com | password123 | Regular guest |
| **Guest 2** | guest2@example.com | password123 | Regular guest |

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `GET /api/auth/me` — Get current user
- `POST /api/auth/logout` — Logout user

### Events
- `GET /api/events` — Get all events (role-filtered)
- `POST /api/events` — Create event (Planner)
- `PUT /api/events/:id` — Update event
- `PUT /api/events/:id/approve` — Approve event (Admin)
- `GET /api/events/:id/recommendations` — AI hotel recommendations
- `POST /api/events/:id/select-recommended-hotel` — Select recommended hotel
- `GET /api/events/microsite/:slug` — Public microsite access

### Inventory
- `GET /api/inventory` — Get inventory (role-filtered)
- `POST /api/inventory` — Create inventory
- `PUT /api/inventory/:id/lock` — Lock inventory (Planner)
- `PUT /api/inventory/:id/release` — Release inventory

### Proposals & Hotel RFPs
- `GET /api/proposals` — Get proposals
- `POST /api/proposals` — Submit proposal (Hotel)
- `PUT /api/proposals/:id/review` — Review proposal (Planner)
- `GET /api/hotel-proposals` — Hotel-side proposal management

### Bookings & Payments
- `GET /api/bookings` — Get bookings
- `POST /api/bookings` — Create booking
- `PUT /api/bookings/:id/confirm` — Confirm booking
- `POST /api/payments` — Process Razorpay payment
- `POST /api/payments/:id/refund` — Refund (Admin)

### Flights (TBO API)
- `GET /api/flights` — Search flights
- `POST /api/flights/book` — Book flight
- Flight management endpoints for planners and guests

### Guest Invitations
- `POST /api/guest-invitations` — Send invitations (manual or CSV upload)
- `GET /api/guest-invitations/:token` — Accept invitation via token

### AI Agent
- `POST /api/agent/query` — Query the AI chatbot (proxied to ML server)

### Telegram
- `POST /api/telegram/webhook` — Telegram webhook receiver
- `GET /api/telegram/status` — Bot status (Admin)

### Analytics & Admin
- `GET /api/analytics/overview` — Platform analytics
- `GET /api/analytics/revenue` — Revenue analytics
- `GET /api/analytics/audit-logs` — Audit logs
- `GET /api/admin/*` — User management, approvals, feedback

### Activity & Recommendations
- `GET /api/activity` — Event activity logs
- `GET /api/recommendations` — Personalized event recommendations

---

## 🔌 WebSocket Events

| Direction | Event | Description |
|-----------|-------|-------------|
| Client → Server | `join-event` | Join event room for live updates |
| Client → Server | `leave-event` | Leave event room |
| Client → Server | `join-user` | Join user room for notifications |
| Server → Client | `inventory-update` | Real-time inventory changes |
| Server → Client | `booking-notification` | New booking alerts |
| Server → Client | `notification` | User-specific notifications |
| Bidirectional | `chat-message` | Admin ↔ Planner feedback chat |

---

## 📊 Database Models

| Model | Description |
|-------|-------------|
| **User** | Auth, profile, role, telegramId, vector embeddings |
| **Event** | Event details, config, slug, pricing tiers |
| **Inventory** | Room inventory per event with lock/release |
| **Proposal** | RFP proposals from hotels |
| **Booking** | Guest bookings with status tracking |
| **Payment** | Razorpay payment records |
| **UserActivity** | Per-user activity for recommendation engine |
| **AuditLog** | System-wide audit trail |

---

## 🔒 Security

- JWT authentication with refresh tokens
- Password hashing (bcrypt, 12 rounds)
- Role-based access control on every route
- Rate limiting (300 req / 15 min per IP)
- Helmet security headers
- CORS with allowlisted origins
- Input validation & sanitization
- XSS & injection protection

---

## 🚢 Production Deployment

The platform is deployed as 3 Docker containers behind Nginx:

```
Internet → Nginx (reverse proxy)
            ├── staysync.fedkiit.com    → frontend container (:3030)
            ├── ssapi.fedkiit.com       → backend container (:5001)
            └── (internal)              → ml-server container (:8020)
```

```bash
# On production server
git pull
docker compose up -d --build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License — feel free to use this project for learning or commercial purposes.

---

**Built with ❤️ using MERN Stack + FastAPI + OpenAI + Qdrant**

*Last Updated: March 2026*
