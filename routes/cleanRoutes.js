// routes/cleanRoutes.js
/*const express = require("express");
const { 
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
} = require("../controllers/cleanController");

const router = express.Router();

// GET /api/clean - Get all records with pagination
router.get("/", getAllCleanRecords);

// Time-based filter routes
router.get("/today", getTodayCleanRecords);
router.get("/yesterday", getYesterdayCleanRecords);
router.get("/this-week", getThisWeekCleanRecords);
router.get("/this-month", getThisMonthCleanRecords);
router.get("/this-year", getThisYearCleanRecords);
router.get("/last-7-days", getLast7DaysCleanRecords);
router.get("/last-30-days", getLast30DaysCleanRecords);
router.get("/custom", getCustomDateRangeCleanRecords);

// CRUD operations
router.post("/", createCleanRecord);
router.get("/:id", getCleanRecordById);
router.put("/:id", updateCleanRecord);
router.delete("/:id", deleteCleanRecord);

module.exports = router;*/

const express = require("express");
const { 
    // COUNT FUNCTIONS
    getCleanCount,
    getTodayCleanCount,
    getYesterdayCleanCount,
    getThisWeekCleanCount,
    getThisMonthCleanCount,
    getThisYearCleanCount,
    getLast7DaysCleanCount,
    getLast30DaysCleanCount,
    getCustomDateRangeCleanCount,
    
    // RECORD FUNCTIONS
    getAllCleanRecords,
    getTodayCleanRecords,
    getYesterdayCleanRecords,
    getThisWeekCleanRecords,
    getThisMonthCleanRecords,
    getThisYearCleanRecords,
    getLast7DaysCleanRecords,
    getLast30DaysCleanRecords,
    getCustomDateRangeCleanRecords,
    getCleanRecordById,
    createCleanRecord,
    updateCleanRecord,
    deleteCleanRecord
} = require("../controllers/cleanController");

const router = express.Router();

/* =======================
   COUNT ROUTES (FIRST - for PDF downloader)
======================= */
router.get("/count", getCleanCount);
router.get("/today/count", getTodayCleanCount);
router.get("/yesterday/count", getYesterdayCleanCount);
router.get("/this-week/count", getThisWeekCleanCount);
router.get("/this-month/count", getThisMonthCleanCount);
router.get("/this-year/count", getThisYearCleanCount);
router.get("/last-7-days/count", getLast7DaysCleanCount);
router.get("/last-30-days/count", getLast30DaysCleanCount);
router.get("/custom/count", getCustomDateRangeCleanCount);

/* =======================
   FILTER ROUTES (RECORD DATA)
======================= */
router.get("/", getAllCleanRecords);
router.get("/today", getTodayCleanRecords);
router.get("/yesterday", getYesterdayCleanRecords);
router.get("/this-week", getThisWeekCleanRecords);
router.get("/this-month", getThisMonthCleanRecords);
router.get("/this-year", getThisYearCleanRecords);
router.get("/last-7-days", getLast7DaysCleanRecords);
router.get("/last-30-days", getLast30DaysCleanRecords);
router.get("/custom", getCustomDateRangeCleanRecords);

/* =======================
   CRUD OPERATIONS (LAST)
======================= */
router.post("/", createCleanRecord);
router.get("/:id", getCleanRecordById);
router.put("/:id", updateCleanRecord);
router.delete("/:id", deleteCleanRecord);

module.exports = router;