// routes/cleanRoutes.js
/*const express = require("express");
const { 
    getAllCleanRecords,
    createCleanRecord,
    getTodayCleanRecords ,
    getCleanRecordById,
    updateCleanRecord,
    deleteCleanRecord
} = require("../controllers/cleanController");

const router = express.Router();

// GET /api/clean - Get all records with pagination
router.get("/", getAllCleanRecords);

// GET /api/clean/today - Get today's records (NEW)
router.get("/today", getTodayCleanRecords);

// POST /api/clean - Create a new clean record
router.post("/", createCleanRecord);

// GET /api/clean/:id - Get single record
router.get("/:id", getCleanRecordById);

// POST /api/clean - Create a new clean record
router.post("/", createCleanRecord);

// PUT /api/clean/:id - Update a clean record
router.put("/:id", updateCleanRecord);

// DELETE /api/clean/:id - Delete a clean record
router.delete("/:id", deleteCleanRecord);

module.exports = router;*/

// routes/cleanRoutes.js
const express = require("express");
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

module.exports = router;