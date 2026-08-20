const KEYWORD_MAP = [
  { keywords: ['chest pain', 'chest tightness', 'palpitations', 'heart'], specialty: 'Cardiology' },
  { keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'numbness'], specialty: 'Neurology' },
  { keywords: ['fever', 'cough', 'sore throat', 'breathing', 'shortness of breath'], specialty: 'Respiratory Medicine' },
  { keywords: ['abdominal pain', 'stomach', 'nausea', 'vomiting', 'diarrhoea', 'diarrhea'], specialty: 'Gastroenterology' },
  { keywords: ['back pain', 'joint pain', 'knee', 'muscle', 'neck pain'], specialty: 'Orthopedics' },
  { keywords: ['rash', 'itching', 'itchy', 'skin', 'acne'], specialty: 'Dermatology' },
  { keywords: ['eye pain', 'blurred vision', 'red eye', 'vision'], specialty: 'Ophthalmology' },
  { keywords: ['ear pain', 'hearing', 'throat', 'nose', 'sinus'], specialty: 'ENT' },
  { keywords: ['anxiety', 'depression', 'stress', 'sleep', 'mood'], specialty: 'Psychiatry' },
  { keywords: ['fatigue', 'weakness', 'weight loss', 'tired'], specialty: 'General Medicine' },
];

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

  return {
    recommendedSpecialty: specialtyEntry ? specialtyEntry.specialty : 'General Medicine',
    urgencyLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    summary: specialtyEntry
      ? `Based on the reported symptoms, the probable condition category points to ${specialtyEntry.specialty}. This is a category estimate, not a diagnosis.`
      : 'Based on the reported symptoms, a general medicine assessment is recommended. This is a category estimate, not a diagnosis.',
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
    const body = await response.json();
    return {
      recommendedSpecialty: body.recommended_specialty,
      urgencyLevel: URGENCY_MAP[body.urgency] || 'routine',
      confidenceScore: body.confidence,
      summary: `Based on the reported symptoms, the probable condition category points to ${body.recommended_specialty}. This is a category estimate, not a diagnosis.`,
    };
  } catch (err) {
    console.warn(`[aiService] AI service unavailable (${err.message}), using mock analysis`);
    return mockAnalysis(payload);
  }
};

module.exports = { analyzeSymptoms, mockAnalysis };