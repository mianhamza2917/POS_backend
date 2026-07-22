# Production-Ready Node.js + Express.js + MongoDB Backend Boilerplate

A clean, scalable, and production-ready backend boilerplate built with Node.js, Express.js, and MongoDB. This boilerplate follows professional backend standards while remaining beginner-friendly.

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework for Node.js
- **MongoDB** - NoSQL database (local MongoDB + MongoDB Atlas compatible)
- **Mongoose** - MongoDB ODM (Object Data Modeling)
- **JWT (JSON Web Tokens)** - Authentication
- **bcrypt** - Password hashing
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing
- **helmet** - Security HTTP headers
- **morgan** - HTTP request logger
- **express-validator** - Request validation
- **nodemon** - Development tool (auto-restart on file changes)

## Project Structure

```
backend/
│
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection configuration
│   │
│   ├── controllers/
│   │   └── authController.js  # Authentication business logic
│   │
│   ├── models/
│   │   └── User.js            # User Mongoose model
│   │
│   ├── routes/
│   │   └── authRoutes.js      # Authentication routes
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT authentication middleware
│   │   ├── errorMiddleware.js # Global error handling
│   │   └── validateMiddleware.js # Request validation
│   │
│   ├── utils/
│   │   └── generateToken.js   # JWT token generation utility
│   │
│   ├── app.js                 # Express app configuration
│   └── server.js              # Server entry point
│
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment variables template
├── package.json               # Project dependencies and scripts
├── nodemon.json               # Nodemon configuration
└── README.md                  # This file
```

## Backend Flow Explanation

```
Client Request
        |
        ↓
Express Server (server.js)
        |
        ↓
Routes (authRoutes.js)
        |
        ↓
Middleware (authMiddleware, validateMiddleware, errorMiddleware)
        |
        ↓
Controller (authController.js)
        |
        ↓
Model (User.js)
        |
        ↓
MongoDB Database
        |
        ↓
Response
```

**Step-by-Step Explanation:**

1. **Client Request** - The client (frontend, Postman, etc.) sends an HTTP request to the server
2. **Express Server** - The server receives the request through `server.js`
3. **Routes** - The request is matched to the appropriate route in `authRoutes.js`
4. **Middleware** - The request passes through middleware layers:
   - Validation middleware checks request data
   - Authentication middleware verifies JWT token (for protected routes)
   - Error middleware catches any errors
5. **Controller** - The controller (`authController.js`) contains the business logic
6. **Model** - The controller interacts with the Mongoose model (`User.js`)
7. **MongoDB** - The model performs database operations
8. **Response** - The result is sent back to the client as an HTTP response

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)

### Steps

1. **Navigate to the project directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` (already done)
   - Update the values in `.env` as needed

4. **Start MongoDB**
   - For local MongoDB: Make sure MongoDB is running on `mongodb://127.0.0.1:27017`
   - For MongoDB Atlas: Update `MONGO_URI` in `.env` with your Atlas connection string

5. **Run the server**
   - Development mode (with auto-restart):
     ```bash
     npm run dev
     ```
   - Production mode:
     ```bash
     npm start
     ```

The server will start on `http://localhost:5000`

## Environment Variables

The `.env` file contains the following configuration:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/backendDB
JWT_SECRET(mysecretkey)
JWT_EXPIRE=7d
```

**Explanation of each value:**

- **PORT** - The port on which the Express server will run (5000 is the default)
- **MONGO_URI** - MongoDB connection string:
  - For local MongoDB: `mongodb://127.0.0.1:27017/backendDB`
  - For MongoDB Atlas: Replace with your Atlas connection string
- **JWT_SECRET** - Secret key used to sign JWT tokens (change this in production!)
- **JWT_EXPIRE** - Token expiration time (7d = 7 days)

## API Endpoints

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "Hamza",
  "email": "hamza@gmail.com",
  "password": "123456"
}
```

**Functionality:**
- Validates input (name, email, password)
- Checks if user already exists with the email
- Hashes password using bcrypt
- Saves user in MongoDB
- Generates JWT token
- Returns user data + token

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

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "hamza@gmail.com",
  "password": "123456"
}
```

