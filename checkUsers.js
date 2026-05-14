const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();
const connectDB = require('./config/db');

async function check() {
  try {
    await connectDB();
    await mongoose.connect(process.env.MONGO_URI); // Connect mongoose too
    const count = await User.countDocuments();
    console.log('Total users in DB:', count);

    const latest = await User.findOne().sort({ createdAt: -1 }).lean();
    console.log('Latest user:', JSON.stringify({
      id: latest?._id,
      fullName: latest?.fullName,
      email: latest?.email,
      isActive: latest?.isActive,
      role: latest?.role,
      sessionsCount: latest?.sessions?.length,
      trackingEnabled: latest?.trackingEnabled
    }, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
