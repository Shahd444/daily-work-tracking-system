const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, adminOnly, plannerOrAdmin } = require('../middleware/auth');

router.use(authenticate);

// System statistics - also used by the planner's statistics/analytics pages
router.get('/stats', plannerOrAdmin, adminController.getSystemStats);
router.get('/stats/employees', plannerOrAdmin, adminController.getEmployeesStats);

// Everything below is admin only
router.use(adminOnly);

// Password generation
router.get('/generate-password', adminController.generatePassword);

// User management
router.post('/users', adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Password reset
router.post('/users/:id/reset-password', adminController.resetPassword);

module.exports = router;
