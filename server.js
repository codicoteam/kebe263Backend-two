require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] },
});

const setupSocket = require('./socket');
const setupChat = require('./socket/chat');
const socketAuth = require('./middleware/socketAuth');

setupSocket(io);

const chatNamespace = io.of('/chat');
chatNamespace.use(socketAuth);
setupChat(chatNamespace);

app.set('io', io);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`kebe263 Super App server running on port ${PORT}`);
      console.log(`API Docs: http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
