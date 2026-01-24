// controllers/cleanController.js
/*const Clean = require("../models/recordsClean");

// Helper function to get today's date range
const getTodayDateRange = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return {
        start: startOfDay.getTime(), // Unix timestamp in milliseconds
        end: endOfDay.getTime()
    };
};

// GET /api/clean - Get all records with pagination
const getAllCleanRecords = async (req, res) => {
  try {
    // Get page & limit from query params, defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Total count (for frontend pagination)
    const totalRecords = await Clean.countDocuments();

    // Fetch records with pagination
    const records = await Clean.find()
      .sort({ createdAt_date: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      records,
    });
  } catch (err) {
    console.error("Error fetching Clean records:", err);
    res.status(500).json({
      success: false,
      message: "Server Error fetching Clean records",
      error: err.message,
    });
  }
};

const createCleanRecord = async (req, res) => {
  try {
    // ✅ Strict required fields
    const requiredFields = [
      'documentType',       // must be INVOICE, CASH_SALE, QUOTATION
      'documentNo',         // must exist
      'customerName',       // must exist
      'amount',             // must exist and be number
      'facilitator',        // must exist
      'createdBy',          // must exist
      'created_time_utc',
      'created_time_nairobi',
      'createdAt_date',
      'createdAt_text',
      'created_year',
      'created_month',
      'created_day'
    ];

    // Check for missing fields
    const missingFields = requiredFields.filter(field => {
      // treat empty string or null or undefined as missing
      const val = req.body[field];
      return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate documentType enum
    const validDocumentTypes = ['INVOICE', 'CASH_SALE', 'QUOTATION'];
    if (!validDocumentTypes.includes(req.body.documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid documentType. Must be one of: ${validDocumentTypes.join(', ')}`
      });
    }

    // Check if documentNo already exists for the same type
    const existingRecord = await Clean.findOne({
      documentType: req.body.documentType,
      documentNo: req.body.documentNo
    });

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: `Document number ${req.body.documentNo} already exists for ${req.body.documentType}`
      });
    }

    // ✅ Create the record
    const cleanRecord = new Clean(req.body);
    await cleanRecord.save();

    res.status(201).json({
      success: true,
      message: "Clean record created successfully",
      record: cleanRecord
    });

  } catch (error) {
    console.error("Error creating clean record:", error);

    // Duplicate key error (documentType + documentNo)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Document number must be unique per document type",
        error: error.message
      });
    }

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message
      });
    }

    // Other server errors
    res.status(500).json({
      success: false,
      message: "Server error creating clean record",
      error: error.message
    });
  }
};


// GET /api/clean/today - Get today's records
const getTodayCleanRecords = async (req, res) => {
    try {
        // Get page & limit from query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        
        // Get today's date range
        const { start, end } = getTodayDateRange();
        
        // Build query for today's records
        const todayQuery = {
            createdAt_date: { 
                $gte: start, 
                $lt: end 
            }
        };
        
        // Get total count for today
        const totalRecords = await Clean.countDocuments(todayQuery);
        
        // Fetch today's records with pagination
        const records = await Clean.find(todayQuery)
            .sort({ createdAt_date: -1 }) // Most recent first
            .skip(skip)
            .limit(limit);
        
        // Get today's stats
        const todayStats = await Clean.aggregate([
            { $match: todayQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    invoiceCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "INVOICE"] }, 1, 0] }
                    },
                    cashSaleCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "CASH_SALE"] }, 1, 0] }
                    },
                    quotationCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "QUOTATION"] }, 1, 0] }
                    }
                }
            }
        ]);
        
        const stats = todayStats[0] || {
            totalAmount: 0,
            invoiceCount: 0,
            cashSaleCount: 0,
            quotationCount: 0
        };
        
        res.status(200).json({
            success: true,
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            records,
            stats: {
                totalAmount: stats.totalAmount || 0,
                invoiceCount: stats.invoiceCount || 0,
                cashSaleCount: stats.cashSaleCount || 0,
                quotationCount: stats.quotationCount || 0
            },
            dateFilter: {
                date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
                startTimestamp: start,
                endTimestamp: end
            }
        });
        
    } catch (err) {
        console.error("Error fetching today's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching today's records",
            error: err.message,
        });
    }
};

// GET /api/clean/:id - Get single record by ID
const getCleanRecordById = async (req, res) => {
  try {
    const record = await Clean.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }
    
    res.status(200).json({
      success: true,
      record
    });
  } catch (err) {
    console.error("Error fetching clean record:", err);
    res.status(500).json({
      success: false,
      message: "Server Error fetching record",
      error: err.message,
    });
  }
};

// PUT /api/clean/:id - Update a clean record
const updateCleanRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove _id from update data to prevent modification
    delete updateData._id;
    
    // Check if record exists
    const existingRecord = await Clean.findById(id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }
    
    // If documentNo is being changed, check for duplicates
    if (updateData.documentNo && 
        updateData.documentNo !== existingRecord.documentNo &&
        updateData.documentType === existingRecord.documentType) {
      
      const duplicateRecord = await Clean.findOne({
        documentType: updateData.documentType,
        documentNo: updateData.documentNo,
        _id: { $ne: id } // Exclude current record
      });
      
      if (duplicateRecord) {
        return res.status(400).json({
          success: false,
          message: `Document number ${updateData.documentNo} already exists for ${updateData.documentType}`
        });
      }
    }
    
    // Validate documentType if provided
    if (updateData.documentType) {
      const validDocumentTypes = ['INVOICE', 'CASH_SALE', 'QUOTATION'];
      if (!validDocumentTypes.includes(updateData.documentType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid documentType. Must be one of: ${validDocumentTypes.join(', ')}`
        });
      }
    }
    
    // Update the record
    const updatedRecord = await Clean.findByIdAndUpdate(
      id,
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );
    
    res.status(200).json({
      success: true,
      message: "Record updated successfully",
      record: updatedRecord
    });
    
  } catch (error) {
    console.error("Error updating clean record:", error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Document number must be unique per document type",
        error: error.message
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error updating record",
      error: error.message
    });
  }
};

// DELETE /api/clean/:id - Delete a clean record
const deleteCleanRecord = async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await Clean.findByIdAndDelete(id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Record deleted successfully",
      record
    });
    
  } catch (error) {
    console.error("Error deleting clean record:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting record",
      error: error.message
    });
  }
};

module.exports = {
  getAllCleanRecords,
  createCleanRecord,
  getTodayCleanRecords,
  getCleanRecordById,      
  updateCleanRecord,       
  deleteCleanRecord        
};*/



