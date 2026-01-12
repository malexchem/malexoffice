//record service

const Record = require('../models/record');
const RecordV2 = require('../models/recordV2');
const Sales = require('../models/sales');
const { v4: uuidv4 } = require('uuid');

// Migration date - records after this date use RecordV2
const MIGRATION_DATE = new Date('2024-01-01T00:00:00.000Z');

class RecordService {
  /**
   * Determine which collection to use based on date
   */
  static shouldUseV2(dateStr) {
    try {
      const recordDate = new Date(dateStr);
      return recordDate >= MIGRATION_DATE;
    } catch (error) {
      // If date parsing fails, default to V2 for new records
      return true;
    }
  }

  /**
   * Create a new record in appropriate collection
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
      createdBy
    } = recordData;

    // Determine which model to use
    const useV2 = this.shouldUseV2(date);
    
    // Generate ID
    const recordId = uuidv4();
    
    // Determine document type
    let documentType = 'invoice';
    if (cashSaleNo) documentType = 'cashSale';
    if (quotationNo) documentType = 'quotation';

    if (useV2) {
      // Create in RecordV2
      const timestamp = RecordV2.createTimestamp(date, time);
      
      const newRecord = new RecordV2({
        id: recordId,
        date,
        time,
        timestamp,
        customerName,
        invoiceNo,
        cashSaleNo,
        quotationNo,
        documentType,
        facilitator,
        amount,
        createdBy,
        version: 2
      });

      const savedRecord = await newRecord.save();
      
      // Create sales entry
      await this.createSalesEntry(savedRecord);
      
      return this.normalizeRecord(savedRecord);
    } else {
      // Create in Record (legacy)
      const combinedDate = new Date(`${date}T${time}:00`);
      
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

      const savedRecord = await newRecord.save();
      
      // Create sales entry
      await this.createSalesEntry(savedRecord);
      
      return savedRecord;
    }
  }

  /*static async getAllRecords(options = {}) {
    console.log('=== RECORD SERVICE: GET ALL RECORDS START ===');
    console.log('Options:', options);
    
    const {
      page = 1,
      limit = 20    } = options;

    const skip = (page - 1) * limit;
    const limitPerCollection = Math.ceil(limit / 2);

    console.log('Skip:', skip, 'Limit per collection:', limitPerCollection);

    // Build base queries
    const baseQuery = {};
    const v2Query = {};

    // Apply filters...
    // (keep your existing filter logic)

    console.log('Legacy query:', JSON.stringify(baseQuery));
    console.log('V2 query:', JSON.stringify(v2Query));

    // Fetch from both collections in parallel
    const [legacyRecords, v2Records, legacyCount, v2Count] = await Promise.all([
      Record.find(baseQuery)
        .sort({ time: -1 })
        .skip(skip)
        .limit(limitPerCollection),
      RecordV2.find(v2Query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitPerCollection),
      Record.countDocuments(baseQuery),
      RecordV2.countDocuments(v2Query)
    ]);

    console.log('Legacy records found:', legacyRecords.length);
    console.log('V2 records found:', v2Records.length);
    console.log('Legacy count:', legacyCount, 'V2 count:', v2Count);

    // Normalize legacy records to match V2 format
    const normalizedLegacy = legacyRecords.map(record => this.normalizeRecord(record));
    
    // Combine and sort by date (newest first)
    const allRecords = [...normalizedLegacy, ...v2Records];
    allRecords.sort((a, b) => {
      const dateA = a.timestamp || a.time;
      const dateB = b.timestamp || b.time;
      return new Date(dateB) - new Date(dateA);
    });

    // Apply pagination
    const paginatedRecords = allRecords.slice(0, limit);
    const totalRecords = legacyCount + v2Count;
    const hasMore = skip + paginatedRecords.length < totalRecords;

    console.log('Total records:', totalRecords);
    console.log('Paginated records:', paginatedRecords.length);
    console.log('Has more:', hasMore);
    
    if (paginatedRecords.length > 0) {
      console.log('First paginated record:', {
        id: paginatedRecords[0].id,
        customerName: paginatedRecords[0].customerName,
        documentType: paginatedRecords[0].documentType
      });
    }

    console.log('=== RECORD SERVICE: GET ALL RECORDS END ===');

    return {
      records: paginatedRecords,
      total: totalRecords,
      page,
      limit,
      hasMore,
      counts: {
        legacy: legacyCount,
        v2: v2Count
      }
    };
  }*/

