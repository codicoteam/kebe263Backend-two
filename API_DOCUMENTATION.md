# KEBE 263 API Documentation

## Overview
KEBE 263 is a multi-service platform API for vehicles, accommodations (properties), services, bookings, messaging, wallet payments, notifications, and admin management.

**Base URL (development):** `http://localhost:5000`
**Swagger API Docs:** `/api-docs`
**Health Check:** `/api/health`

### Route prefixes used by the system
- `/api/auth`
- `/api/users`
- `/api/vehicles`
- `/api/properties`
- `/api/services`
- `/api/bookings/vehicle`
- `/api/bookings/service`
- `/api/wallet`
- `/api/config`
- `/api/notifications`
- `/api/search`
- `/api/chat`
- `/api/admin`

> Note: The current backend does not expose `/api/accommodations`, `/api/messages`, or `/api/reviews` as top-level routes. Accommodations functionality is implemented via `/api/properties`. Provider subscription endpoints are not present in the current backend.

## Authentication
Most protected endpoints require a bearer JWT token in the request header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required | Notes |
|--------|----------|-------------|---------------|-------|
| POST | `/register` | Register a new user | No | Requires `firstName`, `lastName`, `email`, `phone`, `password` |
| POST | `/verify-otp` | Verify registration OTP and get token | No | Requires `email`, `otp` |
| POST | `/login` | Log in with email + password | No | Returns JWT token and user info |
| POST | `/resend-otp` | Resend verification OTP | No | Requires `email` |
| POST | `/forgot-password` | Request password reset OTP | No | Requires `email` |
| POST | `/reset-password` | Reset password using OTP | No | Requires `email`, `otp`, `newPassword` |

## User Management
### User profile (`/api/users`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/me` | Get current user profile | Yes | Any authenticated user |
| PUT | `/me` | Update current user profile | Yes | Any authenticated user |
| PUT | `/me/role` | Change current role between customer and serviceProvider | Yes | Any authenticated user |
| PUT | `/me/change-password` | Change password | Yes | Any authenticated user |

### Admin user management (`/api/users`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | Get all users | Yes | ADMIN |
| GET | `/:id` | Get a user by ID | Yes | ADMIN |
| PUT | `/:id` | Update a user | Yes | ADMIN |
| DELETE | `/:id` | Delete a user | Yes | ADMIN |

## Vehicles
### Vehicle listings (`/api/vehicles`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/nearby` | Find nearby vehicles by GPS | Yes | Any authenticated user |
| GET | `/mine` | Get my listed vehicles | Yes | SERVICE PROVIDER |
| GET | `/admin/all` | Get all vehicles | Yes | ADMIN |
| GET | `/` | List approved available vehicles | Yes | Any authenticated user |
| POST | `/` | List a new vehicle | Yes | SERVICE PROVIDER |
| GET | `/:id` | Get vehicle details | Yes | Any authenticated user |
| PUT | `/:id` | Update a vehicle listing | Yes | SERVICE PROVIDER |
| DELETE | `/:id` | Delete a vehicle listing | Yes | SERVICE PROVIDER |
| PUT | `/:id/approve` | Approve a vehicle listing | Yes | ADMIN |
| POST | `/:id/book` | Request a vehicle booking | Yes | Any authenticated user |

## Properties (Accommodations)
### Property listings (`/api/properties`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/paynow/result` | PayNow webhook for property unlock payments | No | PayNow service |
| GET | `/nearby` | Find nearby properties by GPS | Yes | Any authenticated user |
| GET | `/admin/all` | Get all property listings | Yes | ADMIN |
| GET | `/mine` | Get my property listings | Yes | SERVICE PROVIDER |
| GET | `/` | List approved properties | Yes | Any authenticated user |
| POST | `/` | Create a property listing | Yes | SERVICE PROVIDER |
| GET | `/:id` | Get property details | Yes | Any authenticated user |
| PUT | `/:id` | Update a property listing | Yes | SERVICE PROVIDER |
| DELETE | `/:id` | Delete a property listing | Yes | SERVICE PROVIDER |
| PUT | `/:id/approve` | Approve a property listing | Yes | ADMIN |
| POST | `/:id/unlock` | Unlock full property details via payment | Yes | Any authenticated user |

