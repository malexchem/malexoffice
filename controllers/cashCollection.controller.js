// controllers/cashCollection.controller.js
const CashCollection = require('../models/cashCollection');

// Create new cash collection
exports.create = async (req, res) => {
  try {
    const {
      customerName,
      documentNumber,
      documentType,
      amountPaid,
      modeOfPayment,
      mpesaReference,
      mpesaPhone,
      chequeNumber,
      chequeBank,
      chequeDate,
      bankReference,
      bankName,
      paymentDate,
      collectedBy,
      notes
    } = req.body;

    // Validate required fields
    if (!customerName || !documentNumber || !documentType || !amountPaid || !modeOfPayment || !collectedBy) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create cash collection
    const cashCollection = new CashCollection({
      customerName,
      documentNumber,
      documentType,
      amountPaid: parseFloat(amountPaid),
      modeOfPayment,
      mpesaReference,
      mpesaPhone,
      chequeNumber,
      chequeBank,
      chequeDate: chequeDate ? new Date(chequeDate) : undefined,
      bankReference,
      bankName,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      collectedBy,
      notes,
      createdBy: req.user?.name || req.user?.email || 'System',
      status: modeOfPayment === 'mpesa' && mpesaReference ? 'verified' : 'pending'
    });

    await cashCollection.save();

    // If this is for a sale, update the sale's paid amount
    if (documentType !== 'cash_sale') {
      try {
        const Sales = require('../models/sales');
        const sale = await Sales.findOne({ documentNumber });
        
        if (sale) {
          sale.paidAmount = (sale.paidAmount || 0) + parseFloat(amountPaid);
          sale.balanceDue = sale.totalAmount - sale.paidAmount;
          
          // Update payment status
          if (sale.balanceDue <= 0) {
            sale.paymentStatus = 'paid';
          } else if (sale.paidAmount > 0) {
            sale.paymentStatus = 'partial';
          }
          
          await sale.save();
        }
      } catch (error) {
        console.error('[WARNING] Failed to update sale:', error);
        // Continue even if sale update fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Cash collection recorded successfully',
      data: cashCollection
    });

  } catch (error) {
    console.error('[ERROR] Creating cash collection:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all cash collections with pagination and filters
exports.getAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Build filter query
    const query = {};

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by mode of payment
    if (req.query.modeOfPayment) {
      query.modeOfPayment = req.query.modeOfPayment;
    }

    // Filter by document type
    if (req.query.documentType) {
      query.documentType = req.query.documentType;
    }

    // Filter by customer name (partial match)
    if (req.query.customerName) {
      query.customerName = { $regex: req.query.customerName, $options: 'i' };
    }

    // Filter by document number (partial match)
    if (req.query.documentNumber) {
      query.documentNumber = { $regex: req.query.documentNumber, $options: 'i' };
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.paymentDate = {};
      if (req.query.startDate) {
        query.paymentDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.paymentDate.$lte = new Date(req.query.endDate);
      }
    }

    // Execute queries
    const [collections, total] = await Promise.all([
      CashCollection.find(query)
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CashCollection.countDocuments(query)
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: collections
    });

  } catch (error) {
    console.error('[ERROR] Getting cash collections:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get cash collection by ID
exports.getById = async (req, res) => {
  try {
    const collection = await CashCollection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Cash collection not found'
      });
    }

    res.json({
      success: true,
      data: collection
    });

  } catch (error) {
    console.error('[ERROR] Getting cash collection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update cash collection
exports.update = async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove fields that shouldn't be updated
    delete updates._id;
    delete updates.createdAt;
    delete updates.createdBy;

    // If updating amount, update related sale
    if (updates.amountPaid) {
      const collection = await CashCollection.findById(req.params.id);
      if (collection) {
        const Sales = require('../models/sales');
        const sale = await Sales.findOne({ documentNumber: collection.documentNumber });
        
        if (sale) {
          // Recalculate based on new amount
          const amountDiff = updates.amountPaid - collection.amountPaid;
          sale.paidAmount = (sale.paidAmount || 0) + amountDiff;
          sale.balanceDue = sale.totalAmount - sale.paidAmount;
          
          // Update payment status
          if (sale.balanceDue <= 0) {
            sale.paymentStatus = 'paid';
          } else if (sale.paidAmount > 0) {
            sale.paymentStatus = 'partial';
          } else {
            sale.paymentStatus = 'pending';
          }
          
          await sale.save();
        }
      }
    }

    const collection = await CashCollection.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Cash collection not found'
      });
    }

    res.json({
      success: true,
      message: 'Cash collection updated successfully',
      data: collection
    });

  } catch (error) {
    console.error('[ERROR] Updating cash collection:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete cash collection
exports.delete = async (req, res) => {
  try {
    const collection = await CashCollection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Cash collection not found'
      });
    }

    // Update related sale if exists
    if (collection.documentType !== 'cash_sale') {
      try {
        const Sales = require('../models/sales');
        const sale = await Sales.findOne({ documentNumber: collection.documentNumber });
        
        if (sale) {
          sale.paidAmount = Math.max(0, (sale.paidAmount || 0) - collection.amountPaid);
          sale.balanceDue = sale.totalAmount - sale.paidAmount;
          
          // Update payment status
          if (sale.balanceDue <= 0) {
            sale.paymentStatus = 'paid';
          } else if (sale.paidAmount > 0) {
            sale.paymentStatus = 'partial';
          } else {
            sale.paymentStatus = 'pending';
          }
          
          await sale.save();
        }
      } catch (error) {
        console.error('[WARNING] Failed to update sale:', error);
      }
    }

    await CashCollection.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Cash collection deleted successfully'
    });

  } catch (error) {
    console.error('[ERROR] Deleting cash collection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get summary statistics
exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await CashCollection.getSummary(startDate, endDate);
    
    res.json({
      success: true,
      data: summary[0] || {
        totalAmount: 0,
        totalCollections: 0,
        totalVerified: 0,
        totalPending: 0,
        totalDeposited: 0,
        byPaymentMode: {}
      }
    });

  } catch (error) {
    console.error('[ERROR] Getting summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Verify a cash collection
exports.verify = async (req, res) => {
  try {
    const { verifiedBy } = req.body;
    
    const collection = await CashCollection.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'verified',
          verifiedBy,
          verifiedAt: new Date()
        }
      },
      { new: true }
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Cash collection not found'
      });
    }

    res.json({
      success: true,
      message: 'Cash collection verified successfully',
      data: collection
    });

  } catch (error) {
    console.error('[ERROR] Verifying cash collection:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Mark as deposited to bank
exports.markAsDeposited = async (req, res) => {
  try {
    const collection = await CashCollection.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          depositedToBank: true,
          depositDate: new Date(),
          status: 'deposited'
        }
      },
      { new: true }
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Cash collection not found'
      });
    }

    res.json({
      success: true,
      message: 'Cash collection marked as deposited',
      data: collection
    });

  } catch (error) {
    console.error('[ERROR] Marking as deposited:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};