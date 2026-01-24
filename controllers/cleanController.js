

// controllers/cleanController.js
const Clean = require("../models/recordsClean");

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
};