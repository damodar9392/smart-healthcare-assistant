const Review = require('../models/Review');
const DoctorProfile = require('../models/DoctorProfile');

const recomputeDoctorRating = async (doctorUserId) => {
  const stats = await Review.aggregate([
    { $match: { doctor: doctorUserId } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const rating = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0;
  const ratingCount = stats.length > 0 ? stats[0].count : 0;
  await DoctorProfile.updateOne(
    { user: doctorUserId },
    { $set: { rating, ratingCount } }
  );
};

module.exports = { recomputeDoctorRating };
