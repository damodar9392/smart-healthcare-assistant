const fs = require('node:fs');
const path = require('node:path');

const configPath = path.join(__dirname, '..', 'config', 'doctorMatchWeights.json');
const aliasesPath = path.join(__dirname, '..', 'config', 'specialtyAliases.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const specialtyData = JSON.parse(fs.readFileSync(aliasesPath, 'utf-8'));

const { findNextFreeSlot } = require('./slotService');

const STOP_TOKENS = new Set([
  'and',
  'the',
  'for',
  'with',
  'specialist',
  'specialists',
  'doctor',
  'doctors',
  'physician',
  'general',
  'medicine',
]);

const normalizeText = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CANONICAL_BY_KEY = new Map(
  specialtyData.canonical.map((label) => [normalizeText(label), label])
);

const resolveCanonical = (raw) => {
  const normalized = normalizeText(raw);
  if (!normalized) {
    return null;
  }
  if (CANONICAL_BY_KEY.has(normalized)) {
    return CANONICAL_BY_KEY.get(normalized);
  }
  if (specialtyData.aliases[normalized]) {
    return specialtyData.aliases[normalized];
  }
  return null;
};

const significantTokens = (raw) =>
  normalizeText(raw)
    .split(' ')
    .filter((token) => token.length >= 4 && !STOP_TOKENS.has(token));

const scoreSpecialization = (doctorSpecialization, requestedSpecialization) => {
  const requestedRaw = String(requestedSpecialization || '').trim();
  if (!requestedRaw) {
    return { applicable: false, score: 0, reason: 'no-specialty-requested' };
  }

  const requestedCanonical = resolveCanonical(requestedRaw);
  const doctorCanonical = resolveCanonical(doctorSpecialization);
  const requestedTokens = significantTokens(requestedRaw);
  const doctorTokens = significantTokens(doctorSpecialization);

  if (requestedCanonical && doctorCanonical) {
    if (requestedCanonical === doctorCanonical) {
      return {
        applicable: true,
        score: config.specialization.exact,
        canonical: doctorCanonical,
        reason: 'exact-canonical-match',
      };
    }
    return {
      applicable: true,
      score: config.specialization.none,
      canonical: doctorCanonical,
      reason: 'different-specialty',
    };
  }

  if (doctorTokens.length > 0 && requestedTokens.length > 0) {
    const shared = doctorTokens.filter((token) => requestedTokens.includes(token));
    if (shared.length > 0) {
      return {
        applicable: true,
        score: config.specialization.related,
        canonical: doctorCanonical,
        reason: 'related-token-match',
        sharedTokens: shared,
      };
    }
  }

  const normalizedDoctor = normalizeText(doctorSpecialization);
  const normalizedRequested = normalizeText(requestedRaw);
  if (
    normalizedDoctor.length >= 3 &&
    normalizedRequested.length >= 3 &&
    (normalizedDoctor.includes(normalizedRequested) ||
      normalizedRequested.includes(normalizedDoctor))
  ) {
    return {
      applicable: true,
      score: config.specialization.related,
      canonical: doctorCanonical,
      reason: 'substring-match',
    };
  }

  return {
    applicable: true,
    score: config.specialization.none,
    canonical: doctorCanonical,
    reason: 'no-match',
  };
};

const scoreDistance = (distanceMeters, origin) => {
  if (!origin) {
    return { applicable: false, score: 0, reason: 'no-origin-supplied' };
  }
  if (typeof distanceMeters !== 'number' || Number.isNaN(distanceMeters)) {
    return { applicable: false, score: 0, reason: 'no-distance-available' };
  }

  const maxDistance = origin.maxDistanceMeters;
  const fullCredit = config.distance.fullCreditBelowMeters;

  if (distanceMeters <= fullCredit) {
    return { applicable: true, score: 1, meters: distanceMeters, reason: 'within-full-credit' };
  }
  if (distanceMeters >= maxDistance) {
    return { applicable: true, score: 0, meters: distanceMeters, reason: 'at-max-distance' };
  }

  const score = (maxDistance - distanceMeters) / (maxDistance - fullCredit);
  return {
    applicable: true,
    score: Math.max(0, Math.min(1, score)),
    meters: distanceMeters,
    reason: 'linear-decay',
  };
};

const scoreExperience = (years) => {
  const value = Number(years);
  if (!Number.isFinite(value) || value < 0) {
    return { applicable: true, score: 0, reason: 'unknown-experience' };
  }
  const fullCredit = config.experience.fullCreditYears;
  return {
    applicable: true,
    score: Math.min(value / fullCredit, 1),
    years: value,
    reason: value >= fullCredit ? 'saturated' : 'proportional',
  };
};

const scoreRating = (rating, ratingCount) => {
  const { priorMean, priorWeight, scale } = config.rating;
  const count = Number.isFinite(Number(ratingCount)) && Number(ratingCount) > 0
    ? Number(ratingCount)
    : 0;
  const average = Number(rating);

  if (count === 0 || !Number.isFinite(average) || average <= 0) {
    return {
      applicable: true,
      score: priorMean / scale,
      count: 0,
      shrunk: priorMean,
      reason: 'no-reviews-prior',
    };
  }

  const shrunk = (average * count + priorMean * priorWeight) / (count + priorWeight);
  return {
    applicable: true,
    score: Math.max(0, Math.min(1, shrunk / scale)),
    count,
    shrunk: Math.round(shrunk * 100) / 100,
    reason: 'shrunk-average',
  };
};

const scoreAvailability = (nextSlot, hasWindows) => {
  const tiers = config.availability.tiers;
  if (!hasWindows) {
    return { applicable: true, score: tiers.noWindows, reason: 'no-availability-declared' };
  }
  if (!nextSlot) {
    return {
      applicable: true,
      score: tiers.noFreeSlot,
      reason: 'all-slots-booked-in-horizon',
    };
  }
  if (nextSlot.daysAhead === 0) {
    return {
      applicable: true,
      score: tiers.sameDay,
      nextAvailableSlot: nextSlot,
      reason: 'available-today',
    };
  }
  if (nextSlot.daysAhead === 1) {
    return {
      applicable: true,
      score: tiers.within48Hours,
      nextAvailableSlot: nextSlot,
      reason: 'available-within-48h',
    };
  }
  return {
    applicable: true,
    score: tiers.withinHorizon,
    nextAvailableSlot: nextSlot,
    reason: 'available-within-horizon',
  };
};

const roundComponent = (value) => Math.round(value * 10000) / 10000;

const scoreDoctors = (candidates, context = {}) => {
  const {
    specialization = '',
    origin = null,
    availabilityIndex = new Map(),
    now = new Date(),
  } = context;

  const horizonDays = config.availability.horizonDays;
  const weights = config.weights;

  return candidates.map((candidate) => {
    const doctorUserId = candidate.user?._id || candidate.user || candidate._id;

    const availabilityEntry = availabilityIndex.get(String(doctorUserId));
    const windows = availabilityEntry ? availabilityEntry.windows : [];
    const hasWindows = availabilityEntry ? availabilityEntry.hasWindows : false;
    const nextSlot = findNextSlot({ windows, booked: availabilityEntry, horizonDays, now });

    const components = {
      specialization: scoreSpecialization(candidate.specialization, specialization),
      distance: scoreDistance(candidate.distanceMeters, origin),
      availability: scoreAvailability(nextSlot, hasWindows),
      experience: scoreExperience(candidate.experience),
      rating: scoreRating(candidate.rating, candidate.ratingCount),
    };

    let weightedSum = 0;
    let applicableWeight = 0;
    const breakdown = {};

    Object.entries(components).forEach(([key, result]) => {
      if (!result.applicable) {
        breakdown[key] = { skipped: true, reason: result.reason, weight: weights[key] };
        return;
      }
      const score = roundComponent(result.score);
      const weighted = score * weights[key] * 100;
      weightedSum += weighted;
      applicableWeight += weights[key];
      const { applicable, ...rest } = result;
      breakdown[key] = { ...rest, score, weight: weights[key], weighted: Math.round(weighted * 100) / 100 };
    });

    const matchScore =
      applicableWeight > 0 ? Math.round(weightedSum / applicableWeight) : 0;

    return {
      ...candidate,
      distanceKm:
        typeof candidate.distanceMeters === 'number'
          ? Math.round(candidate.distanceMeters / 100) / 10
          : undefined,
      matchScore,
      matchBreakdown: breakdown,
      matchWeightBasis: Math.round(applicableWeight * 100) / 100,
      nextAvailableSlot: nextSlot
        ? { date: nextSlot.date, startTime: nextSlot.startTime }
        : null,
    };
  });
};

const findNextSlot = ({ windows, booked, horizonDays, now }) =>
  findNextFreeSlot({
    windows,
    booked: booked ? booked.booked : new Set(),
    fromDate: now,
    horizonDays,
  });

const compareByScore = (a, b) => {
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }
  const ratingDiff = (b.rating || 0) - (a.rating || 0);
  if (ratingDiff !== 0) {
    return ratingDiff;
  }
  return (b.experience || 0) - (a.experience || 0);
};

const getMatchConfig = () => config;

const getSpecialtyVocabulary = () => ({
  canonical: specialtyData.canonical,
  aliases: specialtyData.aliases,
});

module.exports = {
  scoreDoctors,
  scoreSpecialization,
  scoreDistance,
  scoreExperience,
  scoreRating,
  scoreAvailability,
  resolveCanonical,
  normalizeText,
  compareByScore,
  getMatchConfig,
  getSpecialtyVocabulary,
};
