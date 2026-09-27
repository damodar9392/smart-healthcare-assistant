const jwt = require('jsonwebtoken');

let io = null;

const attach = (server) => {
  if (io) {
    return io;
  }
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*',
    },
  });

  io.on('connection', (socket) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        socket.disconnect(true);
        return;
      }
      socket.join(`user:${decoded.id}`);
      if (decoded.role === 'admin') {
        socket.join('admins');
      }
      socket.emit('connected', { ok: true });
    } catch {
      socket.disconnect(true);
    }
  });

  return io;
};

const getIO = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

const emitToAdmins = (event, payload) => {
  if (!io) return;
  io.to('admins').emit(event, payload);
};

module.exports = { attach, getIO, emitToUser, emitToAdmins };