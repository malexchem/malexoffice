// controllers/recordControllerV2Only.js
const RecordServiceV2Only = require('../services/recordServiceV3only');

exports.createRecord = async (req, res) => {
  try {
    const record = await RecordServiceV2Only.createRecord(req.body);
    
    res.status(201).json({
      success: true,
      message: "Record saved successfully",
      data: record
    });
  } catch (error) {
    console.error("[ERROR] Creating record (V2):", error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      customer,
      search,
      startDate,
      endDate,
      periodStartDate,
      periodEndDate
    } = req.query;
    
    const result = await RecordServiceV2Only.getAllRecords({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      customer,
      search,
      startDate,
      endDate,
      periodStartDate,
      periodEndDate
    });
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error("[ERROR] Fetching records (V2):", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await RecordServiceV2Only.updateRecord(req.params.id, req.body);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
    
    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error("[ERROR] Updating record (V2):", error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await RecordServiceV2Only.deleteRecord(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    console.error("[ERROR] Deleting record (V2):", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await RecordServiceV2Only.getSummary({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("[ERROR] Getting summary (V2):", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};