## Services
### Service provider profiles (`/api/services`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/paynow/result` | PayNow webhook for deposit payments | No | PayNow service |
| GET | `/admin/all` | Get all service profiles | Yes | ADMIN |
| GET | `/mine` | Get my service profiles | Yes | SERVICE PROVIDER |
| GET | `/nearby` | Find nearby services by GPS | Yes | Any authenticated user |
| GET | `/` | List approved services | Yes | Any authenticated user |
| POST | `/` | Create a service profile | Yes | SERVICE PROVIDER |
| GET | `/:id` | Get a service profile | Yes | Any authenticated user |
| PUT | `/:id` | Update a service profile | Yes | SERVICE PROVIDER |
| DELETE | `/:id` | Delete a service profile | Yes | SERVICE PROVIDER |
| PUT | `/:id/approve` | Approve a service profile | Yes | ADMIN |
| POST | `/:id/pay-deposit` | Pay deposit for service activation | Yes | SERVICE PROVIDER |
| POST | `/:id/book` | Book a service provider | Yes | Any authenticated user |

## Booking APIs
### Vehicle bookings (`/api/bookings/vehicle`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/admin/all` | Get all vehicle bookings | Yes | ADMIN |
| PUT | `/:id/accept` | Owner accepts booking | Yes | SERVICE PROVIDER |
| PUT | `/:id/start` | Owner starts the ride | Yes | SERVICE PROVIDER |
| PUT | `/:id/complete` | Owner completes the ride | Yes | SERVICE PROVIDER |
| PUT | `/:id/cancel` | Cancel a vehicle booking | Yes | Any authenticated user |

### Service bookings (`/api/bookings/service`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/admin/all` | Get all service bookings | Yes | ADMIN |
| PUT | `/:id/accept` | Provider accepts booking | Yes | SERVICE PROVIDER |
| PUT | `/:id/start` | Provider starts service | Yes | SERVICE PROVIDER |
| PUT | `/:id/complete` | Provider completes service | Yes | SERVICE PROVIDER |
| PUT | `/:id/cancel` | Cancel a service booking | Yes | Any authenticated user |
| POST | `/:id/review` | Leave a review after service completion | Yes | Any authenticated user |

> Note: Property booking is implemented via `/api/properties/:id/unlock`.

## Notifications
### Notifications (`/api/notifications`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/unread-count` | Get unread notification count | Yes | Any authenticated user |
| GET | `/` | Get my notifications | Yes | Any authenticated user |
| PUT | `/read-all` | Mark all notifications read | Yes | Any authenticated user |
| PUT | `/:id/read` | Mark one notification read | Yes | Any authenticated user |

## Search
### Global search (`/api/search`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/` | Global search across properties, vehicles, services | Yes | Any authenticated user |

## Chat and messaging
### Chat routes (`/api/chat`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/unread-count` | Total unread messages count | Yes | Any authenticated user |
| GET | `/rooms` | Get my chat rooms | Yes | Any authenticated user |
| POST | `/room` | Create or get a booking chat room | Yes | Any authenticated user |
| POST | `/support` | Create support chat room | Yes | Any authenticated user |
| GET | `/rooms/:roomId` | Get a room's details | Yes | Any authenticated user |
| GET | `/rooms/:roomId/messages` | Get room message history | Yes | Any authenticated user |
| PUT | `/rooms/:roomId/read` | Mark room messages as read | Yes | Any authenticated user |

