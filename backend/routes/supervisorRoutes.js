const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisorController');
const { authenticate, supervisorOrAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(supervisorOrAdmin);

// Leave requests of the supervisor's department
router.get('/leaves', supervisorController.getLeaves);
router.post('/leaves/:id/approve', supervisorController.approveLeave);
router.post('/leaves/:id/reject', supervisorController.rejectLeave);

module.exports = router;
