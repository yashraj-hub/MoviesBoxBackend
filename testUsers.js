const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');
require('dotenv').config();

async function test() {
  try {
    await connectDB();
    await new Promise(r => setTimeout(r, 1000));

    const total = await User.countDocuments();
    console.log('Total users:', total);

    const users = await User.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log('Last 5 users:');
    users.forEach((u, i) => {
      console.log(`${i+1}. ${u.fullName} (${u.email}) isActive=${u.isActive} tracking=${u.trackingEnabled} role=${u.role}`);
    });

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

test();