    static async getAllRecords(options = {}) {
    console.log('=== RECORD SERVICE: GET ALL RECORDS START ===');
    console.log('Options:', options);
    
    const {
        page = 1,
        limit = 20,
        type,
        customer,
        search,
        startDate,
        endDate
    } = options;

    const skip = (page - 1) * limit;
    
    // Don't split limit - fetch all needed from each collection
    const limitPerCollection = limit;

    console.log('Service Options:', { page, limit, skip, type, customer, search, startDate, endDate });

    // Build queries for both collections
    const baseQuery = {};
    const v2Query = {};

    // Apply document type filter - IMPORTANT FIX
    if (type) {
        // For RecordV2
        v2Query.documentType = type;
        
        // For legacy Record
        if (type === 'invoice') {
            baseQuery.invoiceNo = { $exists: true, $ne: null, $ne: '' };
        } else if (type === 'cashSale') {
            baseQuery.cashSaleNo = { $exists: true, $ne: null, $ne: '' };
        } else if (type === 'quotation') {
            baseQuery.quotationNo = { $exists: true, $ne: null, $ne: '' };
        }
    }

    // Apply customer filter
    if (customer && customer.trim()) {
        const customerRegex = new RegExp(customer.trim(), 'i');
        baseQuery.customerName = customerRegex;
        v2Query.customerName = customerRegex;
    }

    // Apply date range filter
    if (startDate || endDate) {
        console.log('Applying date range:', { startDate, endDate });
        
        // For legacy records (using time field)
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                dateFilter.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
            if (Object.keys(dateFilter).length > 0) {
                baseQuery.time = dateFilter;
            }
        }
        
        // For V2 records (using timestamp field)
        if (startDate || endDate) {
            const timestampFilter = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                timestampFilter.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                timestampFilter.$lte = end;
            }
            if (Object.keys(timestampFilter).length > 0) {
                v2Query.timestamp = timestampFilter;
            }
        }
    }

    // Apply search filter
    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        const searchCondition = {
            $or: [
                { customerName: searchRegex },
                { invoiceNo: searchRegex },
                { cashSaleNo: searchRegex },
                { quotationNo: searchRegex },
                { facilitator: searchRegex },
                { createdBy: searchRegex }
            ]
        };
        
        Object.assign(baseQuery, searchCondition);
        Object.assign(v2Query, searchCondition);
    }

    console.log('Legacy query:', JSON.stringify(baseQuery, null, 2));
    console.log('V2 query:', JSON.stringify(v2Query, null, 2));

    try {
        // Fetch from both collections in parallel
        const [legacyRecords, v2Records, legacyCount, v2Count] = await Promise.all([
            Record.find(baseQuery)
                .sort({ time: -1 })
                .skip(skip)
                .limit(limitPerCollection)
                .lean(),
            RecordV2.find(v2Query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitPerCollection)
                .lean(),
            Record.countDocuments(baseQuery),
            RecordV2.countDocuments(v2Query)
        ]);

        console.log(`Found ${legacyRecords.length} legacy records and ${v2Records.length} V2 records`);
        console.log(`Counts: legacy=${legacyCount}, v2=${v2Count}`);

        // Normalize legacy records
        const normalizedLegacy = legacyRecords.map(record => {
            const normalized = this.normalizeRecord(record);
            
            // Ensure documentType is correctly set for filtering
            if (type) {
                if (type === 'invoice' && (!normalized.invoiceNo || normalized.invoiceNo.trim() === '')) {
                    return null; // Filter out if type doesn't match
                }
                if (type === 'cashSale' && (!normalized.cashSaleNo || normalized.cashSaleNo.trim() === '')) {
                    return null;
                }
                if (type === 'quotation' && (!normalized.quotationNo || normalized.quotationNo.trim() === '')) {
                    return null;
                }
            }
            return normalized;
        }).filter(record => record !== null);

        // Combine and sort
        const allRecords = [...normalizedLegacy, ...v2Records];
        allRecords.sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp) : (a.time ? new Date(a.time) : new Date(0));
            const dateB = b.timestamp ? new Date(b.timestamp) : (b.time ? new Date(b.time) : new Date(0));
            return dateB - dateA; // Newest first
        });

        // Apply pagination
        const paginatedRecords = allRecords.slice(0, limit);
        const totalRecords = Math.min(legacyCount + v2Count, 10000); // Cap for performance
        const hasMore = skip + paginatedRecords.length < totalRecords;

        console.log(`Returning ${paginatedRecords.length} records, total=${totalRecords}, hasMore=${hasMore}`);

        return {
            records: paginatedRecords,
            total: totalRecords,
            page,
            limit,
            hasMore,
            counts: {
                legacy: legacyCount,
                v2: v2Count
            }
        };

    } catch (error) {
        console.error('Error in getAllRecords:', error);
        throw error;
    }
}

