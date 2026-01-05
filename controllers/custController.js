const Customer = require('../models/cust');

// Generate customer ID
function generateCustomerId(sequence) {
  const prefix = 'CUST';
  const year = new Date().getFullYear().toString().slice(-2);
  const seq = sequence.toString().padStart(5, '0');
  return `${prefix}${year}${seq}`;
}

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      address,
      companyName,
      customerType,
      industry,
      category,
      status,
      priorityLevel,
      notes
    } = req.body;

    // Check if phone number already exists
    const existingCustomer = await Customer.findOne({ phoneNumber });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Customer with this phone number already exists'
      });
    }

    // Get the next sequence number
    const count = await Customer.countDocuments();
    const customerId = generateCustomerId(count + 1);

    const newCustomer = new Customer({
      fullName,
      phoneNumber,
      email: email || null,
      address,
      companyName: companyName || null,
      customerType,
      industry: industry || null,
      category: category || null,
      status,
      priorityLevel,
      notes: notes || null,
      createdBy: req.user?.name || 'System',
      lastContactDate: new Date()
    });

    await newCustomer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: newCustomer
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all customers with pagination and filtering
exports.getAllCustomers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Text search
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: 'i' } },
        { phoneNumber: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { customerId: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    
    // Filter by type
    if (req.query.customerType && req.query.customerType !== 'all') {
      filter.customerType = req.query.customerType;
    }
    
    // Filter by priority
    if (req.query.priorityLevel && req.query.priorityLevel !== 'all') {
      filter.priorityLevel = req.query.priorityLevel;
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter)
    ]);

    const hasMore = skip + customers.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: customers
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ id: req.params.id });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: customer
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.customerId;
    delete updates.createdAt;
    delete updates.createdBy;
    
    // Check if phone number is being changed and if it already exists
    if (updates.phoneNumber) {
      const existing = await Customer.findOne({ 
        phoneNumber: updates.phoneNumber,
        id: { $ne: req.params.id }
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Another customer already has this phone number'
        });
      }
    }

    const customer = await Customer.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ id: req.params.id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get customer statistics
exports.getCustomerStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      businessCustomers,
      individualCustomers,
      schoolCustomers,
      highPriorityCustomers,
      newCustomersThisMonth
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status: 'active' }),
      Customer.countDocuments({ customerType: 'business' }),
      Customer.countDocuments({ customerType: 'individual' }),
      Customer.countDocuments({ customerType: 'school' }),
      Customer.countDocuments({ priorityLevel: 'high' }),
      Customer.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      })
    ]);

    // Get status distribution
    const statusStats = await Customer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get type distribution
    const typeStats = await Customer.aggregate([
      { $group: { _id: '$customerType', count: { $sum: 1 } } }
    ]);

    // Get priority distribution
    const priorityStats = await Customer.aggregate([
      { $group: { _id: '$priorityLevel', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          all: totalCustomers,
          active: activeCustomers,
          business: businessCustomers,
          individual: individualCustomers,
          school: schoolCustomers,
          highPriority: highPriorityCustomers,
          newThisMonth: newCustomersThisMonth
        },
        distributions: {
          status: statusStats,
          type: typeStats,
          priority: priorityStats
        },
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search customers
exports.searchCustomers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const customers = await Customer.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { companyName: { $regex: query, $options: 'i' } },
        { customerId: { $regex: query, $options: 'i' } }
      ]
    }).limit(50);

    res.json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};