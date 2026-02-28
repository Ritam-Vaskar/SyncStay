# 🎯 Group Inventory Management Platform

A comprehensive MERN stack application for managing group inventory for MICE events and destination weddings. This platform digitizes the entire process from RFP submission to booking and payment, replacing offline chaos with a streamlined digital workflow.

## 🌟 Features

### Core Functionality
- **Multi-Role System**: Admin, Event Planner, Hotel/Supplier, and Guest roles with specific permissions
- **Event Management**: Create and manage events with custom pricing tiers and booking rules
- **Instant Microsite Access**: Planners get immediate microsite access after admin approval
- **AI Hotel Recommendations**: Smart hotel matching based on location, budget, event type, and capacity
- **Dual Hotel Selection**: Choose from AI-recommended hotels (instant) or RFP proposals (traditional)
- **Inventory Management**: Lock hotel inventory per event, track real-time availability
- **RFP & Proposal Flow**: Hotels submit proposals, planners compare and accept
- **Microsite Engine**: Auto-generated branded microsites for each event
- **Booking System**: Self-service booking with payment integration
- **Real-Time Updates**: WebSocket-powered live inventory and booking updates
- **Analytics Dashboard**: Comprehensive analytics for revenue, bookings, and trends
- **Audit Logging**: Complete audit trail of all system actions

### Technical Features
- JWT Authentication with refresh tokens
- Role-Based Access Control (RBAC)
- RESTful API architecture
- Real-time WebSocket communication
- Responsive UI with Tailwind CSS
- Modern blue-themed design
- Input validation and sanitization
- Error handling and logging

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Real-time**: Socket.io
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Express Validator

### Frontend
- **Framework**: React 18 with JavaScript/JSX
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **Animations**: Framer Motion

## 📁 Project Structure

```
TBO_hack/
├── server/                 # Backend application
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middlewares/   # Custom middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── sockets/       # WebSocket handlers
│   │   ├── utils/         # Utility functions
│   │   └── app.js         # App entry point
│   ├── .env.example       # Environment variables template
│   └── package.json
│
└── client/                # Frontend application
    ├── src/
    │   ├── components/    # Reusable components
    │   ├── layouts/       # Layout components
    │   ├── pages/         # Page components
    │   ├── services/      # API services
    │   ├── store/         # State management
    │   ├── styles/        # Global styles
    │   ├── utils/         # Helper functions
    │   ├── App.jsx        # Root component
    │   └── main.jsx       # Entry point
    ├── .env.example       # Environment variables template
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

#### 1. Clone the repository
```bash
cd TBO_hack
```

#### 2. Setup Backend

```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file with your configuration
# Required variables:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: Secret key for JWT tokens
# - CLIENT_URL: Frontend URL (default: http://localhost:5173)
```

**Important Environment Variables:**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/group-inventory
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this
CLIENT_URL=http://localhost:5173
```

#### 3. Setup Frontend

```bash
cd ../client

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Environment variables (already configured for local development):
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000
```

#### 4. Seed Database (Backend)

```bash
cd ../server

# Run seeder to populate database with sample data
npm run seed
```

This will create:
- Sample users (admin, planner, hotels, guests)
- Sample events
- Sample inventory
- Sample proposals
- Sample bookings
- Sample payments

#### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Server will run on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```
Client will run on http://localhost:5173

## 🔐 Demo Credentials

After running the seeder, use these credentials to login:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@example.com | password123 | Full system access |
| **Planner** | planner@example.com | password123 | Event management |
| **Hotel 1** | hotel1@example.com | password123 | Grand Royale Hotel |
| **Hotel 2** | hotel2@example.com | password123 | Ocean View Resort |
| **Guest 1** | guest1@example.com | password123 | Regular guest |
| **Guest 2** | guest2@example.com | password123 | Regular guest |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Events
- `GET /api/events` - Get all events (role-filtered)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Planner)
- `PUT /api/events/:id` - Update event (Planner)
- `PUT /api/events/:id/approve` - Approve event and publish microsite (Admin)
- `GET /api/events/:id/recommendations` - Get AI hotel recommendations (Planner)
- `POST /api/events/:id/select-recommended-hotel` - Select recommended hotel (Planner)
- `GET /api/events/:id/microsite-proposals` - Get recommendations + RFP proposals (Planner)
- `DELETE /api/events/:id` - Delete event (Planner)
- `GET /api/events/microsite/:slug` - Get event by slug (Public)

