const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://ekhfahossain_db_user:ekhfatestproject@cluster0.bhrucmn.mongodb.net/studentDB'
    );
    console.log('MongoDB Atlas Connected');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;
