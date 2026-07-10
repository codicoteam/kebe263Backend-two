// One-time migration: generate a unique placeholder username for every
// account created before the username field existed. Users keep
// `usernamePlaceholder: true` until they claim a real one via
// POST /api/auth/claim-username (frontend prompts them once for this).
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MongoDB URI');
  process.exit(1);
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 16) || 'user';
}

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const users = await User.find({ username: { $in: [null, undefined] } });
    console.log(`Backfilling ${users.length} user(s) without a username...`);

    for (const user of users) {
      const base = slugify(user.email.split('@')[0]);
      let candidate = base;
      let suffix = 0;
      // eslint-disable-next-line no-await-in-loop
      while (await User.findOne({ username: candidate, _id: { $ne: user._id } })) {
        suffix += 1;
        candidate = `${base}${suffix}`;
      }
      user.username = candidate;
      user.usernamePlaceholder = true;
      // eslint-disable-next-line no-await-in-loop
      await user.save({ validateModifiedOnly: true });
      console.log(`  ${user.email} -> ${candidate}`);
    }

    console.log('Done.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
})();
