const Record = require('../models/record');
const { DateTime } = require('luxon');

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

/*exports.getAll = async (req, res, next) => {
  try { res.send(await Record.find()); } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try {
    const records = await Record.find().sort({ date: -1 }); // 👈 sort by date descending
    res.send(records);
  } catch (e) {
    next(e);
  }
};*/

exports.getAll = async (req, res, next) => {
  try {
    const records = await Record.find().sort({ date: -1 }); // sorted by date descending

    // Convert each record's date/time to Nairobi time
    const recordsNairobi = records.map(r => {
      // Combine date and time fields (assuming both are Date objects)
      const utcDateTime = new Date(r.time); // time in UTC from DB

      // Convert to Nairobi time
      const nairobiDateTime = DateTime.fromJSDate(utcDateTime, { zone: 'utc' })
        .setZone('Africa/Nairobi');

      return {
        ...r.toObject(), // convert mongoose doc to plain object
        time: nairobiDateTime.toISO(),               // ISO string in Nairobi time
        displayTime: nairobiDateTime.toFormat('LLL dd, yyyy, hh:mm a') // optional display format
      };
    });

    res.send(recordsNairobi);

  } catch (e) {
    next(e);
  }
};


exports.update = async (req, res, next) => {
  try {
    const upd = req.body;
    const types = ['invoiceNo', 'cashSaleNo', 'quotationNo'].filter((k) => upd[k]);
    if (types.length !== 1) return res.status(400).send({ error: 'Exactly one document type required' });

    const record = await Record.findOneAndUpdate({ id: req.params.id }, { $set: upd }, { new: true, runValidators: true });
    if (!record) return res.status(404).send({ error: 'Record not found' });
    res.send(record);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const record = await Record.findOneAndDelete({ id: req.params.id });
    if (!record) return res.status(404).send({ error: 'Record not found' });
    res.send({ message: 'Record deleted successfully' });
  } catch (e) { next(e); }
};
