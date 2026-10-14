const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const { authenticate, plannerOrAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(plannerOrAdmin);

// Job orders
router.get('/job-orders', plannerController.getAllJobOrders);
router.post('/job-orders', plannerController.createJobOrder);

// Productivity / efficiency / utilization overview
router.get('/dashboard', plannerController.getDashboard);

module.exports = router;
