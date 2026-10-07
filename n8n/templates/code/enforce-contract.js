// n8n Code node: "Enforce Contract" (Run Once for All Items).
// Whatever the agent produced, downstream nodes only ever see a clean
// { status, message, chatReply } object, plus blueprint + contact when the
// blueprint is ready to deliver.
const FALLBACK_MESSAGE = 'Sorry, I lost my train of thought for a second. Could you tell me once more which repetitive task you would most like to hand off?';
const ASK_CONTACT = 'Your blueprint is ready! What is your first name, and which email address should I send it to?';
const LIMIT_REACHED = "I've already sent the blueprint to that address. Check your inbox (and spam folder), or tell me what you'd like to change in the design.";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Abuse guard for the public chat: at most 2 emails per chat session and 3
// per recipient per 24 hours. Only a hash of each address is stored.
// Workflow static data persists in production (active) executions only.
const SEND_LIMITS = { perSession: 2, perRecipientPerDay: 3, windowMs: 24 * 60 * 60 * 1000 };

function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function reserveSend(email) {
  const data = $getWorkflowStaticData('global');
  const now = Date.now();
  const sessionId = String($('When chat message received').first().json.sessionId || 'unknown');
  const sends = (Array.isArray(data.blueprintSends) ? data.blueprintSends : [])
    .filter(function (s) { return now - s.at < SEND_LIMITS.windowMs; });
  const recipient = hash(email);
  const bySession = sends.filter(function (s) { return s.session === sessionId; }).length;
  const byRecipient = sends.filter(function (s) { return s.recipient === recipient; }).length;
  if (bySession >= SEND_LIMITS.perSession || byRecipient >= SEND_LIMITS.perRecipientPerDay) {
    data.blueprintSends = sends;
    return false;
  }
  sends.push({ at: now, session: sessionId, recipient: recipient });
  data.blueprintSends = sends.slice(-500);
  return true;
}

function str(value, max) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function strList(value, max) {
  if (!Array.isArray(value)) return [];
  return value.map(function (v) { return str(v, max); }).filter(function (v) { return v.length > 0; });
}

function unwrap(raw) {
  let value = raw;
  for (let i = 0; i < 3; i += 1) {
    if (typeof value === 'string') {
      const text = value.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
      try { value = JSON.parse(text); } catch { return null; }
      continue;
    }
    if (value && typeof value === 'object' && !value.status && value.output !== undefined) {
      value = value.output;
      continue;
    }
    break;
  }
  return value && typeof value === 'object' ? value : null;
}

function cleanBlueprint(b) {
  if (!b || typeof b !== 'object') return null;
  const kinds = ['deterministic', 'ai', 'human'];
  const steps = (Array.isArray(b.steps) ? b.steps : []).slice(0, 8).map(function (s) {
    const kind = s && kinds.indexOf(s.kind) !== -1 ? s.kind : 'deterministic';
    return { title: str(s && s.title, 80), description: str(s && s.description, 400), kind: kind };
  }).filter(function (s) { return s.title && s.description; });
  const integrations = (Array.isArray(b.integrations) ? b.integrations : []).map(function (i) {
    return { name: str(i && i.name, 60), role: str(i && i.role, 200) };
  }).filter(function (i) { return i.name && i.role; });
  let hours = b.estimatedHoursSavedPerWeek;
  if (typeof hours === 'string' && hours.trim() !== '') hours = Number(hours);
  hours = typeof hours === 'number' && isFinite(hours) ? Math.min(80, Math.max(0, hours)) : null;
  const out = {
    name: str(b.name, 120),
    problem: str(b.problem, 600),
    trigger: str(b.trigger, 200),
    inputs: strList(b.inputs, 200),
    steps: steps,
    integrations: integrations,
    exceptions: strList(b.exceptions, 300),
    outputs: strList(b.outputs, 200),
    complexity: ['beginner', 'intermediate', 'advanced'].indexOf(b.complexity) !== -1 ? b.complexity : 'intermediate',
    difficulty: ['easy', 'moderate', 'hard'].indexOf(b.difficulty) !== -1 ? b.difficulty : 'moderate',
    estimatedHoursSavedPerWeek: hours,
    assumptions: strList(b.assumptions, 300)
  };
  if (!out.name || !out.problem || !out.trigger) return null;
  if (out.inputs.length < 1 || out.steps.length < 2 || out.integrations.length < 1 || out.outputs.length < 1) return null;
  return out;
}

function cleanContact(c) {
  if (!c || typeof c !== 'object') return null;
  const firstName = str(c.firstName, 80);
  const email = str(c.email, 200).toLowerCase();
  if (!firstName || !EMAIL.test(email)) return null;
  return { firstName: firstName, email: email };
}

function question(message, quickReplies) {
  const replies = (Array.isArray(quickReplies) ? quickReplies : []).map(function (q) {
    return str(q && (q.label || q.value), 60);
  }).filter(Boolean).slice(0, 6);
  const chatReply = replies.length ? message + '\n\nYou could answer: ' + replies.join(' · ') : message;
  return { status: 'question', message: message, chatReply: chatReply };
}

const item = $input.first().json;
const candidate = item.error ? null : unwrap(item.output !== undefined ? item.output : item);
let response = question(FALLBACK_MESSAGE);

if (candidate && candidate.status === 'blueprint') {
  const blueprint = cleanBlueprint(candidate.blueprint);
  const contact = cleanContact(candidate.contact);
  if (blueprint && contact && !reserveSend(contact.email)) {
    response = question(LIMIT_REACHED);
  } else if (blueprint && contact) {
    const message = str(candidate.message, 300) || 'Here is your automation blueprint.';
    response = { status: 'blueprint', message: message, chatReply: message, blueprint: blueprint, contact: contact };
  } else if (blueprint) {
    response = question(ASK_CONTACT);
  }
} else if (candidate && candidate.status === 'question') {
  const message = str(candidate.message, 2000);
  if (message) response = question(message, candidate.quickReplies);
}

return [{ json: response }];