**Functionality:**
- Finds user by email
- Compares password using bcrypt
- Generates JWT token
- Returns user data + token

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

### 3. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Functionality:**
- Protected route (requires JWT token)
- Verifies JWT token from Authorization header
- Returns logged-in user data

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

## Testing the APIs

### Using Postman

1. **Register a new user**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/register`
   - Body (JSON):
     ```json
     {
       "name": "Hamza",
       "email": "hamza@gmail.com",
       "password": "123456"
     }
     ```
   - Click Send
   - Copy the `token` from the response

2. **Login**
   - Method: POST
   - URL: `http://localhost:5000/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "hamza@gmail.com",
       "password": "123456"
     }
     ```
   - Click Send
   - Copy the `token` from the response

3. **Get Profile**
   - Method: GET
   - URL: `http://localhost:5000/api/auth/profile`
   - Headers tab:
     - Key: `Authorization`
     - Value: `Bearer <your_token>` (replace with actual token)
   - Click Send

### Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension in VS Code
2. Follow the same steps as Postman above

## File Explanations

### `package.json`
**Why it exists:** Defines project metadata, dependencies, and scripts
**What it does:**
- Lists all npm packages required for the project
- Defines scripts for starting the server (`npm start`, `npm run dev`)
- Contains project information (name, version, description)
**Data flow:** Used by npm to install dependencies and run scripts

### `.env`
**Why it exists:** Stores sensitive configuration data securely
**What it does:**
- Contains environment variables (port, database URI, JWT secret)
- Keeps sensitive data out of version control
- Allows different configurations for development/production
**Data flow:** Loaded by `dotenv` package at server startup

### `.env.example`
**Why it exists:** Template for environment variables
**What it does:**
- Shows which environment variables are needed
- Serves as a reference for setting up `.env`
- Can be committed to version control (unlike `.env`)
**Data flow:** Reference only, not used by the application

### `nodemon.json`
**Why it exists:** Configuration for nodemon development tool
**What it does:**
- Tells nodemon which files to watch (`src` directory)
- Specifies file extensions to watch (`.js`)
- Defines which files to ignore (test files)
**Data flow:** Used by nodemon during development

### `src/config/db.js`
**Why it exists:** Centralized database connection logic
**What it does:**
- Connects to MongoDB using Mongoose
- Uses environment variable for connection string
- Logs connection status
- Exits process on connection failure
**Data flow:** Called by `server.js` to establish database connection

### `src/models/User.js`
**Why it exists:** Defines the User schema and database operations
**What it does:**
- Creates Mongoose schema for User collection
- Defines fields: name, email, password, role, timestamps
- Adds pre-save hook to hash passwords
- Adds method to compare passwords
- Enforces validation rules
**Data flow:** Used by controllers to interact with MongoDB

### `src/utils/generateToken.js`
**Why it exists:** Reusable JWT token generation function
**What it does:**
- Generates JWT tokens using user ID
- Uses JWT_SECRET from environment
- Sets token expiration time
**Data flow:** Called by controllers when user registers or logs in

### `src/middleware/authMiddleware.js`
**Why it exists:** Protects routes by verifying JWT tokens
**What it does:**
- `protect`: Verifies JWT token from Authorization header
- `admin`: Checks if user has admin role
- Attaches user object to request
- Returns error if token is invalid/missing
**Data flow:** Applied to routes that require authentication

### `src/middleware/errorMiddleware.js`
**Why it exists:** Centralized error handling for the entire application
**What it does:**
- Catches all errors in the application
- Handles Mongoose validation errors
- Handles duplicate key errors
- Handles JWT errors
- Returns appropriate HTTP status codes
**Data flow:** Applied as the last middleware in `app.js`

### `src/middleware/validateMiddleware.js`
**Why it exists:** Validates request data before processing
**What it does:**
- Checks validation results from express-validator
- Returns formatted error messages if validation fails
- Passes control to next middleware if validation succeeds
**Data flow:** Applied to routes after validation rules

### `src/controllers/authController.js`
**Why it exists:** Contains business logic for authentication
**What it does:**
- `registerUser`: Handles user registration
- `loginUser`: Handles user login
- `getUserProfile`: Handles profile retrieval
- Interacts with User model
- Generates JWT tokens
- Returns HTTP responses
**Data flow:** Called by routes, interacts with models

