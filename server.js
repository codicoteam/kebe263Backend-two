require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);
if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}
if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
  console.error('Missing required environment variable: MONGODB_URI or MONGO_URI');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
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
      const apiDocsUrl = process.env.API_BASE_URL
        ? `${process.env.API_BASE_URL.replace(/\/$/, '')}/api-docs`
        : `http://localhost:${PORT}/api-docs`;

      console.log(`KEBE Super App server running on port ${PORT}`);
      console.log(`API Docs: ${apiDocsUrl}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