// controllers/cleanController.js
const Clean = require("../models/recordsClean");

// Helper functions for date ranges
const getTodayDateRange = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    return {
        start: startOfDay.getTime(),
        end: endOfDay.getTime()
    };
};

const getYesterdayDateRange = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    
    return {
        start: startOfDay.getTime(),
        end: endOfDay.getTime()
    };
};

const getThisWeekDateRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start of week
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return {
        start: startOfWeek.getTime(),
        end: endOfWeek.getTime()
    };
};

const getThisMonthDateRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    return {
        start: startOfMonth.getTime(),
        end: endOfMonth.getTime()
    };
};

const getThisYearDateRange = () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear() + 1, 0, 1);
    
    return {
        start: startOfYear.getTime(),
        end: endOfYear.getTime()
    };
};

const getLastNDaysDateRange = (days) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 1); // Include today
    
    return {
        start: startDate.getTime(),
        end: endDate.getTime()
    };
};

// Generic function to get filtered records
const getFilteredCleanRecords = async (dateRange, req, res) => {
    try {
        // Get page & limit from query params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;
        
        // Build query with date range
        const dateQuery = {
            createdAt_date: { 
                $gte: dateRange.start, 
                $lt: dateRange.end 
            }
        };
        
        // Get total count
        const totalRecords = await Clean.countDocuments(dateQuery);
        
        // Fetch records with pagination
        const records = await Clean.find(dateQuery)
            .sort({ createdAt_date: -1 })
            .skip(skip)
            .limit(limit);
        
        // Get statistics
        const stats = await Clean.aggregate([
            { $match: dateQuery },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$amount" },
                    invoiceCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "INVOICE"] }, 1, 0] }
                    },
                    cashSaleCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "CASH_SALE"] }, 1, 0] }
                    },
                    quotationCount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "QUOTATION"] }, 1, 0] }
                    },
                    // Additional breakdown by document type for amount
                    invoiceAmount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "INVOICE"] }, "$amount", 0] }
                    },
                    cashSaleAmount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "CASH_SALE"] }, "$amount", 0] }
                    },
                    quotationAmount: {
                        $sum: { $cond: [{ $eq: ["$documentType", "QUOTATION"] }, "$amount", 0] }
                    }
                }
            }
        ]);
        
        const resultStats = stats[0] || {
            totalAmount: 0,
            invoiceCount: 0,
            cashSaleCount: 0,
            quotationCount: 0,
            invoiceAmount: 0,
            cashSaleAmount: 0,
            quotationAmount: 0
        };
        
        return {
            success: true,
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            records,
            stats: {
                totalAmount: resultStats.totalAmount || 0,
                invoiceCount: resultStats.invoiceCount || 0,
                cashSaleCount: resultStats.cashSaleCount || 0,
                quotationCount: resultStats.quotationCount || 0,
                invoiceAmount: resultStats.invoiceAmount || 0,
                cashSaleAmount: resultStats.cashSaleAmount || 0,
                quotationAmount: resultStats.quotationAmount || 0
            },
            dateFilter: {
                startTimestamp: dateRange.start,
                endTimestamp: dateRange.end,
                startDate: new Date(dateRange.start).toISOString(),
                endDate: new Date(dateRange.end).toISOString()
            }
        };
        
    } catch (err) {
        console.error("Error fetching filtered Clean records:", err);
        throw err;
    }
};

