// controllers/customerController.js
const Customer = require('../models/customer');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      customerType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build filter object
    let filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (customerType && customerType !== 'all') {
      filter.customerType = customerType;
    }
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const customers = await Customer.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Customer.countDocuments(filter);

    // Calculate statistics
    const stats = await Customer.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalActive: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalVip: {
            $sum: { $cond: [{ $eq: ['$status', 'vip'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$totalSpent' },
          avgActivityScore: { $avg: '$activityScore' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      stats: stats[0] || {
        totalCustomers: 0,
        totalActive: 0,
        totalVip: 0,
        totalRevenue: 0,
        avgActivityScore: 0
      },
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    // Check if email already exists
    const existingCustomer = await Customer.findOne({ email: req.body.email });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    const customer = await Customer.create({
      ...req.body,
      //createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: customer
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    // Check if email is being updated and if it already exists
    if (req.body.email) {
      const existingCustomer = await Customer.findOne({
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get customer activity metrics
// @route   GET /api/customers/:id/activity
// @access  Private
exports.getCustomerActivity = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // In a real app, this would fetch actual activity data from transaction/activity logs
    // For now, we'll return simulated activity data
    const activityData = {
      recentTransactions: customer.totalTransactions > 0 ? [
        {
          date: new Date(Date.now() - 86400000), // Yesterday
          amount: customer.averageTransactionValue,
          type: 'purchase'
        },
        {
          date: new Date(Date.now() - 172800000), // 2 days ago
          amount: customer.averageTransactionValue * 1.5,
          type: 'service'
        }
      ].slice(0, Math.min(5, customer.totalTransactions)) : [],
      activityTimeline: [
        {
          date: customer.lastActivity,
          action: 'last_activity',
          description: customer.status === 'active' ? 'Made a purchase' : 'Account was updated'
        },
        {
          date: customer.createdAt,
          action: 'created',
          description: 'Customer account created'
        }
      ],
      metrics: {
        activityScore: customer.activityScore,
        lifetimeValue: customer.totalSpent,
        avgTransactionValue: customer.averageTransactionValue,
        transactionFrequency: customer.totalTransactions > 0 ? 
          customer.totalTransactions / Math.max(1, (Date.now() - customer.createdAt) / (1000 * 60 * 60 * 24 * 30)) : 0
      }
    };

    res.status(200).json({
      success: true,
      data: activityData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update customer activity
// @route   POST /api/customers/:id/activity
// @access  Private
exports.updateCustomerActivity = async (req, res) => {
  try {
    const { action, amount, notes } = req.body;
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Update customer activity metrics
    customer.lastActivity = new Date();
    
    if (action === 'transaction' && amount) {
      customer.totalTransactions += 1;
      customer.totalSpent += amount;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer activity updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get customer statistics
// @route   GET /api/customers/stats/overview
// @access  Private
exports.getCustomerStats = async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      {
        $facet: {
          statusDistribution: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          typeDistribution: [
            {
              $group: {
                _id: '$customerType',
                count: { $sum: 1 }
              }
            }
          ],
          activityRanges: [
            {
              $bucket: {
                groupBy: '$activityScore',
                boundaries: [0, 25, 50, 75, 101],
                default: 'Other',
                output: {
                  count: { $sum: 1 },
                  avgScore: { $avg: '$activityScore' }
                }
              }
            }
          ],
          monthlyGrowth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.year': -1, '_id.month': -1 }
            },
            {
              $limit: 6
            }
          ],
          topCustomers: [
            {
              $sort: { totalSpent: -1 }
            },
            {
              $limit: 5
            },
            {
              $project: {
                name: 1,
                email: 1,
                totalSpent: 1,
                activityScore: 1,
                status: 1
              }
            }
          ]
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};