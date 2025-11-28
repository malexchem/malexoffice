const SalaryPayment = require('../models/SalaryPayment');

// Get all salary payments
exports.getSalaryPayments = async (req, res) => {
  try {
    const { month, year, employee, status } = req.query;
    let filter = {};
    
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    
    const payments = await SalaryPayment.find(filter)
      .populate('employee', 'firstName lastName position')
      .populate('processedBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get salary statistics
exports.getSalaryStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Monthly totals for current year
    const monthlyStats = await SalaryPayment.aggregate([
      {
        $match: {
          year: currentYear,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$month',
          totalSalary: { $sum: '$basicSalary' },
          totalCommission: { $sum: '$commission' },
          totalAllowances: { $sum: '$allowances' },
          totalDeductions: { $sum: '$deductions' },
          totalPaid: { $sum: '$totalAmount' },
          employeeCount: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Employee-wise totals
    const employeeStats = await SalaryPayment.aggregate([
      {
        $match: {
          year: currentYear,
          status: 'paid'
        }
      },
      {
        $group: {
          _id: '$employee',
          totalEarned: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commission' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $unwind: '$employee'
      },
      {
        $project: {
          'employee.firstName': 1,
          'employee.lastName': 1,
          'employee.position': 1,
          totalEarned: 1,
          totalCommission: 1,
          paymentCount: 1
        }
      },
      {
        $sort: { totalEarned: -1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        monthlyStats,
        employeeStats,
        year: currentYear
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
