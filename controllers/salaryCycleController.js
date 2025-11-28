const SalaryCycle = require('../models/SalaryCycle');
const Employee = require('../models/Employee');
const SalaryPayment = require('../models/SalaryPayment');

// Get all salary cycles
exports.getSalaryCycles = async (req, res) => {
  try {
    const { year, status } = req.query;
    let filter = {};
    
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;
    
    const cycles = await SalaryCycle.find(filter)
      .populate('employees.employee', 'firstName lastName position')
      .populate('processedBy', 'name')
      .sort({ year: -1, month: -1 });
    
    res.status(200).json({
      success: true,
      count: cycles.length,
      data: cycles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get current active cycle
exports.getCurrentCycle = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    const cycle = await SalaryCycle.findOne({
      month: currentMonth,
      year: currentYear,
      status: { $in: ['draft', 'processing'] }
    }).populate('employees.employee', 'firstName lastName position paymentMethod basicSalary');
    
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'No active salary cycle found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: cycle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create salary cycle
exports.createSalaryCycle = async (req, res) => {
  try {
    const { month, year, paymentDate, includeAllEmployees } = req.body;
    
    // Check if cycle already exists
    const existingCycle = await SalaryCycle.findOne({ month, year });
    if (existingCycle) {
      return res.status(400).json({
        success: false,
        error: `Salary cycle for ${month}/${year} already exists`
      });
    }
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    const cycleData = {
      month,
      year,
      cycleName: `${monthNames[month - 1]} ${year} Salary`,
      paymentDate: new Date(paymentDate),
      employees: [],
      //processedBy: req.user.id
    };
    
    // Add employees to cycle
    if (includeAllEmployees) {
      const activeEmployees = await Employee.find({ status: 'active' });
      
      cycleData.employees = activeEmployees.map(emp => ({
        employee: emp._id,
        basicSalary: emp.basicSalary,
        commission: 0,
        allowances: 0,
        deductions: 0
      }));
    }
    
    const cycle = await SalaryCycle.create(cycleData);
    
    res.status(201).json({
      success: true,
      data: cycle
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update salary cycle
exports.updateSalaryCycle = async (req, res) => {
  try {
    const cycle = await SalaryCycle.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('employees.employee', 'firstName lastName position');
    
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'Salary cycle not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: cycle
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Process payroll
exports.processPayroll = async (req, res) => {
  try {
    const cycle = await SalaryCycle.findById(req.params.id)
      .populate('employees.employee');
    
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'Salary cycle not found'
      });
    }
    
    if (cycle.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payroll already processed'
      });
    }
    
    // Create salary payment records
    const paymentPromises = cycle.employees.map(async (entry) => {
      if (entry.status === 'pending') {
        const totalAmount = entry.basicSalary + entry.commission + entry.allowances - entry.deductions;
        
        return SalaryPayment.create({
          employee: entry.employee._id,
          month: cycle.month,
          year: cycle.year,
          basicSalary: entry.basicSalary,
          commission: entry.commission,
          allowances: entry.allowances,
          deductions: entry.deductions,
          totalAmount,
          paymentMethod: entry.employee.paymentMethod,
          status: 'paid',
          paidAt: new Date(),
         // processedBy: req.user.id,
          notes: entry.notes
        });
      }
    });
    
    await Promise.all(paymentPromises);
    
    // Update cycle status
    cycle.status = 'completed';
    cycle.processedAt = new Date();
    await cycle.save();
    
    res.status(200).json({
      success: true,
      message: `Payroll processed successfully for ${cycle.cycleName}`,
      data: cycle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update employee entry in cycle
exports.updateEmployeeEntry = async (req, res) => {
  try {
    const { cycleId, employeeId } = req.params;
    
    const cycle = await SalaryCycle.findById(cycleId);
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'Salary cycle not found'
      });
    }
    
    const employeeEntry = cycle.employees.id(employeeId);
    if (!employeeEntry) {
      return res.status(404).json({
        success: false,
        error: 'Employee entry not found in cycle'
      });
    }
    
    // Update entry
    Object.assign(employeeEntry, req.body);
    await cycle.save();
    
    const updatedCycle = await SalaryCycle.findById(cycleId)
      .populate('employees.employee', 'firstName lastName position');
    
    res.status(200).json({
      success: true,
      data: updatedCycle
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
