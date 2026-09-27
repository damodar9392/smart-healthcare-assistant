const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30000;

const askAssistant = async ({ message, history = [] }) => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${aiServiceUrl}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { askAssistant };
