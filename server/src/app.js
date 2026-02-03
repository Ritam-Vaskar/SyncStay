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

// Initialize Express app
const app = express();
const server = createServer(app);

// Connect to Database
connectDB();

// Initialize Socket.io
const io = initSocket(server);

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security Middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.clientUrl,
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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
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
