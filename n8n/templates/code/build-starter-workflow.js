// n8n Code node: "Build n8n Starter Workflow" (Run Once for All Items).
// Turns the blueprint into a portable,
// inactive, credential-free n8n workflow the visitor can import.
const STARTER_SUFFIX = '— n8n Starter';
const GENERATED_BY = 'the **Automation Discovery Agent**';
const TRIGGER_WORDS = /\b(trigger|watch|listen|schedule)\b/i;

function cleanInline(value, maxLength) {
  const max = maxLength === undefined ? 160 : maxLength;
  return String(value).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function slug(value, fallback) {
  const result = String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return result || fallback;
}

function nodeId(index) {
  return '00000000-0000-4000-8000-' + String(index).padStart(12, '0');
}

function parseTime(trigger) {
  const twelveHour = trigger.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toLowerCase().startsWith('p')) hour += 12;
    return { hour: hour, minute: Number(twelveHour[2] ?? 0) };
  }
  const twentyFourHour = trigger.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i);
  return twentyFourHour
    ? { hour: Number(twentyFourHour[1]), minute: Number(twentyFourHour[2]) }
    : { hour: 9, minute: 0 };
}

function scheduleInterval(trigger) {
  const time = parseTime(trigger);
  const lower = trigger.toLowerCase();
  const weekdays = [
    [/\bsunday\b/, 0], [/\bmonday\b/, 1], [/\btuesday\b/, 2], [/\bwednesday\b/, 3],
    [/\bthursday\b/, 4], [/\bfriday\b/, 5], [/\bsaturday\b/, 6],
  ];
  const namedDays = weekdays.filter(function (w) { return w[0].test(lower); }).map(function (w) { return w[1]; });
  if (/\bweekdays?\b/.test(lower)) {
    return { field: 'weeks', triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: time.hour, triggerAtMinute: time.minute };
  }
  if (namedDays.length > 0 || /\bweekly\b/.test(lower)) {
    return { field: 'weeks', triggerAtDay: namedDays.length > 0 ? namedDays : [1], triggerAtHour: time.hour, triggerAtMinute: time.minute };
  }
  return { field: 'days', triggerAtHour: time.hour, triggerAtMinute: time.minute };
}

function triggerNode(blueprint) {
  const firstStep = blueprint.steps[0];
  const context = blueprint.trigger + ' ' + (firstStep ? firstStep.title : '') + ' ' + (firstStep ? firstStep.description : '');
  const common = {
    id: nodeId(1),
    position: [-420, 80],
    notes: 'Blueprint trigger: ' + cleanInline(blueprint.trigger, 300),
  };

  if (/\b(gmail|inbox|email)\b/i.test(context) && /\b(arriv|receiv|watch|inbox)\w*\b/i.test(context)) {
    return Object.assign({}, common, {
      name: 'Gmail Trigger',
      type: 'n8n-nodes-base.gmailTrigger',
      typeVersion: 1.3,
      parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, simple: false, filters: {} },
      notes: common.notes + '\n\nSETUP: Select your Gmail credential and narrow the filters before activation.',
    });
  }
  if (/\b(webhook|form submission|website form)\b/i.test(context)) {
    return Object.assign({}, common, {
      name: 'Webhook Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2.1,
      parameters: { httpMethod: 'POST', path: 'starter-' + slug(blueprint.name, 'automation'), responseMode: 'onReceived', options: {} },
      notes: common.notes + '\n\nSETUP: Publish the workflow, then connect the calling form or app to the production webhook URL.',
    });
  }
  if (/\b(schedule|daily|weekly|weekday|every (?:day|morning|week))\b/i.test(context)) {
    return Object.assign({}, common, {
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.3,
      parameters: { rule: { interval: [scheduleInterval(blueprint.trigger)] } },
      notes: common.notes + '\n\nSETUP: Verify the workflow timezone and schedule before activation.',
    });
  }
  return Object.assign({}, common, {
    name: 'Manual Trigger',
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    parameters: {},
    notes: common.notes + '\n\nSETUP: Replace this starter trigger with the event that begins the real process.',
  });
}

function entityIdFromInputs(inputs) {
  const deviceInput = inputs.find(function (input) { return /\b(device id|smart plug|socket)\b/i.test(input); });
  if (!deviceInput) return 'switch.replace_with_entity_id';
  const match = deviceInput.match(/\(([^)]+)\)/);
  const parenthetical = match ? match[1] : undefined;
  const candidate = cleanInline(parenthetical ?? deviceInput.replace(/^.*?:\s*/, ''), 100);
  return 'switch.' + slug(candidate, 'replace-with-entity-id').replace(/-/g, '_');
}

