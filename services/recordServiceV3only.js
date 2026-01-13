// services/recordServiceV3Only.js
const RecordV2 = require('../models/recordV2');
const Sales = require('../models/sales');
const { v4: uuidv4 } = require('uuid');

class RecordServiceV2Only {

    // In your recordServiceV3Only.js, update the buildQuery method:
/*static buildQuery(options = {}) {
    const {
      type,
      customer,
      search,
      startDate,
      endDate,
      periodStartDate,
      periodEndDate
    } = options;
    
    const query = {};
    
    // Handle date filtering properly
    let dateFilter = {};
    
    // Period-based filtering (today, yesterday, etc.)
    if (periodStartDate && periodEndDate) {
      dateFilter.$gte = new Date(periodStartDate);
      dateFilter.$lt = new Date(periodEndDate); // Use $lt instead of $lte
    }
    // Custom date range filtering
    else if (startDate && endDate) {
      dateFilter.$gte = new Date(startDate);
      dateFilter.$lt = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000); // Add 1 day
    }
    // Default to current year
    else {
      const currentYear = new Date().getFullYear();
      dateFilter.$gte = new Date(currentYear, 0, 1);
      dateFilter.$lt = new Date(currentYear + 1, 0, 1);
    }
    
    if (Object.keys(dateFilter).length > 0) {
      query.timestamp = dateFilter;
    }
    
    // Apply document type filter
    if (type) {
      query.documentType = type;
    }
    
    // Apply customer filter
    if (customer && customer.trim()) {
      query.customerName = new RegExp(customer.trim(), 'i');
    }
    
    // Apply search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { customerName: searchRegex },
        { invoiceNo: searchRegex },
        { cashSaleNo: searchRegex },
        { quotationNo: searchRegex },
        { facilitator: searchRegex },
        { createdBy: searchRegex }
      ];
    }
    
    return query;
  }*/

    static buildQuery(options = {}) {
    const {
        type,
        customer,
        search,
        startDate,
        endDate,
        periodStartDate,
        periodEndDate
    } = options;
    
    const query = {};
    
    // Handle date filtering using the STRING date field
    if (periodStartDate && periodEndDate) {
        // Query using string comparison for date field
        query.date = {
            $gte: periodStartDate,
            $lte: periodEndDate
        };
    }
    // Custom date range filtering
    else if (startDate && endDate) {
        query.date = {
            $gte: startDate,
            $lte: endDate
        };
    }
    // Default to current year
    else {
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;
        
        query.date = {
            $gte: yearStart,
            $lte: yearEnd
        };
    }
    
    // Apply document type filter
    if (type) {
        query.documentType = type;
    }
    
    // Apply customer filter
    if (customer && customer.trim()) {
        query.customerName = new RegExp(customer.trim(), 'i');
    }
    
    // Apply search filter
    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
            { customerName: searchRegex },
            { invoiceNo: searchRegex },
            { cashSaleNo: searchRegex },
            { quotationNo: searchRegex },
            { facilitator: searchRegex },
            { createdBy: searchRegex }
        ];
    }
    
    return query;
}
  
  /**
   * Get all records (V2 only)
   */
  static async getAllRecords(options = {}) {
    const {
      page = 1,
      limit = 20,
      ...filters
    } = options;
    
    const skip = (page - 1) * limit;
    const query = this.buildQuery(filters);
    
    try {
      // Query only RecordV2
      const [records, total] = await Promise.all([
        RecordV2.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        RecordV2.countDocuments(query)
      ]);
      
      // Normalize records
      const normalizedRecords = records.map(record => this.normalizeRecord(record));
      
      return {
        records: normalizedRecords,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: skip + normalizedRecords.length < total
      };
      
    } catch (error) {
      console.error('Error in getAllRecords (V2 only):', error);
      throw error;
    }
  }
  
  /**
   * Normalize RecordV2 record
   */
  static normalizeRecord(record) {
    const recordObj = record.toObject ? record.toObject() : { ...record };
    
    // Ensure date and time are properly formatted
    const dateValue = recordObj.timestamp || recordObj.date;
    const date = dateValue ? new Date(dateValue) : new Date();
    
    return {
      ...recordObj,
      date: date.toISOString().split('T')[0],
      time: recordObj.time || date.toTimeString().slice(0, 5),
      timestamp: date,
      documentType: recordObj.documentType || 'invoice',
      documentNumber: recordObj.invoiceNo || recordObj.cashSaleNo || recordObj.quotationNo || '',
      version: 2
    };
  }
  
  /**
   * Create a new record (V2 only)
   */
  /*static async createRecord(recordData) {
    const {
      date,
      time,
      customerName,
      invoiceNo,
      cashSaleNo,
      quotationNo,
      facilitator,
      amount,
      createdBy,
      documentType
    } = recordData;
    
    // Generate ID
    const recordId = uuidv4();
    
    // Determine document type
    let docType = documentType || 'invoice';
    if (quotationNo) docType = 'quotation';
    if (cashSaleNo) docType = 'cashSale';
    if (invoiceNo) docType = 'invoice';
    
    // Create timestamp
    const timestamp = new Date(`${date}T${time}:00`);
    
    // Ensure it's from current year (optional validation)
    const currentYear = new Date().getFullYear();
    if (timestamp.getFullYear() < currentYear) {
      throw new Error('Only records from current year and onwards are allowed');
    }
    
    const newRecord = new RecordV2({
      id: recordId,
      date,
      time,
      timestamp,
      customerName,
      invoiceNo,
      cashSaleNo,
      quotationNo,
      documentType: docType,
      facilitator,
      amount: parseFloat(amount) || 0,
      createdBy,
      version: 2
    });
    
    const savedRecord = await newRecord.save();
    
    // Create sales entry
    await this.createSalesEntry(savedRecord);
    
    return this.normalizeRecord(savedRecord);
  }*/

    /**
 * Create a new record (V2 only)
 * Ensures document numbers are unique
 */