// GET /api/clean - Get all records with pagination
const getAllCleanRecords = async (req, res) => {
    try {
        // Get page & limit from query params, defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        // Total count (for frontend pagination)
        const totalRecords = await Clean.countDocuments();

        // Fetch records with pagination
        const records = await Clean.find()
            .sort({ createdAt_date: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            records,
        });
    } catch (err) {
        console.error("Error fetching Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching Clean records",
            error: err.message,
        });
    }
};

// GET /api/clean/today - Get today's records
const getTodayCleanRecords = async (req, res) => {
    try {
        const dateRange = getTodayDateRange();
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        // Add human-readable date info
        result.dateFilter.dateLabel = "Today";
        result.dateFilter.date = new Date().toISOString().split('T')[0];
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching today's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching today's records",
            error: err.message,
        });
    }
};

// GET /api/clean/yesterday - Get yesterday's records
const getYesterdayCleanRecords = async (req, res) => {
    try {
        const dateRange = getYesterdayDateRange();
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        result.dateFilter.dateLabel = "Yesterday";
        result.dateFilter.date = yesterday.toISOString().split('T')[0];
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching yesterday's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching yesterday's records",
            error: err.message,
        });
    }
};

// GET /api/clean/this-week - Get this week's records
const getThisWeekCleanRecords = async (req, res) => {
    try {
        const dateRange = getThisWeekDateRange();
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "This Week";
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching this week's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching this week's records",
            error: err.message,
        });
    }
};

// GET /api/clean/this-month - Get this month's records
const getThisMonthCleanRecords = async (req, res) => {
    try {
        const dateRange = getThisMonthDateRange();
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "This Month";
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching this month's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching this month's records",
            error: err.message,
        });
    }
};

// GET /api/clean/this-year - Get this year's records
const getThisYearCleanRecords = async (req, res) => {
    try {
        const dateRange = getThisYearDateRange();
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "This Year";
        result.dateFilter.year = new Date().getFullYear();
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching this year's Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching this year's records",
            error: err.message,
        });
    }
};

// GET /api/clean/last-7-days - Get last 7 days records
const getLast7DaysCleanRecords = async (req, res) => {
    try {
        const dateRange = getLastNDaysDateRange(7);
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "Last 7 Days";
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching last 7 days Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching last 7 days records",
            error: err.message,
        });
    }
};

// GET /api/clean/last-30-days - Get last 30 days records
const getLast30DaysCleanRecords = async (req, res) => {
    try {
        const dateRange = getLastNDaysDateRange(30);
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "Last 30 Days";
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching last 30 days Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching last 30 days records",
            error: err.message,
        });
    }
};

// GET /api/clean/custom - Get records for custom date range
const getCustomDateRangeCleanRecords = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Both startDate and endDate query parameters are required (format: YYYY-MM-DD or timestamp)"
            });
        }
        
        // Parse dates - handle both timestamp and ISO string
        const start = isNaN(startDate) ? new Date(startDate).getTime() : parseInt(startDate);
        const end = isNaN(endDate) ? new Date(endDate).getTime() : parseInt(endDate);
        
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Use timestamp or YYYY-MM-DD"
            });
        }
        
        // Add one day to end date to include the full end day
        const endDateObj = new Date(end);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const adjustedEnd = endDateObj.getTime();
        
        const dateRange = { start, end: adjustedEnd };
        const result = await getFilteredCleanRecords(dateRange, req, res);
        
        result.dateFilter.dateLabel = "Custom Date Range";
        result.dateFilter.startDateHuman = new Date(start).toISOString().split('T')[0];
        result.dateFilter.endDateHuman = new Date(end).toISOString().split('T')[0];
        
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching custom date range Clean records:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching custom date range records",
            error: err.message,
        });
    }
};

