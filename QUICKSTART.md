# 🚀 Quick Start Guide

## Prerequisites Check
Before starting, ensure you have:
- ✅ Node.js v18+ installed (`node --version`)
- ✅ MongoDB installed and running (`mongod --version`)
- ✅ npm or yarn installed

## Step-by-Step Setup (5 minutes)

### 1️⃣ Install Backend Dependencies
```bash
cd server
npm install
```

### 2️⃣ Configure Backend Environment
```bash
# Copy the example env file
cp .env.example .env

# The .env file is pre-configured for local development
# You can use it as-is, or customize:
# - MONGODB_URI if your MongoDB runs on a different port
# - JWT_SECRET for production (keep default for dev)
```

### 3️⃣ Seed the Database
```bash
# This creates sample data (users, events, bookings, etc.)
npm run seed
```

You should see:
```
✅ Connected to MongoDB
✅ Cleared existing data
✅ Created 6 users
✅ Created 2 events
✅ Created 3 inventory items
✅ Created 2 proposals
✅ Created 2 bookings
✅ Created 2 payments
```

### 4️⃣ Start Backend Server
```bash
# In the server directory
npm run dev
```

You should see:
```
╔══════════════════════════════════════════════╗
║   🚀 Server running on port 5000            ║
║   🌍 Environment: development               ║
║   📊 API: http://localhost:5000/api         ║
║   🔌 WebSocket: Active                      ║
╚══════════════════════════════════════════════╝
```

### 5️⃣ Install Frontend Dependencies
Open a NEW terminal:
```bash
cd client
npm install
```

### 6️⃣ Configure Frontend Environment
```bash
# Copy the example env file
cp .env.example .env

# No changes needed - it's configured for local dev
```

### 7️⃣ Start Frontend Server
```bash
# In the client directory
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 8️⃣ Open Browser
Navigate to: **http://localhost:5173**

### 9️⃣ Login with Demo Account
Use any of these credentials:

**Event Planner:**
- Email: `planner@example.com`
- Password: `password123`

**Hotel Manager:**
- Email: `hotel1@example.com`
- Password: `password123`

**Guest:**
- Email: `guest1@example.com`
- Password: `password123`

**Admin:**
- Email: `admin@example.com`
- Password: `password123`

## ✅ Verification Checklist

After setup, verify:
- [ ] Backend server is running on port 5000
- [ ] Frontend is accessible at http://localhost:5173
- [ ] MongoDB is connected (check backend logs)
- [ ] You can login successfully
- [ ] Dashboard displays data

## 🐛 Common Issues

### Port Already in Use
```bash
# Backend (port 5000)
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -ti:5000 | xargs kill

# Frontend (port 5173)
# The error will show you which port is available
```

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
# Windows: Start MongoDB service
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### "Module not found" Errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors in Frontend
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## 📚 Next Steps

1. **Explore Features**: 
   - Create an event (as Planner)
   - Add inventory (as Hotel)
   - Make a booking (as Guest)

2. **Check Real-time Updates**:
   - Open two browser windows
   - Make changes in one, see updates in another

3. **Review Code**:
   - Backend: `/server/src`
   - Frontend: `/client/src`

4. **Read Full Documentation**: See `README.md`

## 🆘 Need Help?

1. Check server logs in the terminal
2. Check browser console for errors (F12)
3. Verify all environment variables are set
4. Make sure MongoDB is running
5. Try restarting both servers

## 🎉 Success!

If you can login and see the dashboard, you're all set! The platform is now running with:
- ✅ Full authentication system
- ✅ Role-based access control
- ✅ Real-time WebSocket connections
- ✅ Sample data to explore
- ✅ All API endpoints functional

Enjoy exploring the Group Inventory Management Platform! 🚀
