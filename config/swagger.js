const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'kebe263 Super App API',
      version: '1.0.0',
      description:
        'REST API for kebe263 Super App — Zimbabwe super app covering accommodation booking, vehicle booking with live GPS, and service provider booking.',
      contact: {
        name: 'kebe263 Support',
        email: 'support@kebe263.co.zw',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: 'Active server',
      },
      {
        url: `http://66.9.171.45:${process.env.PORT || 5000}`,
        description: 'Local network (IP)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
            error: { type: 'string', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and account management' },
      { name: 'Users', description: 'User profile and admin user management' },
      { name: 'Properties', description: 'Accommodation listings and bookings' },
      { name: 'Vehicles', description: 'Vehicle listings, bookings, and live tracking' },
      { name: 'VehicleBookings', description: 'Vehicle booking lifecycle management' },
      { name: 'Wallet', description: 'Vehicle owner wallet and PayNow deposits' },
      { name: 'Config', description: 'Admin-managed platform configuration' },
      { name: 'Services', description: 'Service provider profiles, search, and bookings' },
      { name: 'ServiceBookings', description: 'Service booking lifecycle and reviews' },
      { name: 'Admin', description: 'Admin-only management and analytics endpoints' },
      { name: 'Notifications', description: 'In-app notification management' },
      { name: 'Search', description: 'Global search across properties, vehicles, and services' },
      { name: 'Chat', description: 'Real-time chat rooms and message history' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
