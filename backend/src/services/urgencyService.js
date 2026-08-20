const fs = require('node:fs');
const path = require('node:path');

const RULES_PATH = path.join(__dirname, '..', 'config', 'urgencyRules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));

const normalize = (text) => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();

const matchRule = (phrase, text) => text.includes(phrase.toLowerCase());

const evaluateUrgency = (symptoms, durationInDays, severity, description = '') => {
  const text = normalize([...symptoms, description].join(' '));

  const matchedRules = [];

  const emergencyHits = rules.emergencyRules.filter((rule) => matchRule(rule.phrase, text));
  emergencyHits.forEach((rule) =>
    matchedRules.push({ id: rule.id, phrase: rule.phrase, urgency: 'emergency' })
  );

  if (emergencyHits.length > 0) {
    return buildResult('emergency', matchedRules);
  }

  const highHits = rules.highRules.filter((rule) => matchRule(rule.phrase, text));
  highHits.forEach((rule) =>
    matchedRules.push({ id: rule.id, phrase: rule.phrase, urgency: 'high' })
  );

  if (highHits.length > 0) {
    return buildResult('high', matchedRules);
  }

  const { severity: severityMap, durationDays: durationMap } = rules.thresholds;
  if (severity === 'severe' || durationInDays > 14) {
    return buildResult('high', matchedRules);
  }
  if (severity === 'moderate' || durationInDays > 7) {
    return buildResult('medium', matchedRules);
  }
  return buildResult('low', matchedRules);
};

const buildResult = (urgency, matchedRules) => ({
  urgency,
  message: rules.levels[urgency].message,
  showTemporaryGuidance: rules.showTemporaryGuidance[urgency],
  matchedRules,
});

const getRuleSet = () => rules;

module.exports = { evaluateUrgency, getRuleSet };