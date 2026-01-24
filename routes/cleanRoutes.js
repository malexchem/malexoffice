// routes/cleanRoutes.js
//const express = require("express");
//const { getAllCleanRecords } = require("../controllers/cleanController"); 

//const router = express.Router();

//router.get("/", getAllCleanRecords);

//module.exports = router;


// routes/cleanRoutes.js
const express = require("express");
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

module.exports = router;