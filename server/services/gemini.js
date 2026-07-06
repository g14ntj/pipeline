const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

function useVertex() {
  return process.env.ORACLE_USE_VERTEX_AI === 'true' || process.env.NODE_ENV === 'production';
}

async function summarizeEmail({ subject, from, body, snippet }) {
  const prompt = `Summarize this email thread for a CRM timeline. Be concise (2-3 sentences). Include key decisions or asks.

Subject: ${subject}
From: ${from}
Body: ${body || snippet || ''}`;

  return generateText(prompt);
}

async function extractMeetingNotes(text) {
  const prompt = `Extract structured data from these meeting notes. Return JSON only with keys:
attendees (array of emails or names), organization (string or null), decisions (string), action_items (array of {task, owner, due_date}).

Notes:
${text.slice(0, 12000)}`;

  const raw = await generateText(prompt);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { attendees: [], decisions: raw, action_items: [] };
  } catch {
    return { attendees: [], decisions: raw, action_items: [] };
  }
}

async function generateText(prompt) {
  if (useVertex()) {
    const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'phoenician-production';
    const location = process.env.VERTEX_AI_LOCATION || 'us-west1';
    const model = process.env.VERTEX_ORACLE_MODEL || 'gemini-2.5-flash';

    const vertex = new VertexAI({ project, location });
    const generativeModel = vertex.getGenerativeModel({ model });
    const result = await generativeModel.generateContent(prompt);
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
  if (!apiKey) {
    return '(AI summary unavailable — configure Vertex AI or GOOGLE_GENERATIVE_AI_API_KEY)';
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

module.exports = { summarizeEmail, extractMeetingNotes, generateText };
