// controllers/marketerReportController.js
const MarketerReport = require('../models/marketerReport');
const User = require('../models/user');
const cloudinary = require('../config/cloudinary');

// @desc    Create marketer report
// @route   POST /api/marketer-reports
// @access  Private (Marketers only)
exports.createReport = async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      marketer: req.user.id, // Assuming user is authenticated
      status: 'draft'
    };

    const report = await MarketerReport.create(reportData);

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
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

// @desc    Get all marketer reports
// @route   GET /api/marketer-reports
// @access  Private
exports.getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      status,
      marketerId,
      reviewed,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    let filter = {};
    
    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Marketer filter
    /*if (marketerId && marketerId !== 'all') {
      filter.marketer = marketerId;
    } else if (req.user.role === 'marketer') {
      // Marketers can only see their own reports
      filter.marketer = req.user.id;
    }*/
    
    // Reviewed filter
    if (reviewed === 'true') {
      filter.reviewedBy = { $exists: true };
    } else if (reviewed === 'false') {
      filter.reviewedBy = { $exists: false };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const reports = await MarketerReport.find(filter)
      .populate('marketer', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await MarketerReport.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single marketer report
// @route   GET /api/marketer-reports/:id
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const report = await MarketerReport.findById(req.params.id)
      .populate('marketer', 'name email phone department')
      .populate('reviewedBy', 'name email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions - marketers can only view their own reports
    if (req.user.role === 'marketer' && report.marketer._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this report'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update marketer report
// @route   PUT /api/marketer-reports/:id
// @access  Private
exports.updateReport = async (req, res) => {
  try {
    let report = await MarketerReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions - marketers can only update their own reports if not submitted
    if (req.user.role === 'marketer') {
      if (report.marketer.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this report'
        });
      }
      
      // Marketers cannot update reports that are already submitted, reviewed, or approved
      if (['submitted', 'reviewed', 'approved', 'rejected'].includes(report.status)) {
        return res.status(400).json({
          success: false,
          error: 'Cannot update a report that has already been submitted'
        });
      }
    }

    report = await MarketerReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('marketer', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      data: report
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

// @desc    Submit marketer report
// @route   POST /api/marketer-reports/:id/submit
// @access  Private (Marketers only)
exports.submitReport = async (req, res) => {
  try {
    const report = await MarketerReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions
    if (report.marketer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to submit this report'
      });
    }

    // Validate report before submission
    if (report.customerVisits.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot submit report without customer visits'
      });
    }

    if (!report.startTime || !report.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Start time and end time are required'
      });
    }

    // Update report status
    report.status = 'submitted';
    report.submittedAt = new Date();
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Review marketer report
// @route   POST /api/marketer-reports/:id/review
// @access  Private (Managers only)
exports.reviewReport = async (req, res) => {
  try {
    const { status, comments } = req.body;
    
    if (!['approved', 'rejected', 'reviewed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const report = await MarketerReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    if (report.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Report must be submitted before it can be reviewed'
      });
    }

    // Update report
    report.status = status;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    report.reviewComments = comments;
    
    await report.save();

    res.status(200).json({
      success: true,
      message: `Report ${status} successfully`,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete marketer report
// @route   DELETE /api/marketer-reports/:id
// @access  Private
exports.deleteReport = async (req, res) => {
  try {
    const report = await MarketerReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role === 'marketer' && report.marketer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this report'
      });
    }

    // Only allow deletion of draft reports
    if (report.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft reports can be deleted'
      });
    }

    await MarketerReport.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get marketer statistics
// @route   GET /api/marketer-reports/stats/overview
// @access  Private
/*exports.getMarketerStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

     //Get marketer-specific stats if user is marketer
    const matchFilter = req.user.role === 'marketer' 
      ? { marketer: req.user.id, date: { $gte: thirtyDaysAgo } }
      : { date: { $gte: thirtyDaysAgo } };

    const stats = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalVisits: { $sum: { $size: '$customerVisits' } },
          totalLeads: { $sum: '$leadsGenerated' },
          totalSales: { $sum: '$salesMade' },
          totalRevenue: { $sum: '$salesAmount' },
          avgEfficiency: { $avg: '$efficiencyScore' },
          submittedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
          },
          approvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get top marketers by visits
    const topMarketers = await MarketerReport.aggregate([
      {
        $match: { date: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: '$marketer',
          totalVisits: { $sum: { $size: '$customerVisits' } },
          totalLeads: { $sum: '$leadsGenerated' },
          totalSales: { $sum: '$salesMade' },
          avgEfficiency: { $avg: '$efficiencyScore' }
        }
      },
      {
        $sort: { totalVisits: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'marketer'
        }
      },
      {
        $unwind: '$marketer'
      },
      {
        $project: {
          'marketer.name': 1,
          'marketer.email': 1,
          totalVisits: 1,
          totalLeads: 1,
          totalSales: 1,
          avgEfficiency: 1
        }
      }
    ]);

    // Get daily activity for last 7 days
    const dailyActivity = await MarketerReport.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          visits: { $sum: { $size: '$customerVisits' } },
          reports: { $sum: 1 },
          sales: { $sum: '$salesMade' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get visit status distribution
    const visitStatusDistribution = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $unwind: '$customerVisits'
      },
      {
        $group: {
          _id: '$customerVisits.status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalReports: 0,
          totalVisits: 0,
          totalLeads: 0,
          totalSales: 0,
          totalRevenue: 0,
          avgEfficiency: 0,
          submittedReports: 0,
          approvedReports: 0
        },
        topMarketers,
        dailyActivity,
        visitStatusDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};*/

// @desc    Get marketer statistics
// @route   GET /api/marketer-reports/stats/overview
// @access  Public (for now - can be changed to Private later)
exports.getMarketerStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // For now, get all reports without filtering by marketer
    // Remove the role check entirely
    const matchFilter = { date: { $gte: thirtyDaysAgo } };

    const stats = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalVisits: { $sum: { $size: '$customerVisits' } },
          totalLeads: { $sum: '$leadsGenerated' },
          totalSales: { $sum: '$salesMade' },
          totalRevenue: { $sum: '$salesAmount' },
          avgEfficiency: { $avg: '$efficiencyScore' },
          submittedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
          },
          approvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get top marketers by visits
    const topMarketers = await MarketerReport.aggregate([
      {
        $match: { date: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: '$marketer',
          totalVisits: { $sum: { $size: '$customerVisits' } },
          totalLeads: { $sum: '$leadsGenerated' },
          totalSales: { $sum: '$salesMade' },
          avgEfficiency: { $avg: '$efficiencyScore' }
        }
      },
      {
        $sort: { totalVisits: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'marketer'
        }
      },
      {
        $unwind: '$marketer'
      },
      {
        $project: {
          'marketer.name': 1,
          'marketer.email': 1,
          totalVisits: 1,
          totalLeads: 1,
          totalSales: 1,
          avgEfficiency: 1
        }
      }
    ]);

    // Get daily activity for last 7 days
    const dailyActivity = await MarketerReport.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          visits: { $sum: { $size: '$customerVisits' } },
          reports: { $sum: 1 },
          sales: { $sum: '$salesMade' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get visit status distribution
    const visitStatusDistribution = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $unwind: '$customerVisits'
      },
      {
        $group: {
          _id: '$customerVisits.status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalReports: 0,
          totalVisits: 0,
          totalLeads: 0,
          totalSales: 0,
          totalRevenue: 0,
          avgEfficiency: 0,
          submittedReports: 0,
          approvedReports: 0
        },
        topMarketers,
        dailyActivity,
        visitStatusDistribution
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get marketer performance by date range
// @route   GET /api/marketer-reports/stats/performance
// @access  Private
exports.getMarketerPerformance = async (req, res) => {
  try {
    const { startDate, endDate, marketerId } = req.query;
    
    let matchFilter = {};
    
    // Date range filter
    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    }
    
    // Marketer filter
    if (marketerId && marketerId !== 'all') {
      matchFilter.marketer = marketerId;
    } else if (req.user.role === 'marketer') {
      matchFilter.marketer = req.user.id;
    }

    const performance = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: '$marketer',
          totalReports: { $sum: 1 },
          totalVisits: { $sum: { $size: '$customerVisits' } },
          totalLeads: { $sum: '$leadsGenerated' },
          totalSales: { $sum: '$salesMade' },
          totalRevenue: { $sum: '$salesAmount' },
          avgVisitsPerDay: { $avg: { $size: '$customerVisits' } },
          avgEfficiency: { $avg: '$efficiencyScore' },
          totalDistance: { $sum: '$totalDistance' },
          totalWorkingHours: {
            $sum: {
              $let: {
                vars: {
                  start: { $arrayElemAt: [{ $split: ['$startTime', ':'] }, 0] },
                  startMin: { $arrayElemAt: [{ $split: ['$startTime', ':'] }, 1] },
                  end: { $arrayElemAt: [{ $split: ['$endTime', ':'] }, 0] },
                  endMin: { $arrayElemAt: [{ $split: ['$endTime', ':'] }, 1] }
                },
                in: {
                  $subtract: [
                    { $add: [{ $multiply: [{ $toDouble: '$$end' }, 60] }, { $toDouble: '$$endMin' }] },
                    { $add: [{ $multiply: [{ $toDouble: '$$start' }, 60] }, { $toDouble: '$$startMin' }] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'marketer'
        }
      },
      {
        $unwind: '$marketer'
      },
      {
        $project: {
          'marketer.name': 1,
          'marketer.email': 1,
          'marketer.phone': 1,
          totalReports: 1,
          totalVisits: 1,
          totalLeads: 1,
          totalSales: 1,
          totalRevenue: 1,
          avgVisitsPerDay: 1,
          avgEfficiency: 1,
          totalDistance: 1,
          totalWorkingHours: 1,
          visitsPerHour: {
            $cond: [
              { $eq: ['$totalWorkingHours', 0] },
              0,
              { $divide: ['$totalVisits', { $divide: ['$totalWorkingHours', 60] }] }
            ]
          },
          revenuePerVisit: {
            $cond: [
              { $eq: ['$totalVisits', 0] },
              0,
              { $divide: ['$totalRevenue', '$totalVisits'] }
            ]
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get pending follow-ups
// @route   GET /api/marketer-reports/follow-ups/pending
// @access  Private
exports.getPendingFollowUps = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchFilter = {
      'customerVisits.nextFollowUpDate': { $gte: today },
      'customerVisits.status': 'follow_up_required'
    };

    // If user is marketer, only show their follow-ups
    //if (req.user.role === 'marketer') {
      //matchFilter.marketer = req.user.id;
    //}

    const followUps = await MarketerReport.aggregate([
      {
        $match: matchFilter
      },
      {
        $unwind: '$customerVisits'
      },
      {
        $match: {
          'customerVisits.nextFollowUpDate': { $gte: today },
          'customerVisits.status': 'follow_up_required'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'marketer',
          foreignField: '_id',
          as: 'marketer'
        }
      },
      {
        $unwind: '$marketer'
      },
      {
        $project: {
          reportDate: '$date',
          reportTitle: '$title',
          'marketer.name': 1,
          'marketer.email': 1,
          customerName: '$customerVisits.customerName',
          location: '$customerVisits.location',
          contactNumber: '$customerVisits.contactNumber',
          visitType: '$customerVisits.visitType',
          feedback: '$customerVisits.feedback',
          nextFollowUpDate: '$customerVisits.nextFollowUpDate',
          productsDiscussed: '$customerVisits.productsDiscussed'
        }
      },
      {
        $sort: { nextFollowUpDate: 1 }
      },
      {
        $limit: 50
      }
    ]);

    res.status(200).json({
      success: true,
      data: followUps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Upload report attachment
// @route   POST /api/marketer-reports/:id/attachments
// @access  Private
exports.uploadAttachment = async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'No image data provided'
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imageData, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      folder: 'marketer-reports'
    });

    res.status(200).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};