static async createRecord(recordData) {
  const {
    date,
    time,
    customerName,
    invoiceNo,
    cashSaleNo,
    quotationNo,
    facilitator,
    amount,
    createdBy,
    documentType
  } = recordData;

  // Determine document type dynamically
  let docType = documentType || 'invoice';
  if (quotationNo) docType = 'quotation';
  if (cashSaleNo) docType = 'cashSale';
  if (invoiceNo) docType = 'invoice';

  // Determine document number
  const docNumber = invoiceNo || cashSaleNo || quotationNo;
  if (!docNumber) {
    throw new Error('A document number (invoice, cash sale, or quotation) is required');
  }

  // Check if a record with this document number already exists
  const existingRecord = await RecordV2.findOne({
    $or: [
      { invoiceNo: invoiceNo || null },
      { cashSaleNo: cashSaleNo || null },
      { quotationNo: quotationNo || null }
    ]
  });

  if (existingRecord) {
    // Return existing record if it already exists
    return this.normalizeRecord(existingRecord);
  }

  // Generate ID
  const recordId = uuidv4();

  // Create timestamp
  const timestamp = new Date(`${date}T${time}:00`);

  // Optional: ensure it's from current year
  const currentYear = new Date().getFullYear();
  if (timestamp.getFullYear() < currentYear) {
    throw new Error('Only records from current year and onwards are allowed');
  }

  // Create new record
  const newRecord = new RecordV2({
    id: recordId,
    date,
    time,
    timestamp,
    customerName,
    invoiceNo,
    cashSaleNo,
    quotationNo,
    documentType: docType,
    facilitator,
    amount: parseFloat(amount) || 0,
    createdBy,
    version: 2
  });

  const savedRecord = await newRecord.save();

  // Create sales entry
  await this.createSalesEntry(savedRecord);

  return this.normalizeRecord(savedRecord);
}

  
  /**
   * Get summary statistics (V2 only, current year)
   */
  static async getSummary(options = {}) {
    try {
      // Build query with date range if provided
      const query = this.buildQuery(options);
      
      // Get all records matching query
      const allRecords = await RecordV2.find(query).lean();
      
      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      const stats = {
        invoice: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
        cashSale: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
        quotation: { daily: 0, weekly: 0, monthly: 0, yearly: 0 }
      };
      
      allRecords.forEach(record => {
        const recordDate = new Date(record.timestamp || record.date);
        const dateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
        const amount = record.amount || 0;
        
        const type = record.documentType || 'invoice';
        const typeKey = type === 'quotation' ? 'quotation' : 
                       type === 'cashSale' ? 'cashSale' : 'invoice';
        
        if (dateOnly.getTime() === today.getTime()) {
          stats[typeKey].daily += amount;
        }
        if (dateOnly >= startOfWeek) {
          stats[typeKey].weekly += amount;
        }
        if (dateOnly >= startOfMonth) {
          stats[typeKey].monthly += amount;
        }
        if (dateOnly >= startOfYear) {
          stats[typeKey].yearly += amount;
        }
      });
      
      // Count records
      const counts = {
        invoices: allRecords.filter(r => 
          (r.documentType === 'invoice') || 
          (!r.documentType && r.invoiceNo)
        ).length,
        cashSales: allRecords.filter(r => 
          r.documentType === 'cashSale' || r.cashSaleNo
        ).length,
        quotations: allRecords.filter(r => 
          r.documentType === 'quotation' || r.quotationNo
        ).length
      };
      
      return {
        totals: {
          invoices: stats.invoice,
          cashSales: stats.cashSale,
          quotations: stats.quotation
        },
        counts,
        totalRecords: allRecords.length,
        updatedAt: new Date()
      };
      
    } catch (error) {
      console.error('Error in getSummary (V2 only):', error);
      throw error;
    }
  }
  
  // Update, Delete, and Sales methods (adapted for V2 only)
  static async getRecordById(id) {
    const record = await RecordV2.findOne({ id });
    return record ? this.normalizeRecord(record) : null;
  }
  
  static async updateRecord(id, updateData) {
    const record = await RecordV2.findOne({ id });
    if (!record) return null;
    
    // Update timestamp if date/time changed
    if (updateData.date || updateData.time) {
      const date = updateData.date || record.date;
      const time = updateData.time || record.time;
      updateData.timestamp = new Date(`${date}T${time}:00`);
    }
    
    // Update document type
    if (updateData.invoiceNo || updateData.cashSaleNo || updateData.quotationNo) {
      if (updateData.invoiceNo) updateData.documentType = 'invoice';
      if (updateData.cashSaleNo) updateData.documentType = 'cashSale';
      if (updateData.quotationNo) updateData.documentType = 'quotation';
    }
    
    updateData.updatedAt = new Date();
    
    const updated = await RecordV2.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (updated) {
      await this.updateSalesEntry(updated);
      return this.normalizeRecord(updated);
    }
    
    return null;
  }
  
  static async deleteRecord(id) {
    const deleted = await RecordV2.findOneAndDelete({ id });
    if (deleted) {
      await this.deleteSalesEntry(deleted);
    }
    return deleted;
  }
  
  static async createSalesEntry(record) {
    try {
      const documentNumber = record.invoiceNo || record.cashSaleNo || record.quotationNo;
      if (documentNumber) {
        const salesData = {
          documentNumber,
          customerName: record.customerName,
          date: record.timestamp || record.time,
          amount: record.amount,
          totalAmount: record.amount,
          facilitator: record.facilitator,
          recordId: record.id,
          documentType: record.documentType || 
            (record.invoiceNo ? 'invoice' : 
             record.cashSaleNo ? 'cashSale' : 'quotation')
        };
        
        const newSale = new Sales(salesData);
        await newSale.save();
      }
    } catch (error) {
      console.error(`[WARNING] Failed to create sales record: ${error.message}`);
    }
  }
  
  static async updateSalesEntry(record) {
    try {
      const documentNumber = record.invoiceNo || record.cashSaleNo || record.quotationNo;
      if (documentNumber) {
        const salesUpdate = {
          customerName: record.customerName,
          date: record.timestamp || record.time,
          amount: record.amount,
          totalAmount: record.amount,
          facilitator: record.facilitator,
          updatedAt: new Date()
        };
        
        await Sales.findOneAndUpdate(
          { documentNumber },
          { $set: salesUpdate }
        );
      }
    } catch (error) {
      console.error(`[WARNING] Failed to update sales record: ${error.message}`);
    }
  }
  
  static async deleteSalesEntry(record) {
    try {
      const documentNumber = record.invoiceNo || record.cashSaleNo || record.quotationNo;
      if (documentNumber) {
        await Sales.findOneAndDelete({ documentNumber });
      }
    } catch (error) {
      console.error(`[WARNING] Failed to delete sales record: ${error.message}`);
    }
  }
}

module.exports = RecordServiceV2Only;