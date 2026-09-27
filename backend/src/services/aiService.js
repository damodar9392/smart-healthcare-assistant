const { throttledWarn } = require('../utils/logThrottle');
const { resolveCanonical } = require('./doctorMatchingService');

const KEYWORD_MAP = [
  { keywords: ['chest pain', 'chest tightness', 'palpitations', 'heart'], specialty: 'Cardiologist' },
  { keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'numbness'], specialty: 'Neurologist' },
  { keywords: ['fever', 'cough', 'sore throat', 'breathing', 'shortness of breath'], specialty: 'Pulmonologist' },
  { keywords: ['abdominal pain', 'stomach', 'nausea', 'vomiting', 'diarrhoea', 'diarrhea'], specialty: 'Gastroenterologist' },
  { keywords: ['back pain', 'joint pain', 'knee', 'muscle', 'neck pain'], specialty: 'Orthopedic Specialist' },
  { keywords: ['rash', 'itching', 'itchy', 'skin', 'acne'], specialty: 'Dermatologist' },
  { keywords: ['eye pain', 'blurred vision', 'red eye', 'vision'], specialty: 'Ophthalmologist' },
  { keywords: ['ear pain', 'hearing', 'throat', 'nose', 'sinus'], specialty: 'ENT Specialist' },
  { keywords: ['anxiety', 'depression', 'stress', 'sleep', 'mood'], specialty: 'Psychiatrist' },
  { keywords: ['fatigue', 'weakness', 'weight loss', 'tired'], specialty: 'General Physician' },
  { keywords: ['burning urination', 'urine', 'urinary', 'kidney stone'], specialty: 'Urologist' },
  { keywords: ['child', 'baby', 'infant', 'toddler', 'growth'], specialty: 'Pediatrician' },
  { keywords: ['period', 'menstrual', 'pregnancy', 'pregnant'], specialty: 'Gynecologist' },
  { keywords: ['thyroid', 'diabetes', 'blood sugar', 'hormone'], specialty: 'Endocrinologist' },
  { keywords: ['toothache', 'tooth pain', 'cavity', 'gum'], specialty: 'Dentist' },
];

const FALLBACK_SPECIALTY = 'General Physician';

const EMERGENCY_KEYWORDS = [
  'chest pain',
  'shortness of breath',
  'breathing difficulty',
  'unconscious',
  'severe bleeding',
  'stroke',
  'paralysis',
  'seizure',
  'high fever',
];

const URGENCY_MAP = { low: 'routine', medium: 'soon', high: 'urgent', emergency: 'emergency' };

const mockAnalysis = ({ symptoms, severity, durationInDays }) => {
  const text = symptoms.join(' ').toLowerCase();
  const specialtyEntry = KEYWORD_MAP.find((entry) =>
    entry.keywords.some((keyword) => text.includes(keyword))
  );
  const isEmergency = EMERGENCY_KEYWORDS.some((keyword) => text.includes(keyword));

  let urgencyLevel = 'routine';
  if (isEmergency) {
    urgencyLevel = 'emergency';
  } else if (severity === 'severe' || durationInDays > 14) {
    urgencyLevel = 'urgent';
  } else if (severity === 'moderate') {
    urgencyLevel = 'soon';
  }

  const confidenceScore = Math.min(
    0.72 + (urgencyLevel !== 'routine' ? 0.12 : 0.05) + (specialtyEntry ? 0.06 : 0),
    0.97
  );

  const recommendedSpecialty = specialtyEntry
    ? resolveCanonical(specialtyEntry.specialty) || specialtyEntry.specialty
    : FALLBACK_SPECIALTY;

  return {
    recommendedSpecialty,
    urgencyLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    summary: specialtyEntry
      ? `Based on the reported symptoms, the probable condition category points to ${recommendedSpecialty}. This is a category estimate, not a diagnosis.`
      : `Based on the reported symptoms, a ${recommendedSpecialty.toLowerCase()} assessment is recommended. This is a category estimate, not a diagnosis.`,
  };
};

const buildResult = (body) => {
  const recommendedSpecialty =
    resolveCanonical(body.recommended_specialty) || FALLBACK_SPECIALTY;
  return {
    recommendedSpecialty,
    urgencyLevel: URGENCY_MAP[body.urgency] || 'routine',
    confidenceScore: body.confidence,
    summary: `Based on the reported symptoms, the probable condition category points to ${recommendedSpecialty}. This is a category estimate, not a diagnosis.`,
  };
};

const analyzeSymptoms = async (payload) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const aiPayload = {
    symptoms: [...payload.symptoms, ...(payload.additionalSymptoms || [])],
    duration_days: payload.durationInDays,
    severity: payload.severity,
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${aiServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }
    return buildResult(await response.json());
  } catch (firstErr) {
    try {
      const controller = new AbortController();
      const retryTimer = setTimeout(() => controller.abort(), 3000);
      const retry = await fetch(`${aiServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload),
        signal: controller.signal,
      });
      clearTimeout(retryTimer);
      if (!retry.ok) {
        throw new Error(`AI service returned ${retry.status}`);
      }
      return buildResult(await retry.json());
    } catch (err) {
      throttledWarn(
        'aiService.analyzeSymptoms',
        `[aiService] AI service unavailable (${err.message}), using mock analysis (fallback logged at most once per minute)`
      );
      return mockAnalysis(payload);
    }
  }
};

module.exports = { analyzeSymptoms, mockAnalysis };