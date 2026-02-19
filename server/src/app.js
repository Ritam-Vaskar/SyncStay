import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import connectDB from './config/database.js';
import errorHandler from './middlewares/errorHandler.js';
import { initSocket, getIO } from './sockets/socketService.js';
import seedAdmin from './scripts/seedAdmin.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import proposalRoutes from './routes/proposalRoutes.js';
import hotelProposalRoutes from './routes/hotelProposalRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import guestInvitationRoutes from './routes/guestInvitationRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';

// Initialize Express app
const app = express();
const server = createServer(app);

// Connect to Database & seed admin
connectDB().then(() => seedAdmin());

// Initialize Socket.io
const io = initSocket(server);

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security Middleware
app.use(helmet());

// CORS — supports comma-separated origins in CLIENT_URL
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = config.clientUrl
        .split(',')
        .map((u) => u.trim());
      // allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.error(`⚠️ Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});
app.use('/api', limiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/guest-invitations', guestInvitationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/hotel-proposals', hotelProposalRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Group Inventory Management API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// Start Server
const PORT = config.port;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀 Server running on port ${PORT}           ║
║   🌍 Environment: ${config.env.padEnd(20)}       ║
║   📊 API: http://localhost:${PORT}/api        ║
║   🔌 WebSocket: Active                       ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  console.log('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

export default app;
