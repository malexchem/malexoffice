const TimeRecord = require('../models/timeRecord');
const User = require('../models/user');
const cloudinary = require('../config/cloudinary');

// Expected schedule configuration
const EXPECTED_SCHEDULE = {
  'check-in': '07:30',
  'lunch-out': '13:00',
  'lunch-in': '14:00',
  'check-out': '18:00'
};

// Helper function to calculate status
function calculateStatus(sessionType, actualTime) {
  const expectedTime = EXPECTED_SCHEDULE[sessionType];
  const [actualHours, actualMinutes] = actualTime.split(':').map(Number);
  const [expectedHours, expectedMinutes] = expectedTime.split(':').map(Number);
  
  const actualTotalMinutes = actualHours * 60 + actualMinutes;
  const expectedTotalMinutes = expectedHours * 60 + expectedMinutes;
  
  const difference = actualTotalMinutes - expectedTotalMinutes;
  
  if (sessionType === 'check-out') {
    if (difference > 0) return 'overtime';
    if (difference < -15) return 'early';
  }
  
  if (difference <= 0) return 'on-time';
  if (difference > 0 && difference <= 15) return 'on-time'; // 15-minute grace period
  return 'late';
}

// Upload image to Cloudinary
async function uploadImage(imageData) {
  try {
    const result = await cloudinary.uploader.upload(imageData, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      folder: 'time-management'
    });
    return result.secure_url;
  } catch (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
}

// Create time record
exports.createTimeRecord = async (req, res, next) => {
  try {
    const { employeeId, sessionType, actualTime, notes, imageData } = req.body;
    
    console.log(`[INFO] Creating time record for employee: ${employeeId}, session: ${sessionType}`);
    
    // Validate employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      console.warn(`[WARN] Employee not found: ${employeeId}`);
      return res.status(404).send({ error: 'Employee not found' });
    }
    
    // Upload image to Cloudinary
    let imageUrl;
    if (imageData) {
      imageUrl = await uploadImage(imageData);
    }
    
    // Calculate status
    const status = calculateStatus(sessionType, actualTime);
    
    // Create time record
    const timeRecord = await TimeRecord.create({
      employee: employeeId,
      sessionType,
      recordedTime: new Date().toTimeString().slice(0, 5), // Current time in HH:MM
      actualTime,
      status,
      imageUrl,
      notes,
      department: employee.department || 'General'
    });
    
    console.log(`[SUCCESS] Time record created: ID=${timeRecord._id}, Employee=${employee.name}, Session=${sessionType}`);
    res.status(201).send({ timeRecord });
    
  } catch (error) {
    console.error(`[ERROR] Failed to create time record: ${error.message}`);
    next(error);
  }
};

// Get all time records with filtering
exports.getAllTimeRecords = async (req, res, next) => {
  try {
    const { date, department, employeeId, sessionType } = req.query;
    
    let filter = {};
    
    // Date filtering
    if (date) {
      if (date === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter.date = { $gte: today };
      } else if (date === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filter.date = { $gte: yesterday, $lt: today };
      }
      // Add more date filters as needed
    }
    
    // Department filtering
    if (department && department !== 'all') {
      filter.department = department;
    }
    
    // Employee filtering
    if (employeeId) {
      filter.employee = employeeId;
    }
    
    // Session type filtering
    if (sessionType) {
      filter.sessionType = sessionType;
    }
    
    const timeRecords = await TimeRecord.find(filter)
      .populate('employee', 'name email role department')
      .sort({ date: -1, recordedTime: -1 });
    
    console.log(`[INFO] Retrieved ${timeRecords.length} time records`);
    res.send({ timeRecords });
    
  } catch (error) {
    console.error(`[ERROR] Failed to retrieve time records: ${error.message}`);
    next(error);
  }
};

// Get time records summary for dashboard
exports.getTimeSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's records
    const todayRecords = await TimeRecord.find({
      date: { $gte: today }
    }).populate('employee', 'name department');
    
    // Calculate statistics
    const stats = {
      onTime: 0,
      late: 0,
      overtime: 0,
      early: 0,
      absent: 0
    };
    
    // Get unique employees who checked in today
    const employeesWithCheckIn = new Set();
    todayRecords.forEach(record => {
      if (record.sessionType === 'check-in') {
        employeesWithCheckIn.add(record.employee._id.toString());
        
        // Count status for check-ins
        if (record.status === 'on-time') stats.onTime++;
        else if (record.status === 'late') stats.late++;
      }
      
      // Count overtime and early departures from check-outs
      if (record.sessionType === 'check-out') {
        if (record.status === 'overtime') stats.overtime++;
        else if (record.status === 'early') stats.early++;
      }
    });
    
    // Get total employees
    const totalEmployees = await User.countDocuments();
    stats.absent = totalEmployees - employeesWithCheckIn.size;
    
    console.log(`[INFO] Generated time summary: OnTime=${stats.onTime}, Late=${stats.late}, Overtime=${stats.overtime}, Early=${stats.early}, Absent=${stats.absent}`);
    res.send({ stats });
    
  } catch (error) {
    console.error(`[ERROR] Failed to generate time summary: ${error.message}`);
    next(error);
  }
};

exports.getWeeklyTrend = async (req, res, next) => {
  try {
    // 1. Get start of THIS week (Monday 00:00)
    const startOfWeek = new Date();
    const dayOfWeek = startOfWeek.getDay();          // 0 = Sun … 6 = Sat
    const diffToMonday = (dayOfWeek + 6) % 7;        // how many days back to Monday
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyData = [];

    // 2. Loop 7 days (Mon-Sun) – change to 5 if you want Mon-Fri only
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);

      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayRecords = await TimeRecord.find({
        date: { $gte: day, $lt: nextDay },
        sessionType: 'check-in'
      });

      const totalEmployees = await User.countDocuments();
      const attendanceRate = totalEmployees ? (dayRecords.length / totalEmployees) * 100 : 0;

      weeklyData.push({
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        rate: Math.round(attendanceRate)
      });
    }

    res.send({ weeklyTrend: weeklyData });
  } catch (error) {
    console.error(`[ERROR] Failed to generate weekly trend: ${error.message}`);
    next(error);
  }
};

// Get department punctuality
exports.getDepartmentPunctuality = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const departmentStats = await TimeRecord.aggregate([
      {
        $match: {
          date: { $gte: today },
          sessionType: 'check-in'
        }
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          onTime: {
            $sum: {
              $cond: [{ $eq: ['$status', 'on-time'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          department: '$_id',
          punctualityRate: {
            $multiply: [
              { $divide: ['$onTime', '$total'] },
              100
            ]
          }
        }
      }
    ]);
    
    res.send({ departmentPunctuality: departmentStats });
    
  } catch (error) {
    console.error(`[ERROR] Failed to generate department punctuality: ${error.message}`);
    next(error);
  }
};
