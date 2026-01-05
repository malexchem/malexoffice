/*const Record = require('../models/record');
const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/transaction');

// Helper: convert date + time strings into proper JS Date
function combineDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
}
exports.createRecord = async (req, res) => {
    try {
        const {
            date,
            time,
            customerName,
            invoiceNo,
            cashSaleNo,
            quotationNo,
            facilitator,
            amount,
            createdBy
        } = req.body;

        const combinedDate = combineDateTime(date, time);

        // Create new record
        const newRecord = new Record({
            id: uuidv4(),
            date: combinedDate,
            time: combinedDate,
            customerName,
            invoiceNo,
            cashSaleNo,
            quotationNo,
            facilitator,
            amount,
            createdBy,
            createdAt: new Date()
        });

        await newRecord.save();

        // If it's a cash sale, also create a transaction
        if (cashSaleNo) {
            const transaction = new Transaction({
                type: 'income',
                date: combinedDate,
                description: `Cash sale from ${customerName}`,
                category: 'sales',
                method: 'cash',
                amount: amount,
                reference: cashSaleNo,
                status: 'completed'
            });

            await transaction.save();
        }

        res.status(201).json({
            success: true,
            message: "Record saved successfully",
            data: newRecord
        });

    } catch (error) {
        console.error("[ERROR] Creating record:", error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};


exports.sync = async (req, res, next) => {
  try {
    const { records } = req.body;

    const inv = records.map((r) => r.invoiceNo).filter(Boolean);
    const cash = records.map((r) => r.cashSaleNo).filter(Boolean);
    const quo = records.map((r) => r.quotationNo).filter(Boolean);

    const existing = await Record.find({
      $or: [
        { invoiceNo: { $in: inv } },
        { cashSaleNo: { $in: cash } },
        { quotationNo: { $in: quo } },
      ],
    });

    const existSet = {
      inv: new Set(existing.map((r) => r.invoiceNo)),
      cash: new Set(existing.map((r) => r.cashSaleNo)),
      quo: new Set(existing.map((r) => r.quotationNo)),
    };

    const news = records.filter(
      (r) =>
        !(
          (r.invoiceNo && existSet.inv.has(r.invoiceNo)) ||
          (r.cashSaleNo && existSet.cash.has(r.cashSaleNo)) ||
          (r.quotationNo && existSet.quo.has(r.quotationNo))
        )
    );

    if (news.length) {
      await Record.bulkWrite(
        news.map((n) => ({
          updateOne: { filter: { id: n.id }, update: { $set: n }, upsert: true },
        }))
      );
    }

    res.send(await Record.find());
  } catch (e) { next(e); }
};



exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Record.find()
        .sort({ time: -1 })
        .skip(skip)
        .limit(limit),
      Record.countDocuments()
    ]);

    const hasMore = skip + records.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: records
    });

  } catch (e) {
    next(e);
  }
};


exports.update = async (req, res, next) => {
  try {

    console.log("📥 Incoming UPDATE request...");
    console.log("Params ID:", req.params.id);
    console.log("Body:", req.body);

    const upd = { ...req.body };

    // Validate exactly one document type
    const docTypes = ['invoiceNo', 'cashSaleNo', 'quotationNo'];
    const activeTypes = docTypes.filter(k => upd[k]);

    console.log("Detected document types:", activeTypes);

    if (activeTypes.length !== 1) {
      console.log("❌ Validation failed: Incorrect document type count");
      return res.status(400).send({ error: 'Exactly one document type required' });
    }

    // 🔥 Enforce only ONE type by clearing others
    docTypes.forEach(type => {
      if (!upd[type]) {
        upd[type] = null; // remove all non-selected types
      }
    });

    console.log("✔ Cleaned document types:", {
      invoiceNo: upd.invoiceNo,
      cashSaleNo: upd.cashSaleNo,
      quotationNo: upd.quotationNo
    });

    // Convert date + time → valid Date for Mongoose
    if (upd.date && upd.time) {
      console.log("⏱ Combining date + time:", upd.date, upd.time);
      upd.time = combineDateTime(upd.date, upd.time);
      console.log("⏱ Final combined Date:", upd.time);
    }

    console.log("🔄 Attempting DB update...");

    const record = await Record.findOneAndUpdate(
      { id: req.params.id },
      { $set: upd },
      { new: true, runValidators: true }
    );

    if (!record) {
      console.log("❌ Update failed: Record not found");
      return res.status(404).send({ error: 'Record not found' });
    }

    console.log("✅ Record updated successfully:", record);
    res.send(record);

  } catch (e) {
    console.log("💥 ERROR during update:", e.message || e);
    next(e);
  }
};



exports.remove = async (req, res, next) => {
  try {
    const record = await Record.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).send({ error: 'Record not found' });
    res.send({ message: 'Record deleted successfully' });
  } catch (e) { next(e); }
};
*/


