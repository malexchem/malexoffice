const express = require('express');
const router = express.Router();
const {
  getSalaryCycles,
  getCurrentCycle,
  createSalaryCycle,
  updateSalaryCycle,
  processPayroll,
  updateEmployeeEntry
} = require('../controllers/salaryCycleController');

router.route('/')
  .get(getSalaryCycles)
  .post(createSalaryCycle);

router.get('/current', getCurrentCycle);

router.route('/:id')
  .put(updateSalaryCycle);

router.put('/:id/process', processPayroll);

router.put('/:cycleId/employees/:employeeId', updateEmployeeEntry);

module.exports = router;
