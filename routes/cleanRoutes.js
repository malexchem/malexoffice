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
    getTodayCleanRecords 
} = require("../controllers/cleanController");

const router = express.Router();

// GET /api/clean - Get all records with pagination
router.get("/", getAllCleanRecords);

// GET /api/clean/today - Get today's records (NEW)
router.get("/today", getTodayCleanRecords);

// POST /api/clean - Create a new clean record
router.post("/", createCleanRecord);

module.exports = router;