## Wallet
### Wallet routes (`/api/wallet`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/paynow/result` | PayNow webhook for wallet deposit results | No | PayNow service |
| GET | `/admin/all` | Get all wallets | Yes | ADMIN |
| GET | `/` | Get current wallet balance | Yes | Any authenticated user |
| POST | `/deposit` | Deposit funds into wallet via PayNow | Yes | Any authenticated user |
| GET | `/transactions` | Get wallet transaction history | Yes | Any authenticated user |

## Platform configuration
### Config routes (`/api/config`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/platform-fee` | Get current platform fee percent | Yes | ADMIN |
| PUT | `/platform-fee` | Update platform fee percent | Yes | ADMIN |

## Admin endpoints
### Admin dashboard and data (`/api/admin`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/config` | Get all platform config entries | Yes | ADMIN |
| POST | `/config` | Create a new config entry | Yes | ADMIN |
| PUT | `/config/:key` | Update or upsert config entry by key | Yes | ADMIN |
| GET | `/users` | Get all users | Yes | ADMIN |
| GET | `/users/:id` | Get a single user | Yes | ADMIN |
| PUT | `/users/:id/ban` | Ban or unban a user | Yes | ADMIN |
| PUT | `/users/:id/verify` | Mark user as verified | Yes | ADMIN |
| DELETE | `/users/:id` | Deactivate a user | Yes | ADMIN |
| GET | `/properties` | Get all properties | Yes | ADMIN |
| PUT | `/properties/:id/approve` | Approve property | Yes | ADMIN |
| PUT | `/properties/:id/reject` | Reject property | Yes | ADMIN |
| GET | `/bookings/property` | Get all property bookings | Yes | ADMIN |
| GET | `/vehicles` | Get all vehicles | Yes | ADMIN |
| PUT | `/vehicles/:id/approve` | Approve vehicle | Yes | ADMIN |
| PUT | `/vehicles/:id/reject` | Reject vehicle | Yes | ADMIN |
| DELETE | `/vehicles/:id` | Permanently delete vehicle | Yes | ADMIN |
| GET | `/bookings/vehicle` | Get all vehicle bookings | Yes | ADMIN |
| GET | `/wallets` | Get all wallets | Yes | ADMIN |
| GET | `/wallets/:userId` | Get user wallet and history | Yes | ADMIN |
| GET | `/services` | Get all services | Yes | ADMIN |
| PUT | `/services/:id/approve` | Approve service | Yes | ADMIN |
| PUT | `/services/:id/reject` | Reject service | Yes | ADMIN |
| DELETE | `/services/:id` | Permanently delete service | Yes | ADMIN |
| GET | `/bookings/service` | Get all service bookings | Yes | ADMIN |
| GET | `/reports/overview` | Platform overview stats | Yes | ADMIN |
| GET | `/reports/revenue` | Revenue report | Yes | ADMIN |
| GET | `/reports/bookings` | Booking trends report | Yes | ADMIN |
| GET | `/reports/users` | User registration trends | Yes | ADMIN |
| GET | `/chat/rooms` | Get all chat rooms | Yes | ADMIN |

## Response format
All endpoints follow this base response structure:

```json
{
  "success": true | false,
  "message": "Response message",
  "data": { ... }
}
```

## Common error status codes
- `400` — Bad Request
- `401` — Unauthorized
- `403` — Forbidden
- `404` — Not Found
- `409` — Conflict
- `500` — Internal Server Error

## Notes for this system
- The current backend uses `/api/properties` for accommodation-related routes.
- There is no `/api/accommodations` prefix in the current code.
- There is no direct `/api/reviews` route; reviews are created via service booking review.
- There is no `/api/messages` top-level route; messaging is handled under `/api/chat` with Socket.io support.
- Provider subscription APIs are not implemented in the current backend.
- Swagger UI is available at `/api-docs` and reflects the same route definitions.

## Getting started
1. Register: `POST /api/auth/register`
2. Verify OTP: `POST /api/auth/verify-otp`
3. Login: `POST /api/auth/login`
4. Use the returned JWT token in `Authorization` header for protected endpoints.
5. Inspect available routes in Swagger at `/api-docs`.