// Create, Read, Update, Delete operations remain the same...

const createCleanRecord = async (req, res) => {
    try {
        // ✅ Strict required fields
        const requiredFields = [
            'documentType',
            'documentNo',
            'customerName',
            'amount',
            'facilitator',
            'createdBy',
            'created_time_utc',
            'created_time_nairobi',
            'createdAt_date',
            'createdAt_text',
            'created_year',
            'created_month',
            'created_day'
        ];

        const missingFields = requiredFields.filter(field => {
            const val = req.body[field];
            return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const validDocumentTypes = ['INVOICE', 'CASH_SALE', 'QUOTATION'];
        if (!validDocumentTypes.includes(req.body.documentType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid documentType. Must be one of: ${validDocumentTypes.join(', ')}`
            });
        }

        const existingRecord = await Clean.findOne({
            documentType: req.body.documentType,
            documentNo: req.body.documentNo
        });

        if (existingRecord) {
            return res.status(400).json({
                success: false,
                message: `Document number ${req.body.documentNo} already exists for ${req.body.documentType}`
            });
        }

        const cleanRecord = new Clean(req.body);
        await cleanRecord.save();

        res.status(201).json({
            success: true,
            message: "Clean record created successfully",
            record: cleanRecord
        });

    } catch (error) {
        console.error("Error creating clean record:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Document number must be unique per document type",
                error: error.message
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: "Server error creating clean record",
            error: error.message
        });
    }
};

// GET /api/clean/:id - Get single record by ID
const getCleanRecordById = async (req, res) => {
    try {
        const record = await Clean.findById(req.params.id);
        
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }
        
        res.status(200).json({
            success: true,
            record
        });
    } catch (err) {
        console.error("Error fetching clean record:", err);
        res.status(500).json({
            success: false,
            message: "Server Error fetching record",
            error: err.message,
        });
    }
};

// PUT /api/clean/:id - Update a clean record
const updateCleanRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        delete updateData._id;
        
        const existingRecord = await Clean.findById(id);
        if (!existingRecord) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }
        
        if (updateData.documentNo && 
            updateData.documentNo !== existingRecord.documentNo &&
            updateData.documentType === existingRecord.documentType) {
            
            const duplicateRecord = await Clean.findOne({
                documentType: updateData.documentType,
                documentNo: updateData.documentNo,
                _id: { $ne: id }
            });
            
            if (duplicateRecord) {
                return res.status(400).json({
                    success: false,
                    message: `Document number ${updateData.documentNo} already exists for ${updateData.documentType}`
                });
            }
        }
        
        if (updateData.documentType) {
            const validDocumentTypes = ['INVOICE', 'CASH_SALE', 'QUOTATION'];
            if (!validDocumentTypes.includes(updateData.documentType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid documentType. Must be one of: ${validDocumentTypes.join(', ')}`
                });
            }
        }
        
        const updatedRecord = await Clean.findByIdAndUpdate(
            id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true
            }
        );
        
        res.status(200).json({
            success: true,
            message: "Record updated successfully",
            record: updatedRecord
        });
        
    } catch (error) {
        console.error("Error updating clean record:", error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Document number must be unique per document type",
                error: error.message
            });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Server error updating record",
            error: error.message
        });
    }
};

// DELETE /api/clean/:id - Delete a clean record
const deleteCleanRecord = async (req, res) => {
    try {
        const { id } = req.params;
        
        const record = await Clean.findByIdAndDelete(id);
        
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "Record not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Record deleted successfully",
            record
        });
        
    } catch (error) {
        console.error("Error deleting clean record:", error);
        res.status(500).json({
            success: false,
            message: "Server error deleting record",
            error: error.message
        });
    }
};

module.exports = {
    getAllCleanRecords,
    createCleanRecord,
    getTodayCleanRecords,
    getYesterdayCleanRecords,
    getThisWeekCleanRecords,
    getThisMonthCleanRecords,
    getThisYearCleanRecords,
    getLast7DaysCleanRecords,
    getLast30DaysCleanRecords,
    getCustomDateRangeCleanRecords,
    getCleanRecordById,
    updateCleanRecord,
    deleteCleanRecord
};