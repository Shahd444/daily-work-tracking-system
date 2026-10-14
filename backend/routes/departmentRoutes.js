const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, adminOnly, plannerOrAdmin } = require('../middleware/auth');

router.use(authenticate);

// Planners need the department list (operations, statistics), but only admins change it
router.get('/', plannerOrAdmin, departmentController.getAllDepartments);
router.get('/:id', plannerOrAdmin, departmentController.getDepartmentById);
router.post('/', adminOnly, departmentController.createDepartment);
router.put('/:id', adminOnly, departmentController.updateDepartment);
router.delete('/:id', adminOnly, departmentController.deleteDepartment);

module.exports = router;
