require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const DoctorProfile = require('../src/models/DoctorProfile');
const Review = require('../src/models/Review');

const run = async () => {
  await connectDB();

  const stats = await Review.aggregate([
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);

  const counts = new Map(stats.map((entry) => [String(entry._id), entry.count]));
  const profiles = await DoctorProfile.find({}, 'user rating ratingCount').lean();

  let updated = 0;
  for (const profile of profiles) {
    const doctorUserId = String(profile.user);
    const ratingCount = counts.get(doctorUserId) || 0;
    if (profile.ratingCount === ratingCount) {
      continue;
    }
    await DoctorProfile.updateOne({ _id: profile._id }, { $set: { ratingCount } });
    updated += 1;
  }

  console.log(`Backfill complete: ${updated} of ${profiles.length} doctor profiles updated.`);
  await mongoose.connection.close();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`Backfill failed: ${err.message}`);
    process.exit(1);
  });
