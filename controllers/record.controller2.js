const RecordService = require('../services/recordService2');

// All controller methods now use the unified service
exports.createRecord = async (req, res) => {
  try {
    const record = await RecordService.createRecord(req.body);
    
    res.status(201).json({
      success: true,
      message: "Record saved successfully",
      data: record
    });
  } catch (error) {
    console.error("[ERROR] Creating record:", error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
// All controller methods now use the unified service
exports.getAll = async (req, res) => {
  try {
    console.log('=== GET ALL RECORDS START ===');
    console.log('Query params:', req.query);
    
    const {
      page = 1,
      limit = 20,
      type,
      customer,
      date,
      search,
      startDate,
      endDate
    } = req.query;
    
    console.log('Parsed params:', {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      customer,
      date,
      search,
      startDate,
      endDate
    });
    
    const result = await RecordService.getAllRecords({
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      customer,
      date,
      search,
      startDate,
      endDate
    });
    
    console.log('Service result:', {
      recordsCount: result.records ? result.records.length : 0,
      total: result.total,
      page: result.page,
      hasMore: result.hasMore
    });
    
    if (result.records && result.records.length > 0) {
      console.log('First record from service:', {
        id: result.records[0].id,
        customerName: result.records[0].customerName,
        documentType: result.records[0].documentType
      });
    }
    
    res.json({
      success: true,
      ...result
    });
    
    console.log('=== GET ALL RECORDS END ===');
    
  } catch (error) {
    console.error("[ERROR] Fetching records:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await RecordService.updateRecord(req.params.id, req.body);
    
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
    console.error("[ERROR] Updating record:", error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await RecordService.deleteRecord(req.params.id);
    
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
    console.error("[ERROR] Deleting record:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const summary = await RecordService.getSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("[ERROR] Getting summary:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Keep sync endpoint for backward compatibility
exports.sync = async (req, res) => {
  try {
    const { records } = req.body;
    
    const syncResults = [];
    
    for (const recordData of records) {
      try {
        // Use update with upsert logic
        if (recordData.id) {
          const existing = await RecordService.getRecordById(recordData.id);
          if (existing) {
            // Update existing
            const updated = await RecordService.updateRecord(recordData.id, recordData);
            syncResults.push({
              id: recordData.id,
              status: 'updated',
              data: updated
            });
          } else {
            // Create new
            const created = await RecordService.createRecord(recordData);
            syncResults.push({
              id: recordData.id,
              status: 'created',
              data: created
            });
          }
        } else {
          // Create new without ID
          const created = await RecordService.createRecord(recordData);
          syncResults.push({
            id: created.id,
            status: 'created',
            data: created
          });
        }
      } catch (recordError) {
        syncResults.push({
          id: recordData.id || 'unknown',
          status: 'error',
          error: recordError.message
        });
      }
    }
    
    // Return all records for backward compatibility
    const allRecords = await RecordService.getAllRecords({ limit: 1000 });
    
    res.json({
      success: true,
      syncResults,
      data: allRecords.records
    });
  } catch (error) {
    console.error("[ERROR] Syncing records:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Optional: Migration endpoint
exports.migrate = async (req, res) => {
  try {
    const { recordIds, dryRun = false } = req.body;
    
    if (dryRun) {
      // Just analyze what would be migrated
      const analysis = await RecordService.analyzeMigration(recordIds);
      return res.json({
        success: true,
        dryRun: true,
        analysis
      });
    }
    
    const results = await RecordService.migrateRecords(recordIds);
    
    res.json({
      success: true,
      migrated: results.filter(r => r.status === 'success').length,
      total: results.length,
      results
    });
  } catch (error) {
    console.error("[ERROR] Migrating records:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};