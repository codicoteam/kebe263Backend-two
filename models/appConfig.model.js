const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppConfig', appConfigSchema);