### `src/routes/authRoutes.js`
**Why it exists:** Defines authentication API endpoints
**What it does:**
- Maps HTTP methods to controller functions
- Applies validation rules
- Applies authentication middleware
- Defines route paths (`/register`, `/login`, `/profile`)
**Data flow:** Connects HTTP requests to controllers

### `src/app.js`
**Why it exists:** Configures the Express application
**What it does:**
- Sets up middleware (helmet, cors, morgan, body parser)
- Registers routes
- Defines error handlers
- Creates health check endpoint
- Exports configured app
**Data flow:** Imported by `server.js` to create the server

### `src/server.js`
**Why it exists:** Entry point for the application
**What it does:**
- Loads environment variables
- Connects to MongoDB
- Starts the Express server
- Handles unhandled errors
- Logs server status
**Data flow:** First file executed when running the application

## Security Features

### 1. Helmet
- Sets security-related HTTP headers
- Protects against well-known web vulnerabilities
- Applied globally in `app.js`

### 2. CORS
- Controls which domains can access the API
- Prevents unauthorized cross-origin requests
- Configured in `app.js`

### 3. Password Encryption
- Uses bcrypt to hash passwords
- Salt rounds: 10 (good balance of security/performance)
- Passwords are never stored in plain text
- Implemented in `User.js` model

### 4. JWT Authentication
- Stateless authentication using tokens
- Tokens are signed with secret key
- Tokens have expiration time
- Implemented in `authMiddleware.js`

### 5. Request Validation
- Validates all incoming request data
- Prevents invalid/malicious data
- Uses express-validator
- Implemented in `validateMiddleware.js`

## Error Handling

The application includes comprehensive error handling:

### Types of Errors Handled

1. **Validation Errors** - Invalid request data
2. **Duplicate Key Errors** - User already exists
3. **Cast Errors** - Invalid MongoDB ObjectId
4. **JWT Errors** - Invalid or expired tokens
5. **Database Errors** - MongoDB connection/query issues
6. **General Errors** - Catch-all for unexpected errors

### HTTP Status Codes Used

- **200** - Success
- **201** - Created (registration)
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (authentication failed)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (route/resource not found)
- **500** - Internal Server Error

## Database Schema

### User Collection

**Fields:**
- `_id` (ObjectId) - Auto-generated unique identifier
- `name` (String) - User's name (required, 2-50 characters)
- `email` (String) - User's email (required, unique, valid email format)
- `password` (String) - Hashed password (required, min 6 characters, not returned in queries)
- `role` (String) - User role ('user' or 'admin', default: 'user')
- `createdAt` (Date) - Auto-generated timestamp
- `updatedAt` (Date) - Auto-generated timestamp

## Development vs Production

### Development
- Uses nodemon for auto-restart
- Shows detailed error stacks
- Uses development MongoDB
- Logs all HTTP requests (morgan)

### Production
- Uses node directly (no nodemon)
- Hides error stacks from responses
- Uses production MongoDB
- Consider using production logger (winston/bunyan)
- Set `NODE_ENV=production` in `.env`

## Common Issues & Solutions

### MongoDB Connection Failed
- Ensure MongoDB is running locally
- Check the `MONGO_URI` in `.env`
- For MongoDB Atlas, ensure IP whitelist includes your IP

### Port Already in Use
- Change `PORT` in `.env`
- Or kill the process using port 5000

### JWT Token Invalid
- Ensure `JWT_SECRET` is the same when token was generated
- Check if token has expired (default: 7 days)

### Validation Errors
- Check request body matches expected format
- Ensure all required fields are included
- Verify data types are correct

## Next Steps

To extend this boilerplate:

1. Add more models (Product, Order, etc.)
2. Create additional routes and controllers
3. Add more middleware (rate limiting, file upload)
4. Implement refresh tokens
5. Add email verification
6. Implement password reset
7. Add unit and integration tests
8. Set up CI/CD pipeline
9. Add API documentation (Swagger)
10. Implement caching (Redis)

## License

ISC

## Author

Your Name

---

**Note:** This is a backend-only boilerplate. No frontend is included. Use this as a foundation for building full-stack applications.