/*static normalizeRecord(record) {
  if (record.version === 2) return record.toObject();
  
  const recordObj = record.toObject ? record.toObject() : record;
  
  // Safely parse date
  let date;
  try {
    // Try to parse from time or date field
    const dateValue = recordObj.time || recordObj.date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date found for record ${recordObj.id}: ${dateValue}`);
        // Fallback to current date
        date = new Date();
      }
    } else {
      // No valid date found, use current date
      date = new Date();
    }
  } catch (error) {
    console.warn(`Error parsing date for record ${recordObj.id}:`, error);
    date = new Date();
  }
  
  // Extract date and time components
  let dateStr, timeStr;
  try {
    dateStr = date.toISOString().split('T')[0];
    timeStr = date.toTimeString().slice(0, 5);
  } catch (error) {
    // Fallback to current date/time
    const now = new Date();
    dateStr = now.toISOString().split('T')[0];
    timeStr = now.toTimeString().slice(0, 5);
  }
  
  // Determine document type
  let documentType = 'invoice';
  if (recordObj.cashSaleNo && recordObj.cashSaleNo.trim()) documentType = 'cashSale';
  if (recordObj.quotationNo && recordObj.quotationNo.trim()) documentType = 'quotation';
  
  return {
    ...recordObj,
    date: dateStr,
    time: timeStr,
    timestamp: date,
    documentType,
    version: 1
  };
}*/

static normalizeRecord(record) {
    const recordObj = record.toObject ? record.toObject() : { ...record };
    
    // Safely parse date
    let date;
    try {
        const dateValue = recordObj.timestamp || recordObj.time || recordObj.date;
        if (dateValue instanceof Date) {
            date = dateValue;
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                date = new Date();
            }
        } else {
            date = new Date();
        }
    } catch (error) {
        date = new Date();
    }
    
    // Extract date and time components
    let dateStr, timeStr;
    try {
        dateStr = date.toISOString().split('T')[0];
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        timeStr = `${hours}:${minutes}`;
    } catch (error) {
        const now = new Date();
        dateStr = now.toISOString().split('T')[0];
        timeStr = now.toTimeString().slice(0, 5);
    }
    
    // Determine document type - FIXED LOGIC
    let documentType = 'invoice';
    if (recordObj.quotationNo && recordObj.quotationNo.toString().trim()) {
        documentType = 'quotation';
    } else if (recordObj.cashSaleNo && recordObj.cashSaleNo.toString().trim()) {
        documentType = 'cashSale';
    } else if (recordObj.documentType) {
        documentType = recordObj.documentType;
    }
    
    // Return normalized record
    return {
        ...recordObj,
        date: dateStr,
        time: timeStr,
        timestamp: date,
        documentType,
        version: recordObj.version || 1
    };
}

  /**
   * Get record by ID from either collection
   */
  static async getRecordById(id) {
    // Try V2 first
    let record = await RecordV2.findOne({ id });
    
    if (!record) {
      // Try legacy
      record = await Record.findOne({ id });
      if (record) {
        record = this.normalizeRecord(record);
      }
    }
    
    return record;
  }

  /**
   * Update record in appropriate collection
   */
  static async updateRecord(id, updateData) {
    // Check which collection has the record
    const v2Record = await RecordV2.findOne({ id });
    
    if (v2Record) {
      // Update V2 record
      if (updateData.date || updateData.time) {
        const date = updateData.date || v2Record.date;
        const time = updateData.time || v2Record.time;
        updateData.timestamp = RecordV2.createTimestamp(date, time);
      }
      
      // Update document type if needed
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
      
      // Update sales
      await this.updateSalesEntry(updated);
      
      return this.normalizeRecord(updated);
    } else {
      // Update legacy record
      const updated = await Record.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      if (updated) {
        // Update sales
        await this.updateSalesEntry(updated);
        
        return updated;
      }
    }
    
    return null;
  }

  /**
   * Delete record from appropriate collection
   */
  static async deleteRecord(id) {
    // Try V2 first
    let deleted = await RecordV2.findOneAndDelete({ id });
    
    if (!deleted) {
      // Try legacy
      deleted = await Record.findOneAndDelete({ id });
    }
    
    if (deleted) {
      // Delete sales entry
      await this.deleteSalesEntry(deleted);
    }
    
    return deleted;
  }

  /**
   * Create sales entry for a record
   */
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

  /**
   * Update sales entry
   */
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

  /**
   * Delete sales entry
   */
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

