require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MongoDB URI');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const email = process.argv[2] || 'takundagowa@gmail.com';
    const user = await User.findOne({ email });
    console.log('USER_FOUND:', !!user);
    if (user) {
      const updated = await User.findOneAndUpdate({ email }, { $set: { isAdmin: true, roles: [] } }, { new: true });
      console.log('PROMOTED_ID:', updated._id.toString());
    } else {
      console.log('NO_USER');
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  }
})();
