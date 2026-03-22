# Express Middleware Assignment

This project is an Express.js API secured using multiple middleware layers.

## Features

- IP Filtering
- CORS restriction
- Rate Limiting
- Bearer Token Authentication for API
- Basic Authentication for Dashboard
- Logout route

## Middleware Order

The middleware is applied in this order:

1. IP Filtering
2. CORS
3. Rate Limiting
4. Authentication

## Routes

### 1. GET /api/oil-prices
Protected by Bearer Token.

Example header:

Authorization: Bearer super-secret-energy-token-2026

### 2. GET /dashboard
Protected by Basic Auth.

Username: admin  
Password: energy123

### 3. GET /logout
Shows a logged out message and redirects back to `/dashboard` after 3 seconds.

## Bearer Token

Use this token for testing:

`super-secret-energy-token-2026`

## Basic Auth Credentials

- Username: `admin`
- Password: `energy123`

## CORS Origin

CORS is restricted to:

`http://localhost:3000`

## Rate Limit

The API is limited to:

- 10 requests
- per 1 minute

## Allowed IPs

Only these localhost IPs are allowed:

- `127.0.0.1`
- `::1`
- `::ffff:127.0.0.1`

## How to Run

### 1. Install dependencies

```bash
npm install