// One-off migration: drops the stale `location: 2dsphere` indexes on Property
// and ServiceProvider (which crashed every save with "Can't extract geo keys"
// once the model moved the geo point to `location.geo`), then lets Mongoose
// rebuild the correct `location.geo: 2dsphere` sparse index.
//
// Run once after deploying the updated property.model.js / serviceProvider.model.js:
//   node scripts/fixGeoIndexes.js
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Property = require('../models/property.model');
const ServiceProvider = require('../models/serviceProvider.model');

dotenv.config();

const fixIndexes = async (Model, label) => {
  const collection = Model.collection;
  const existing = await collection.indexes();
  const stale = existing.find((idx) => idx.key && idx.key.location === '2dsphere');

  if (stale) {
    console.log(`[${label}] Dropping stale index "${stale.name}"...`);
    await collection.dropIndex(stale.name);
  } else {
    console.log(`[${label}] No stale "location: 2dsphere" index found.`);
  }

  console.log(`[${label}] Syncing indexes with current schema...`);
  const result = await Model.syncIndexes();
  console.log(`[${label}] Done. Index sync result:`, result);
};

(async () => {
  try {
    await connectDB();
    await fixIndexes(Property, 'Property');
    await fixIndexes(ServiceProvider, 'ServiceProvider');
    console.log('Geo index migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
})();
