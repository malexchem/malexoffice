/*const mongoose = require("mongoose");

const CleanSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["INVOICE", "CASH_SALE", "QUOTATION"],
      required: true,
      index: true,
    },

    documentNo: {
      type: String,
      unique: true,
      sparse: true, // ✅ allows multiple missing values safely
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // original untouched timestamp (audit-safe)
    originalCreatedAt: {
      type: String,
      required: true,
    },

    created_time_utc: {
      type: String,
      required: true,
    },

    created_time_nairobi: {
      type: String,
      required: true,
    },

    createdAt_date: {
      type: Number,
      required: true,
      index: true,
    },

    createdAt_text: {
      type: String,
      required: true,
    },

    created_year: {
      type: Number,
      required: true,
      index: true,
    },

    created_month: {
      type: Number,
      required: true,
      index: true,
    },

    created_day: {
      type: Number,
      required: true,
    },

    createdBy: {
      type: String,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    facilitator: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // MongoDB record timestamps (NOT business time)
  }
);

// Avoid recompiling model if it already exists
const Clean = mongoose.models.Clean || mongoose.model("Clean", CleanSchema);

module.exports = Clean;
*/
const mongoose = require("mongoose");
const CleanSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["INVOICE", "CASH_SALE", "QUOTATION"],
      required: true,
      index: true,
    },

    documentNo: {
      type: String,
      index: true,
    },

    amount: { type: Number, required: true },

    originalCreatedAt: { type: String, required: true },

    created_time_utc: { type: String, required: true },
    created_time_nairobi: { type: String, required: true },

    createdAt_date: { type: Number, required: true, index: true },
    createdAt_text: { type: String, required: true },

    created_year: { type: Number, required: true, index: true },
    created_month: { type: Number, required: true, index: true },
    created_day: { type: Number, required: true },

    createdBy: { type: String, required: true },
    customerName: { type: String, required: true },
    facilitator: { type: String, required: true },
  },
  { timestamps: true }
);

CleanSchema.index(
  { documentType: 1, documentNo: 1 },
  { unique: true }
);
const Clean = mongoose.models.Clean || mongoose.model("Clean", CleanSchema);

module.exports = Clean;