import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.io
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((u) => u.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join event room
    socket.on('join-event', (eventId) => {
      socket.join(`event-${eventId}`);
      console.log(`Client ${socket.id} joined event-${eventId}`);
    });

    // Leave event room
    socket.on('leave-event', (eventId) => {
      socket.leave(`event-${eventId}`);
      console.log(`Client ${socket.id} left event-${eventId}`);
    });

    // Join user room (for personal notifications)
    socket.on('join-user', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`Client ${socket.id} joined user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

/**
 * Emit inventory update
 */
export const emitInventoryUpdate = (eventId, inventoryData) => {
  if (io) {
    io.to(`event-${eventId}`).emit('inventory-update', inventoryData);
  }
};

/**
 * Emit booking notification
 */
export const emitBookingNotification = (eventId, bookingData) => {
  if (io) {
    io.to(`event-${eventId}`).emit('booking-notification', bookingData);
  }
};

/**
 * Emit user notification
 */
export const emitUserNotification = (userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit('notification', notification);
  }
};
