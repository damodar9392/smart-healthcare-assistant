const fs = require('node:fs');
const path = require('node:path');

const RULES_PATH = path.join(__dirname, '..', 'config', 'interactionRules.json');
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));

const normalize = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const canonicalName = (raw) => {
  const n = normalize(raw);
  if (!n) return '';
  if (rules.aliases[n]) return n;
  for (const [key, aliases] of Object.entries(rules.aliases)) {
    if (aliases.includes(n)) return key;
  }
  return n;
};

const evaluateInteractions = (medications) => {
  const cleaned = medications.map((m) => canonicalName(m)).filter(Boolean);

  const seen = {};
  cleaned.forEach((m) => {
    seen[m] = (seen[m] || 0) + 1;
  });
  const duplicates = Object.entries(seen)
    .filter(([, count]) => count > 1)
    .map(([name]) => name);

  const interactions = rules.interactions
    .map((rule) => {
      const present = rule.medications.filter((m) => cleaned.includes(m));
      if (present.length !== rule.medications.length) {
        return null;
      }
      return {
        medications: rule.medications,
        category: rule.category,
        severity: rule.severity,
        advice: rule.advice,
        matched: present,
      };
    })
    .filter(Boolean);

  const summary = { count: interactions.length, urgent: 0, high: 0, medium: 0, safe: 0 };
  interactions.forEach((i) => {
    if (i.severity === 'urgent') summary.urgent += 1;
    else if (i.severity === 'high') summary.high += 1;
    else if (i.severity === 'medium') summary.medium += 1;
  });
  summary.safe = cleaned.length > 0 && interactions.length === 0 ? 1 : 0;

  const drugCount = new Set(cleaned).size;
  const duplicateExposure = drugCount < cleaned.length;

  return {
    medications: cleaned,
    duplicates: [...new Set(duplicates)],
    duplicateExposure,
    interactions,
    summary,
  };
};

const getCatalog = () => {
  const names = new Set(Object.keys(rules.aliases));
  rules.interactions.forEach((rule) => rule.medications.forEach((m) => names.add(m)));
  return [...names].sort();
};

module.exports = { evaluateInteractions, getCatalog, normalize, canonicalName };