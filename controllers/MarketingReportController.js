const MarketerReport = require('../models/marketingReport');
const { v4: uuidv4 } = require('uuid');

// Helper function to combine date and time
function combineDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

// Create a new report
exports.createReport = async (req, res) => {
  try {
    const {
      reportTitle,
      date,
      startTime,
      endTime,
      transportMode,
      transportCost,
      totalDistance,
      startingPoint,
      endingPoint,
      salesMade,
      challengesFaced,
      achievements,
      recommendations,
      resourcesNeeded,
      overallFeedback,
      marketerName,
      status
    } = req.body;

    // Combine date with times
    const startDateTime = combineDateTime(date, startTime);
    const endDateTime = combineDateTime(date, endTime);

    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
      });
    }

    const reportId = uuidv4();

    const newReport = new MarketerReport({
      id: reportId,
      reportTitle,
      date: new Date(date),
      startTime: startDateTime,
      endTime: endDateTime,
      transportMode,
      transportCost: parseFloat(transportCost),
      totalDistance: parseFloat(totalDistance),
      startingPoint,
      endingPoint,
      salesMade,
      challengesFaced,
      achievements,
      recommendations,
      resourcesNeeded,
      overallFeedback,
      marketerName: marketerName || req.user?.name || 'Unknown Marketer',
      status: status || 'draft'
    });

    await newReport.save();

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: newReport
    });

  } catch (error) {
    console.error('Error creating report:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all reports with pagination
exports.getAllReports = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    
    // Filter options
    const filter = {};
    if (req.query.marketerName) {
      filter.marketerName = req.query.marketerName;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    const [reports, total] = await Promise.all([
      MarketerReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MarketerReport.countDocuments(filter)
    ]);

    const hasMore = skip + reports.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: reports
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get single report by ID
exports.getReportById = async (req, res) => {
  try {
    const report = await MarketerReport.findOne({ id: req.params.id });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update report
exports.updateReport = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    
    // Handle date/time combination if provided
    if (updates.date && updates.startTime) {
      updates.startTime = combineDateTime(updates.date, updates.startTime);
    }
    if (updates.date && updates.endTime) {
      updates.endTime = combineDateTime(updates.date, updates.endTime);
    }

    const report = await MarketerReport.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });

  } catch (error) {
    console.error('Error updating report:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete report
exports.deleteReport = async (req, res) => {
  try {
    const report = await MarketerReport.findOneAndDelete({ id: req.params.id });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get report summary/statistics
exports.getSummary = async (req, res) => {
  try {
    const reports = await MarketerReport.find();
    
    const summary = {
      totalReports: reports.length,
      byStatus: {},
      byTransportMode: {},
      totalDistance: 0,
      totalTransportCost: 0,
      averageDistance: 0,
      averageTransportCost: 0
    };

    reports.forEach(report => {
      // Count by status
      summary.byStatus[report.status] = (summary.byStatus[report.status] || 0) + 1;
      
      // Count by transport mode
      summary.byTransportMode[report.transportMode] = 
        (summary.byTransportMode[report.transportMode] || 0) + 1;
      
      // Sum totals
      summary.totalDistance += report.totalDistance;
      summary.totalTransportCost += report.transportCost;
    });

    // Calculate averages
    if (reports.length > 0) {
      summary.averageDistance = summary.totalDistance / reports.length;
      summary.averageTransportCost = summary.totalTransportCost / reports.length;
    }

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Sync reports (for offline functionality)
exports.syncReports = async (req, res) => {
  try {
    const { reports } = req.body;
    const results = [];

    for (const report of reports) {
      if (report.id) {
        // Update existing
        const existing = await MarketerReport.findOne({ id: report.id });
        if (existing) {
          const updated = await MarketerReport.findOneAndUpdate(
            { id: report.id },
            { $set: report },
            { new: true }
          );
          results.push(updated);
        } else {
          // Create new
          const newReport = new MarketerReport(report);
          await newReport.save();
          results.push(newReport);
        }
      } else {
        // Create new with generated ID
        const newReport = new MarketerReport({
          ...report,
          id: uuidv4()
        });
        await newReport.save();
        results.push(newReport);
      }
    }

    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: results
    });

  } catch (error) {
    console.error('Error syncing reports:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};