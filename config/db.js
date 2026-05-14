const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })

    console.log('MongoDB Atlas Connected Successfully ✅')
  } catch (error) {
    console.log('MongoDB Connection Failed ❌')
    console.log(error.message)
    // process.exit(1) // Don't crash the server, allow TMDB proxy to work
  }
}

module.exports = connectDB
