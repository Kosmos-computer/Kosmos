# 🚀 Podbook Backend API

Complete backend implementation for the Podbook RSS-to-Book conversion platform. Built with Node.js, Express, PostgreSQL, and Redis.

## 🎯 Current Status

### ✅ **COMPLETED**
- Express server with all API endpoints
- PostgreSQL database connection and configuration
- Redis cache service integration
- JWT authentication system
- User management (CRUD operations)
- Project and content management APIs
- AI processing job management
- Docker containerization
- Development environment with hot reload

### 🚧 **IN PROGRESS**
- Database table creation (Prisma migrations)
- Real data integration (currently mock responses)

### 📋 **NEXT STEPS**
- [ ] Run Prisma migrations to create tables
- [ ] Replace mock responses with real database queries
- [ ] Add JWT middleware to protected routes
- [ ] Implement RSS feed processing
- [ ] Add AI content generation logic

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Cache/Queue:** Redis 7
- **ORM:** Prisma
- **Authentication:** JWT
- **Containerization:** Docker
- **Development:** tsx (TypeScript execution)

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # PostgreSQL connection
│   │   └── redis.ts      # Redis configuration
│   ├── controllers/      # Request handlers
│   │   └── auth.ts       # Authentication logic
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # JWT verification
│   │   ├── validation.ts # Request validation
│   │   └── errorHandler.ts # Error handling
│   ├── routes/           # API route definitions
│   │   ├── auth.ts       # Authentication routes
│   │   ├── users.ts      # User management
│   │   ├── projects.ts   # Project management
│   │   ├── content.ts    # Content management
│   │   └── ai.ts         # AI processing routes
│   ├── utils/            # Utility functions
│   │   └── logger.ts     # Logging utilities
│   └── index.ts          # Main server file
├── prisma/               # Database schema
│   └── schema.prisma     # Database models
├── docker-compose.yml    # Docker services
├── Dockerfile            # Backend container
└── package.json          # Dependencies
```

## 🚀 Quick Start

### **1. Prerequisites**
- Docker and Docker Compose
- Node.js 18+ and npm

### **2. Start Services**
```bash
# Start all Docker services
docker-compose up -d

# Verify services are running
docker ps
```

### **3. Install Dependencies**
```bash
npm install
```

### **4. Start Development Server**
```bash
npm run dev
```

**Server will be available at:** http://localhost:3000

## 🔧 Development Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio
```

## 🗄️ Database

### **Connection Details**
- **Host:** localhost (or postgres container)
- **Port:** 5433 (host) → 5432 (container)
- **Database:** podbook
- **User:** podbook_user
- **Password:** podbook_password

### **Database Models**
The Prisma schema includes:
- **User:** Authentication and profile data
- **Project:** Book projects and metadata
- **Content:** RSS feeds and uploaded content
- **Chapter:** Generated book chapters
- **Export:** Book export files
- **ProcessingJob:** AI and processing tasks

### **Database Management**
```bash
# Access PostgreSQL directly
docker exec -it podbook_postgres psql -U podbook_user -d podbook

# Open pgAdmin
# Visit http://localhost:5050
# Email: admin@podbook.com
# Password: admin123
```

## 🔐 Authentication

### **JWT Configuration**
- **Secret:** Configured via JWT_SECRET environment variable
- **Expiration:** 7 days (configurable)
- **Refresh:** 30 days (configurable)

### **Protected Routes**
Currently, these routes require authentication:
- `/api/users/*` (except registration/login)
- `/api/projects/*`
- `/api/content/*`
- `/api/ai/*`

### **Adding Authentication to Routes**
```typescript
import { authMiddleware } from '../middleware/auth';

// Protect a route
router.get('/protected', authMiddleware, (req, res) => {
  // Route logic here
});
```

## 📡 API Endpoints

### **Base URL:** `http://localhost:3000/api`

#### **Authentication**
```
POST /auth/register     # User registration
POST /auth/login        # User login
POST /auth/logout       # User logout
```

#### **Users**
```
GET    /users           # List all users
GET    /users/:id       # Get user by ID
GET    /users/profile   # Get current user profile
```

#### **Projects**
```
GET    /projects        # List all projects
GET    /projects/:id    # Get project by ID
POST   /projects        # Create new project
```

#### **Content**
```
GET    /content         # List all content
GET    /content/:id     # Get content by ID
POST   /content         # Create new content
```

#### **AI Processing**
```
GET    /ai              # Get processing status
POST   /ai/process      # Submit AI job
GET    /ai/:id          # Get job status
```

## 🧪 Testing

### **API Testing**
Visit the frontend test page: http://localhost:8080/api-test

### **Database Testing**
```bash
# Test direct database connection
node test-direct.js

# Test Express database connection
node test-express-db.js

# Test minimal Express server
node minimal-test.js
```

### **Health Checks**
```bash
# Backend health
curl http://localhost:3000/health

# Database connection
curl http://localhost:3000/test-db
```

## 🐳 Docker Services

### **Service Configuration**
```yaml
# PostgreSQL Database
postgres:
  port: 5433:5432
  database: podbook
  user: podbook_user
  password: podbook_password

# Redis Cache
redis:
  port: 6379:6379
  persistence: enabled

# pgAdmin
pgadmin:
  port: 5050:80
  email: admin@podbook.com
  password: admin123

# Backend API
backend:
  port: 3000:3000
  environment: development
  volumes: ./src:/app/src
```

### **Docker Commands**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Reset everything
docker-compose down -v
docker-compose up -d
```

## 🔍 Debugging

### **View Logs**
```bash
# Backend logs
docker logs podbook_backend

# Database logs
docker logs podbook_postgres

# Redis logs
docker logs podbook_redis
```

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check port binding
netstat -an | grep 5433

# Restart database
docker restart podbook_postgres
```

#### **Port Conflicts**
```bash
# Check what's using port 3000
lsof -i :3000

# Kill conflicting processes
lsof -ti:3000 | xargs kill -9
```

#### **Docker Issues**
```bash
# Reset Docker environment
docker-compose down -v
docker system prune -f
docker-compose up -d
```

## 📊 Environment Variables

### **Required Variables**
```bash
# Database
DATABASE_URL="postgresql://podbook_user:podbook_password@localhost:5432/podbook"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV=development
```

### **Optional Variables**
```bash
# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4"

# File upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"
```

## 🚀 Production Deployment

### **Build Process**
```bash
# Install dependencies
npm ci --only=production

# Build TypeScript
npm run build

# Start production server
npm start
```

### **Environment Setup**
```bash
# Set production environment
NODE_ENV=production
PORT=3000

# Use production database
DATABASE_URL="postgresql://user:pass@host:5432/podbook"

# Secure JWT secret
JWT_SECRET="very-long-secure-secret-key"
```

## 🤝 Contributing

### **Development Workflow**
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all tests pass
4. Submit pull request with description

### **Code Standards**
- Use TypeScript for all new code
- Follow Express.js best practices
- Implement proper error handling
- Add JSDoc comments for complex functions
- Use consistent naming conventions

### **Testing Requirements**
- Test all new endpoints
- Verify database operations
- Check authentication flows
- Test error scenarios

---

**Last Updated:** August 21, 2024  
**Version:** 1.0.0-alpha  
**Status:** Core Infrastructure Complete ✅
