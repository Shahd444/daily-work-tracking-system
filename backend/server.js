require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const employeeRoutes = require('./routes/employeeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const productRoutes = require('./routes/productRoutes');
const operationRoutes = require('./routes/operationRoutes');
const taskRoutes = require('./routes/taskRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const { loginLimiter } = require('./middleware/rateLimit');

const app = express();

// Set TRUST_PROXY=1 when running behind a reverse proxy so rate limiting sees the real client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes (no authentication required)
app.use('/api/employees/login', loginLimiter);
app.use('/api/employees', employeeRoutes);

// Protected routes
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/supervisor', supervisorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Employee Tracking System API',
    version: '2.0.0',
    endpoints: {
      authentication: {
        login: 'POST /api/employees/login',
        profile: 'GET /api/employees/profile',
        description: 'Login with username and password. Get your profile with authentication.'
      },
      admin: {
        base: '/api/admin',
        description: 'Admin-only endpoints for user management',
        requiresAuth: true,
        requiredRole: 'admin'
      },
      departments: {
        base: '/api/departments',
        description: 'Department management (admin only)',
        requiresAuth: true,
        requiredRole: 'admin'
      },
      products: {
        base: '/api/products',
        description: 'Product management (planner/admin)',
        requiresAuth: true,
        requiredRole: 'planner or admin'
      },
      operations: {
        base: '/api/operations',
        description: 'Operation management (planner/admin)',
        requiresAuth: true,
        requiredRole: 'planner or admin'
      },
      planner: {
        base: '/api/planner',
        description: 'Planner dashboard (productivity, efficiency, utilization) and job orders',
        requiresAuth: true,
        requiredRole: 'planner or admin'
      },
      technician: {
        base: '/api/technician',
        description: 'Own breaks and leave requests',
        requiresAuth: true,
        requiredRole: 'any authenticated user'
      },
      supervisor: {
        base: '/api/supervisor',
        description: 'Review leave requests of the supervisor department',
        requiresAuth: true,
        requiredRole: 'supervisor or admin'
      },
      tasks: {
        base: '/api/tasks',
        description: 'Task management - technicians can create/view their tasks, supervisors can validate/reject',
        requiresAuth: true,
        requiredRole: 'varies by endpoint'
      }
    },
    authenticationNote: 'Include Authorization: Bearer <token> header for protected endpoints'
  });
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    // The schema is managed by migrations (npm run migrate), never by sequelize.sync()
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ API documentation available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