### Inventory
- `GET /api/inventory` - Get all inventory (role-filtered)
- `GET /api/inventory/:id` - Get single inventory
- `GET /api/inventory/event/:eventId/available` - Get available inventory
- `POST /api/inventory` - Create inventory (Hotel/Planner)
- `PUT /api/inventory/:id` - Update inventory
- `PUT /api/inventory/:id/lock` - Lock inventory (Planner)
- `PUT /api/inventory/:id/release` - Release inventory (Planner)
- `DELETE /api/inventory/:id` - Delete inventory

### Proposals
- `GET /api/proposals` - Get all proposals (role-filtered)
- `GET /api/proposals/:id` - Get single proposal
- `POST /api/proposals` - Create proposal (Hotel)
- `PUT /api/proposals/:id` - Update proposal (Hotel)
- `PUT /api/proposals/:id/review` - Review proposal (Planner)
- `DELETE /api/proposals/:id` - Delete proposal

### Bookings
- `GET /api/bookings` - Get all bookings (role-filtered)
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/confirm` - Confirm booking
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Payments
- `GET /api/payments` - Get all payments (role-filtered)
- `GET /api/payments/:id` - Get single payment
- `POST /api/payments` - Process payment
- `POST /api/payments/:id/refund` - Refund payment (Admin)

### Analytics
- `GET /api/analytics/overview` - Platform overview (Admin)
- `GET /api/analytics/event/:eventId` - Event analytics (Planner)
- `GET /api/analytics/revenue` - Revenue analytics (Admin/Planner)
- `GET /api/analytics/audit-logs` - Audit logs (Admin)

## 🔌 WebSocket Events

### Client → Server
- `join-event` - Join event room for updates
- `leave-event` - Leave event room
- `join-user` - Join user room for notifications

### Server → Client
- `inventory-update` - Real-time inventory changes
- `booking-notification` - New booking notifications
- `notification` - User-specific notifications

## 🎨 UI Components

### Pages
- Login/Register pages with validation
- Dashboard (role-specific)
- Events management
- Inventory management
- Proposals management
- Bookings management
- Analytics dashboard
- Admin panel

### Components
- Protected routes with RBAC
- Loading states and skeletons
- Empty states
- Notifications (toasts)
- Cards and badges
- Forms with validation
- Data tables
- Charts (via Recharts)

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Request rate limiting
- Input validation and sanitization
- CORS configuration
- Helmet security headers
- SQL injection prevention (via Mongoose)
- XSS protection
- Audit logging

## 📊 Database Models

- **User**: Authentication and profile
- **Event**: Event details and configuration
- **Inventory**: Room inventory per event
- **Proposal**: RFP and proposal workflow
- **Booking**: Guest bookings
- **Payment**: Payment transactions
- **AuditLog**: System audit trail

## 🧪 Testing

The application includes seeded data for testing all features:
- Multiple user roles
- Active events with inventory
- Proposals in different states
- Confirmed bookings
- Payment records

## 🚢 Deployment

### Backend Deployment
1. Set production environment variables
2. Use a production MongoDB instance
3. Enable SSL/TLS
4. Configure reverse proxy (nginx)
5. Use PM2 for process management

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Update API URLs in environment variables

## 📝 Development Guidelines

- Follow ES6+ syntax
- Use TypeScript for frontend
- Implement proper error handling
- Add comments for complex logic
- Follow REST API conventions
- Use semantic commit messages
- Test thoroughly before deployment

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🆘 Support

For issues or questions:
1. Check the documentation
2. Review demo credentials
3. Verify environment variables
4. Check MongoDB connection
5. Review server logs

## 🎯 Future Enhancements

- Payment gateway integration (Stripe/PayPal)
- Email notifications
- SMS notifications
- Calendar integrations
- Advanced analytics with AI
- Mobile app
- Multi-language support
- Currency conversion
- Advanced reporting
- Export to PDF/Excel

---

**Built with ❤️ using MERN Stack**

*Last Updated: February 2026*