static async getSummary() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  
  // Fetch all records for summary
  const [legacyRecords, v2Records] = await Promise.all([
    Record.find({}),
    RecordV2.find({})
  ]);
  
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
  
  // Helper function to safely parse date
  const safeParseDate = (record) => {
    try {
      const dateValue = record.timestamp || record.time || record.date;
      if (!dateValue) return null;
      
      if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? null : dateValue;
      }
      
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  };
  
  // Process legacy records
  legacyRecords.forEach(record => {
    try {
      const recordDate = safeParseDate(record);
      if (!recordDate) return; // Skip invalid dates
      
      const amount = record.amount || 0;
      
      // Determine record type
      let type = 'invoices';
      if (record.quotationNo && record.quotationNo.trim()) {
        type = 'quotations';
      } else if (record.cashSaleNo && record.cashSaleNo.trim()) {
        type = 'cashSales';
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
    } catch (error) {
      console.warn(`Error processing legacy record ${record.id}:`, error);
    }
  });
  
  // Process V2 records
  v2Records.forEach(record => {
    try {
      const recordDate = safeParseDate(record);
      if (!recordDate) return; // Skip invalid dates
      
      const amount = record.amount || 0;
      
      // Determine record type
      let type = 'invoices';
      if (record.documentType === 'quotation') {
        type = 'quotations';
      } else if (record.documentType === 'cashSale') {
        type = 'cashSales';
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
    } catch (error) {
      console.warn(`Error processing V2 record ${record.id}:`, error);
    }
  });
  
  return {
    totals,
    counts,
    totalRecords: legacyRecords.length + v2Records.length,
    updatedAt: new Date()
  };
}

  /**
   * Migrate old records to V2 (optional, can run as background job)
   */
  static async migrateRecords(recordIds = []) {
    try {
      const query = recordIds.length > 0 ? { id: { $in: recordIds } } : {};
      const legacyRecords = await Record.find(query);
      
      const migrationResults = [];
      
      for (const legacyRecord of legacyRecords) {
        try {
          // Check if already migrated
          const exists = await RecordV2.findOne({ originalRecordId: legacyRecord.id });
          if (exists) {
            migrationResults.push({
              id: legacyRecord.id,
              status: 'already_migrated',
              message: 'Record already migrated'
            });
            continue;
          }
          
          // Normalize and migrate
          const v2Data = this.normalizeRecord(legacyRecord);
          v2Data.originalRecordId = legacyRecord.id;
          
          const v2Record = new RecordV2(v2Data);
          await v2Record.save();
          
          migrationResults.push({
            id: legacyRecord.id,
            status: 'success',
            v2Id: v2Record.id
          });
          
        } catch (migrationError) {
          migrationResults.push({
            id: legacyRecord.id,
            status: 'error',
            error: migrationError.message
          });
        }
      }
      
      return migrationResults;
      
    } catch (error) {
      console.error('[ERROR] Migration failed:', error);
      throw error;
    }
  }
}

module.exports = RecordService;