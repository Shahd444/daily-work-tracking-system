const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { authenticate, technicianOrAbove } = require('../middleware/auth');

router.use(authenticate);
router.use(technicianOrAbove);

// Breaks
router.get('/breaks', technicianController.getMyBreaks);
router.post('/breaks', technicianController.createBreak);

// Leaves
router.get('/leaves', technicianController.getMyLeaves);
router.post('/leaves', technicianController.createLeave);

module.exports = router;