// controllers/record.controller.js
const Record = require('../models/record');
const Sales = require('../models/sales'); // New Sales model
const { DateTime } = require('luxon');
const { v4: uuidv4 } = require('uuid');

// Helper: convert date + time strings into proper JS Date
function combineDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
}

exports.createRecord = async (req, res) => {
    try {
        const {
            date,
            time,
            customerName,
            invoiceNo,
            cashSaleNo,
            quotationNo,
            facilitator,
            amount,
            createdBy
        } = req.body;

        const combinedDate = combineDateTime(date, time);

        // Generate UUID for the record
        const recordId = uuidv4();

        // Create new record
        const newRecord = new Record({
            id: recordId,
            date: combinedDate,
            time: combinedDate,
            customerName,
            invoiceNo,
            cashSaleNo,
            quotationNo,
            facilitator,
            amount,
            createdBy,
            createdAt: new Date()
        });

        await newRecord.save();

        // Always create a sales entry for accounting purposes
        let salesData = {
            // You can add additional sales data here if needed
            // For example, if you have items in the request:
            // items: req.body.items || []
        };

        try {
            const newSale = await Sales.createFromRecord(newRecord, salesData);
            console.log(`[SUCCESS] Sales record created: ${newSale.documentNumber}`);
        } catch (salesError) {
            console.error(`[WARNING] Failed to create sales record: ${salesError.message}`);
            // Don't fail the whole request if sales creation fails
            // The main record is already saved
        }

        res.status(201).json({
            success: true,
            message: "Record saved successfully",
            data: newRecord
        });

    } catch (error) {
        console.error("[ERROR] Creating record:", error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Update the sync function to also sync with sales
exports.sync = async (req, res, next) => {
  try {
    const { records } = req.body;

    const inv = records.map((r) => r.invoiceNo).filter(Boolean);
    const cash = records.map((r) => r.cashSaleNo).filter(Boolean);
    const quo = records.map((r) => r.quotationNo).filter(Boolean);

    const existing = await Record.find({
      $or: [
        { invoiceNo: { $in: inv } },
        { cashSaleNo: { $in: cash } },
        { quotationNo: { $in: quo } },
      ],
    });

    const existSet = {
      inv: new Set(existing.map((r) => r.invoiceNo)),
      cash: new Set(existing.map((r) => r.cashSaleNo)),
      quo: new Set(existing.map((r) => r.quotationNo)),
    };

    const news = records.filter(
      (r) =>
        !(
          (r.invoiceNo && existSet.inv.has(r.invoiceNo)) ||
          (r.cashSaleNo && existSet.cash.has(r.cashSaleNo)) ||
          (r.quotationNo && existSet.quo.has(r.quotationNo))
        )
    );

    if (news.length) {
      const bulkOps = news.map((n) => ({
        updateOne: { filter: { id: n.id }, update: { $set: n }, upsert: true }
      }));
      
      await Record.bulkWrite(bulkOps);
      
      // Also create sales records for new entries
      for (const newRecord of news) {
        try {
          // Find the saved record to get the complete data
          const savedRecord = await Record.findOne({ id: newRecord.id });
          if (savedRecord) {
            await Sales.createFromRecord(savedRecord);
          }
        } catch (salesError) {
          console.error(`[WARNING] Failed to create sales during sync: ${salesError.message}`);
        }
      }
    }

    const allRecords = await Record.find();
    res.send(allRecords);
    
  } catch (e) { 
    next(e); 
  }
};

// Update function to also update sales
exports.update = async (req, res, next) => {
  try {
    console.log("📥 Incoming UPDATE request...");
    console.log("Params ID:", req.params.id);
    console.log("Body:", req.body);

    const upd = { ...req.body };

    // Validate exactly one document type
    const docTypes = ['invoiceNo', 'cashSaleNo', 'quotationNo'];
    const activeTypes = docTypes.filter(k => upd[k]);

    console.log("Detected document types:", activeTypes);

    if (activeTypes.length !== 1) {
      console.log("❌ Validation failed: Incorrect document type count");
      return res.status(400).send({ error: 'Exactly one document type required' });
    }

    // 🔥 Enforce only ONE type by clearing others
    docTypes.forEach(type => {
      if (!upd[type]) {
        upd[type] = null;
      }
    });

    console.log("✔ Cleaned document types:", {
      invoiceNo: upd.invoiceNo,
      cashSaleNo: upd.cashSaleNo,
      quotationNo: upd.quotationNo
    });

    // Convert date + time → valid Date for Mongoose
    if (upd.date && upd.time) {
      console.log("⏱ Combining date + time:", upd.date, upd.time);
      upd.time = combineDateTime(upd.date, upd.time);
      console.log("⏱ Final combined Date:", upd.time);
    }

    console.log("🔄 Attempting DB update...");

    const record = await Record.findOneAndUpdate(
      { id: req.params.id },
      { $set: upd },
      { new: true, runValidators: true }
    );

    if (!record) {
      console.log("❌ Update failed: Record not found");
      return res.status(404).send({ error: 'Record not found' });
    }

    // Also update the corresponding sales record
    try {
      let documentNumber;
      if (record.invoiceNo) documentNumber = record.invoiceNo;
      if (record.cashSaleNo) documentNumber = record.cashSaleNo;
      if (record.quotationNo) documentNumber = record.quotationNo;
      
      if (documentNumber) {
        const salesUpdate = {
          customerName: record.customerName,
          date: record.date,
          amount: record.amount,
          totalAmount: record.amount,
          facilitator: record.facilitator,
          updatedAt: new Date()
        };
        
        await Sales.findOneAndUpdate(
          { documentNumber },
          { $set: salesUpdate },
          { new: true }
        );
        console.log("✅ Sales record also updated");
      }
    } catch (salesError) {
      console.error(`[WARNING] Failed to update sales record: ${salesError.message}`);
    }

    console.log("✅ Record updated successfully:", record);
    res.send(record);

  } catch (e) {
    console.log("💥 ERROR during update:", e.message || e);
    next(e);
  }
};

// Add this method to record.controller.js
exports.getSummary = async (req, res) => {
    try {
        // Fetch all records for summary calculation
        const records = await Record.find();
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        // Initialize totals
        const totals = {
            quotations: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
            cashSales: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
            invoices: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
        };
        
        // Initialize counts
        const counts = {
            quotations: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
            cashSales: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
            invoices: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
        };
        
        records.forEach(record => {
            const recordDate = new Date(record.date || record.time);
            const amount = record.amount || 0;
            
            // Determine record type
            let type = 'other';
            if (record.quotationNo && record.quotationNo.trim() !== '') {
                type = 'quotations';
            } else if (record.cashSaleNo && record.cashSaleNo.trim() !== '') {
                type = 'cashSales';
            } else if (record.invoiceNo && record.invoiceNo.trim() !== '') {
                type = 'invoices';
            }
            
            // Check time periods
            if (recordDate >= today) {
                totals[type].daily += amount;
                counts[type].daily++;
            }
            
            if (recordDate >= startOfWeek) {
                totals[type].weekly += amount;
                counts[type].weekly++;
            }
            
            if (recordDate >= startOfMonth) {
                totals[type].monthly += amount;
                counts[type].monthly++;
            }
            
            if (recordDate >= startOfYear) {
                totals[type].yearly += amount;
                counts[type].yearly++;
            }
        });
        
        res.json({
            success: true,
            data: {
                totals,
                counts,
                updatedAt: new Date()
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
// Remove function to also remove sales
exports.remove = async (req, res, next) => {
  try {
    // Find the record first to get document numbers
    const record = await Record.findOne({ id: req.params.id });
    
    if (!record) {
      return res.status(404).send({ error: 'Record not found' });
    }
    
    // Delete the record
    await Record.findOneAndDelete({ id: req.params.id });
    
    // Also delete the corresponding sales record
    try {
      let documentNumber;
      if (record.invoiceNo) documentNumber = record.invoiceNo;
      if (record.cashSaleNo) documentNumber = record.cashSaleNo;
      if (record.quotationNo) documentNumber = record.quotationNo;
      
      if (documentNumber) {
        await Sales.findOneAndDelete({ documentNumber });
        console.log(`✅ Sales record also deleted: ${documentNumber}`);
      }
    } catch (salesError) {
      console.error(`[WARNING] Failed to delete sales record: ${salesError.message}`);
    }
    
    res.send({ message: 'Record deleted successfully' });
  } catch (e) { 
    next(e); 
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Record.find()
        .sort({ time: -1 })
        .skip(skip)
        .limit(limit),
      Record.countDocuments()
    ]);

    const hasMore = skip + records.length < total;

    res.json({
      success: true,
      page,
      limit,
      total,
      hasMore,
      data: records
    });

  } catch (e) {
    next(e);
  }
};