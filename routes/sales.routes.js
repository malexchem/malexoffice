// routes/sales.routes.js
const router = require('express').Router();
const Sales = require('../models/sales');

// Get all sales with filters
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      documentType,
      startDate,
      endDate,
      customerName,
      paymentStatus,
      status
    } = req.query;

    const query = {};
    
    // Apply filters
    if (documentType) query.documentType = documentType;
    if (customerName) query.customerName = { $regex: customerName, $options: 'i' };
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (status) query.status = status;
    
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      Sales.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Sales.countDocuments(query)
    ]);

    res.json({
      success: true,
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      data: sales
    });

  } catch (error) {
    console.error('[ERROR] Fetching sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sales summary for dashboard
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const summary = await Sales.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceDue' }
        }
      },
      {
        $project: {
          documentType: '$_id',
          count: 1,
          totalAmount: 1,
          totalPaid: 1,
          totalBalance: 1,
          _id: 0
        }
      }
    ]);

    const totals = await Sales.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceDue' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byType: summary,
        overall: totals[0] || {
          totalSales: 0,
          totalPaid: 0,
          totalBalance: 0,
          count: 0
        }
      }
    });

  } catch (error) {
    console.error('[ERROR] Sales summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a single sale by ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });

  } catch (error) {
    console.error('[ERROR] Fetching sale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a sale (for accounting purposes)
/*router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Prevent updating certain fields
    delete updates.recordId;
    delete updates.documentNumber;
    delete updates.documentType;
    
    const sale = await Sales.findByIdAndUpdate(
      req.params.id,
      { $set: updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }

    res.json({
      success: true,
      message: 'Sales record updated successfully',
      data: sale
    });

  } catch (error) {
    console.error('[ERROR] Updating sale:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});*/

// routes/sales.routes.js - Update the PUT endpoint
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    
    // Prevent updating certain fields
    delete updates.recordId;
    delete updates.documentNumber;
    delete updates.documentType;
    
    // Find the sale first
    const sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (key in sale) {
        sale[key] = updates[key];
      }
    });
    
    // Recalculate totals and status
    sale.totalAmount = (sale.amount || 0) + (sale.taxAmount || 0) - (sale.discount || 0);
    sale.balanceDue = sale.totalAmount - (sale.paidAmount || 0);
    
    // Auto-update payment status based on amounts
    if (sale.balanceDue <= 0 && sale.totalAmount > 0) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0 && sale.balanceDue > 0) {
      sale.paymentStatus = 'partial';
    } else if (sale.paidAmount === 0 && sale.totalAmount > 0) {
      sale.paymentStatus = 'pending';
    }
    
    sale.updatedAt = new Date();
    
    await sale.save();

    res.json({
      success: true,
      message: 'Sales record updated successfully',
      data: sale
    });

  } catch (error) {
    console.error('[ERROR] Updating sale:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update payment status
/*router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMethod, paymentStatus } = req.body;
    
    const sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }

    // Update payment
    if (amount !== undefined) {
      sale.paidAmount = (sale.paidAmount || 0) + parseFloat(amount);
    }
    
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (paymentStatus) sale.paymentStatus = paymentStatus;
    
    // Recalculate balance
    sale.balanceDue = sale.totalAmount - sale.paidAmount;
    sale.updatedAt = new Date();
    
    await sale.save();

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: sale
    });

  } catch (error) {
    console.error('[ERROR] Updating payment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});*/

// routes/sales.routes.js - Update the PATCH payment endpoint
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMethod, paymentStatus } = req.body;
    
    const sale = await Sales.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }

    // Update payment with proper calculation
    if (amount !== undefined) {
      sale.paidAmount = (sale.paidAmount || 0) + parseFloat(amount);
    }
    
    if (paymentMethod) sale.paymentMethod = paymentMethod;
    if (paymentStatus) sale.paymentStatus = paymentStatus;
    
    // Recalculate balance
    sale.balanceDue = sale.totalAmount - sale.paidAmount;
    
    // Auto-update payment status based on amounts
    if (sale.balanceDue <= 0 && sale.totalAmount > 0) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0 && sale.balanceDue > 0) {
      sale.paymentStatus = 'partial';
    } else if (sale.paidAmount === 0 && sale.totalAmount > 0) {
      sale.paymentStatus = 'pending';
    }
    
    sale.updatedAt = new Date();
    
    await sale.save();

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: sale
    });

  } catch (error) {
    console.error('[ERROR] Updating payment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a sale (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sales.findByIdAndDelete(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        error: 'Sales record not found'
      });
    }

    res.json({
      success: true,
      message: 'Sales record deleted successfully'
    });

  } catch (error) {
    console.error('[ERROR] Deleting sale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;