function isHomeAssistantAction(blueprint, step) {
  const integrations = blueprint.integrations.map(function (i) { return i.name; }).join(' ');
  const context = step.title + ' ' + step.description + ' ' + integrations;
  return /\b(home assistant|smartthings|zigbee2mqtt)\b/i.test(context) &&
    /\b(smart plug|socket|switch|power|turn (?:on|off))\b/i.test(context);
}

function actionNode(blueprint, step, index, position) {
  const base = {
    id: nodeId(index + 1),
    name: index + '. ' + cleanInline(step.title, 90),
    position: position,
    notes: step.kind.toUpperCase() + ' STEP\n\n' + cleanInline(step.description, 400),
  };
  if (isHomeAssistantAction(blueprint, step)) {
    const turnOff = /\b(turn|power|switch)\s+off\b/i.test(step.title + ' ' + step.description);
    return Object.assign({}, base, {
      type: 'n8n-nodes-base.homeAssistant',
      typeVersion: 1,
      parameters: {
        resource: 'service',
        operation: 'call',
        domain: 'switch',
        service: turnOff ? 'turn_off' : 'turn_on',
        serviceAttributes: { attributes: [{ name: 'entity_id', value: entityIdFromInputs(blueprint.inputs) }] },
      },
      notes: base.notes + "\n\nSETUP: Add a Home Assistant API credential and verify the entity_id. For SmartThings or Zigbee2MQTT, replace this node with that platform's equivalent action.",
    });
  }
  return Object.assign({}, base, {
    type: 'n8n-nodes-base.noOp',
    typeVersion: 1,
    parameters: {},
    notes: base.notes + "\n\nSETUP: Replace this planning node with the named n8n integration, configure its fields, and add its credential if required.",
  });
}

function setupNote(blueprint) {
  const integrations = blueprint.integrations
    .map(function (i) { return '- **' + cleanInline(i.name, 80) + ':** ' + cleanInline(i.role, 220); })
    .join('\n');
  const assumptions = blueprint.assumptions.map(function (a) { return '- ' + cleanInline(a, 260); }).join('\n');
  const exceptions = blueprint.exceptions.map(function (e) { return '- ' + cleanInline(e, 260); }).join('\n');
  return {
    id: nodeId(0),
    name: 'START HERE',
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position: [-660, -420],
    parameters: {
      width: 720,
      height: 340,
      color: 5,
      content: '# ' + cleanInline(blueprint.name, 120) + '\n\nCredential-free starter generated by ' + GENERATED_BY + '.\n\n## Before activation\n1. Open each node marked **SETUP** in its Notes tab.\n2. Add your own credentials; none are included in this file.\n3. Replace any planning nodes and verify IDs, destinations, filters, timezone, and exception paths.\n4. Run with test data before publishing.\n\n## Recommended integrations\n' + integrations + '\n\n## Assumptions\n' + (assumptions || '- None recorded') + '\n\n## Exceptions\n' + (exceptions || '- None recorded'),
    },
  };
}

function isRepresentedByTrigger(step, index) {
  return index === 0 && TRIGGER_WORDS.test(step.title + ' ' + step.description);
}

function blueprintToN8nWorkflow(blueprint) {
  const trigger = triggerNode(blueprint);
  const actionSteps = blueprint.steps.filter(function (step, index) { return !isRepresentedByTrigger(step, index); });
  const actionNodes = actionSteps.map(function (step, index) {
    return actionNode(blueprint, step, index + 1, [-140 + index * 260, 80]);
  });
  const connectedNodes = [trigger].concat(actionNodes);
  const connections = {};
  for (let index = 0; index < connectedNodes.length - 1; index += 1) {
    connections[connectedNodes[index].name] = {
      main: [[{ node: connectedNodes[index + 1].name, type: 'main', index: 0 }]],
    };
  }
  return {
    name: cleanInline(blueprint.name, 100) + ' ' + STARTER_SUFFIX,
    active: false,
    nodes: [setupNote(blueprint)].concat(connectedNodes),
    connections: connections,
    settings: { executionOrder: 'v1' },
    pinData: {},
    meta: { templateCredsSetupCompleted: false },
    tags: [],
  };
}

const item = $input.first().json;
const workflow = blueprintToN8nWorkflow(item.blueprint);
const workflowJson = JSON.stringify(workflow, null, 2);

return [{
  json: Object.assign({}, item, {
    workflowFilename: slug(item.blueprint.name, 'automation') + '-n8n-workflow.json',
    workflowJson: workflowJson,
    workflowBase64: Buffer.from(workflowJson, 'utf8').toString('base64'),
  }),
}];
