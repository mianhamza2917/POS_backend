# API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
Most endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Register User
**Endpoint:** `POST /api/auth/register`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Hamza",
  "email": "hamza@gmail.com",
  "password": "123456"
}
```

**Validation Rules:**
- `name`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 6 characters

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Hamza",
    "email": "hamza@gmail.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

---

### 2. Login User
**Endpoint:** `POST /api/auth/login`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "hamza@gmail.com",
  "password": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Hamza",
    "email": "hamza@gmail.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get User Profile
**Endpoint:** `GET /api/auth/profile`

**Request Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Hamza",
    "email": "hamza@gmail.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Not authorized, token failed"
}
```

---

### 4. Forgot Password
**Endpoint:** `POST /api/auth/forgotpassword`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "hamza@gmail.com"
}
```

**Validation Rules:**
- `email`: Required, valid email format

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "No user found with this email"
}
```

**Note:** This endpoint will send an email with a reset link to the user's email address. The email will contain a link like: `http://localhost:5000/api/auth/resetpassword/<resettoken>`

---

### 5. Reset Password
**Endpoint:** `PUT /api/auth/resetpassword/:resettoken`

**Request Headers:**
```
Content-Type: application/json
```

**URL Parameter:**
- `resettoken`: The reset token received from the forgot password email

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Validation Rules:**
- `password`: Required, minimum 6 characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Hamza",
    "email": "hamza@gmail.com",
    "role": "user",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

**Note:** The reset token expires after 30 minutes. After successful password reset, a new JWT token is returned.

---

## Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Environment Variables

Frontend developer needs to know:
- **Base URL:** `http://localhost:5000` (or deployed URL)
- **Token Storage:** Store JWT token in localStorage or cookies
- **Token Expiration:** 7 days (can be changed in backend)

## Testing

Use Postman or Thunder Client to test endpoints before frontend integration.
