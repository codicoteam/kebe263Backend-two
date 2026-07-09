const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const propertyRoutes = require('./routes/property.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const vehicleBookingRoutes = require('./routes/vehicleBooking.routes');
const walletRoutes = require('./routes/wallet.routes');
const configRoutes = require('./routes/config.routes');
const serviceRoutes = require('./routes/service.routes');
const serviceBookingRoutes = require('./routes/serviceBooking.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');
const chatRoutes = require('./routes/chat.routes');
const promoCodeRoutes = require('./routes/promoCode.routes');
const debugRoutes = require('./routes/debug.routes');

const app = express();

app.use(helmet({
  hsts: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false,
}));

const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const extraOrigins = [];
if (process.env.API_BASE_URL) {
  try {
    extraOrigins.push(new URL(process.env.API_BASE_URL).origin);
  } catch {
    extraOrigins.push(process.env.API_BASE_URL);
  }
}
if (process.env.CLIENT_URL) {
  try {
    extraOrigins.push(new URL(process.env.CLIENT_URL).origin);
  } catch {
    extraOrigins.push(process.env.CLIENT_URL);
  }
}

const defaultLocalOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
];

const allowedOrigins = Array.from(
  new Set([
    ...envOrigins,
    ...extraOrigins,
    ...(envOrigins.length === 0 ? defaultLocalOrigins : []),
  ])
).map((o) => o.replace(/\/+$/, ''));
const allowAllOrigins = allowedOrigins.includes('*');

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const normalizeRequestKeys = require('./middleware/normalizeRequestKeys');
app.use(normalizeRequestKeys);

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

app.use('/api-docs', swaggerUi.serve, (req, res, next) => {
  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${req.protocol}://${req.get('host')}`,
        description: 'Current server',
      },
    ],
  };
  return swaggerUi.setup(dynamicSpec, { explorer: true })(req, res, next);
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'KEBE Super App API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings/vehicle', vehicleBookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/config', configRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings/service', serviceBookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', promoCodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/debug', debugRoutes);
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'KEBE Super App API is running',
    health: '/api/health',
    docs: '/api-docs'
  });
});


app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

module.exports = app;

