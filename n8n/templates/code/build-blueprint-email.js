// n8n Code node: "Build Blueprint Email" (Run Once for All Items).
// Renders the blueprint as an email-safe,
// inline-styled HTML document. Every dynamic value is escaped because agent
// and visitor text is untrusted.
const KIND_META = {
  deterministic: { label: "Workflow step", color: "#9aa1b0" },
  ai: { label: "AI reasoning", color: "#ea4b71" },
  human: { label: "Human approval", color: "#d9a23b" },
};

const COMPLEXITY_LABEL = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_LABEL = {
  easy: "Easy build",
  moderate: "Moderate build",
  hard: "Ambitious build",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sectionLabel(label) {
  return `<p style="margin:0 0 10px;color:#9aa1b0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(label)}</p>`;
}

function bulletList(items, emptyLabel) {
  const values = items.length > 0 ? items : [emptyLabel];
  return values
    .map(
      (item) =>
        `<tr><td style="width:16px;padding:0 0 8px;color:#9aa1b0;vertical-align:top;">&mdash;</td><td style="padding:0 0 8px;color:#b9bec9;font-size:14px;line-height:21px;">${escapeHtml(item)}</td></tr>`
    )
    .join("");
}

function blueprintToEmailHtml(blueprint, options) {
  const isBuildRequest = options.action === "build-request";
  const heading = isBuildRequest
    ? `Build request from ${options.firstName}`
    : blueprint.name;
  const intro = isBuildRequest
    ? `${options.firstName} (${options.email}) requested help building this automation.`
    : `Hi ${options.firstName}, here is the automation blueprint you requested.`;
  const estimatedImpact =
    blueprint.estimatedHoursSavedPerWeek !== null
      ? `${blueprint.estimatedHoursSavedPerWeek} hrs/week`
      : "Time saved depends on volume";
  const estimatedImpactNote =
    blueprint.estimatedHoursSavedPerWeek !== null
      ? "potentially saved — estimate, not a measurement"
      : "a quick conversation will size it";
  const capturedLabel = new Date(options.capturedAt).toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const workflowRows = [
    `<tr><td style="width:26px;padding:2px 13px 20px 0;vertical-align:top;"><span style="display:inline-block;width:10px;height:10px;border:2px solid #ea4b71;border-radius:50%;background:#0c0f16;"></span></td><td style="padding:0 0 20px;vertical-align:top;">${sectionLabel("trigger")}<p style="margin:-6px 0 0;color:#e9eaee;font-size:15px;font-weight:700;line-height:22px;">${escapeHtml(blueprint.trigger)}</p></td></tr>`,
    ...blueprint.steps.map((step) => {
      const meta = KIND_META[step.kind];
      return `<tr><td style="width:26px;padding:19px 13px 16px 0;vertical-align:top;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${meta.color};"></span></td><td style="padding:0 0 16px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2b3040;border-radius:12px;background:#121724;"><tr><td style="padding:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="color:#e9eaee;font-size:15px;font-weight:700;line-height:21px;">${escapeHtml(step.title)}</td><td align="right" style="color:${meta.color};font-size:11px;line-height:16px;white-space:nowrap;">${escapeHtml(meta.label)}</td></tr></table><p style="margin:7px 0 0;color:#9aa1b0;font-size:14px;line-height:21px;">${escapeHtml(step.description)}</p></td></tr></table></td></tr>`;
    }),
    ...(blueprint.exceptions.length > 0
      ? [
          `<tr><td style="width:26px;padding:17px 13px 16px 0;vertical-align:top;"><span style="display:inline-block;width:9px;height:9px;background:#d9a23b;transform:rotate(45deg);"></span></td><td style="padding:0 0 16px;vertical-align:top;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #795f2f;border-radius:12px;"><tr><td style="padding:16px;">${sectionLabel("exception path")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bulletList(blueprint.exceptions, "None identified yet")}</table></td></tr></table></td></tr>`,
        ]
      : []),
    `<tr><td style="width:26px;padding:3px 13px 0 0;vertical-align:top;"><span style="display:inline-block;width:10px;height:10px;border:2px solid #4cc27e;border-radius:50%;background:#0c0f16;"></span></td><td style="padding:0;vertical-align:top;">${sectionLabel("output")}<p style="margin:-6px 0 0;color:#e9eaee;font-size:14px;line-height:21px;">${blueprint.outputs.map(escapeHtml).join(" &middot; ")}</p></td></tr>`,
  ].join("");

  const inputs = blueprint.inputs
    .map(
      (input) =>
        `<span style="display:inline-block;margin:0 7px 8px 0;padding:6px 11px;border:1px solid #343a4a;border-radius:999px;color:#e9eaee;font-size:13px;line-height:18px;">${escapeHtml(input)}</span>`
    )
    .join("");

  const integrations = blueprint.integrations
    .map(
      (integration) =>
        `<tr><td style="width:34%;padding:0 14px 12px 0;color:#e9eaee;font-size:14px;font-weight:700;line-height:20px;vertical-align:top;">${escapeHtml(integration.name)}</td><td style="padding:0 0 12px;color:#9aa1b0;font-size:14px;line-height:20px;vertical-align:top;">${escapeHtml(integration.role)}</td></tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(blueprint.name)}</title></head>
<body style="margin:0;padding:0;background:#080a0f;color:#e9eaee;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080a0f;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#0c0f16;border:1px solid #232836;border-radius:18px;overflow:hidden;">
      <tr><td style="padding:28px 28px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="color:#ea4b71;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(options.brandName)}</td>
          <td align="right" style="color:#9aa1b0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Blueprint ready</td>
        </tr></table>
        <h1 style="margin:24px 0 0;color:#ffffff;font-size:30px;line-height:36px;letter-spacing:-0.7px;">${escapeHtml(heading)}</h1>
        <p style="margin:10px 0 0;color:#b9bec9;font-size:15px;line-height:23px;">${escapeHtml(intro)}</p>
      </td></tr>
      <tr><td style="padding:12px 28px 0;">${sectionLabel("the problem")}<p style="margin:0;color:#e9eaee;font-size:15px;line-height:23px;">${escapeHtml(blueprint.problem)}</p></td></tr>
      <tr><td style="padding:28px 28px 0;">${sectionLabel("how it runs")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${workflowRows}</table></td></tr>
      <tr><td style="padding:28px 28px 0;">${sectionLabel("workflow step · AI reasoning · human approval")}</td></tr>
      <tr><td style="padding:22px 28px 0;">${sectionLabel("inputs it needs")}<div>${inputs}</div></td></tr>
      <tr><td style="padding:20px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2b3040;border-radius:14px;background:#121724;"><tr><td style="padding:20px;">
          ${sectionLabel("estimated impact")}
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:29px;">${escapeHtml(estimatedImpact)}</p>
          <p style="margin:2px 0 0;color:#9aa1b0;font-size:13px;line-height:19px;">${escapeHtml(estimatedImpactNote)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr><td style="width:50%;vertical-align:top;">${sectionLabel("complexity")}<p style="margin:-6px 0 0;color:#e9eaee;font-size:14px;font-weight:700;">${COMPLEXITY_LABEL[blueprint.complexity]}</p></td><td style="width:50%;vertical-align:top;">${sectionLabel("difficulty")}<p style="margin:-6px 0 0;color:#e9eaee;font-size:14px;font-weight:700;">${DIFFICULTY_LABEL[blueprint.difficulty]}</p></td></tr></table>
          <div style="margin-top:18px;padding-top:16px;border-top:1px solid #2b3040;">${sectionLabel("recommended stack")}<p style="margin:-6px 0 0;color:#e9eaee;font-size:14px;font-weight:700;line-height:21px;">${blueprint.integrations.map((integration) => escapeHtml(integration.name)).join(" &middot; ")}</p></div>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:28px 28px 0;">${sectionLabel("what each tool does")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${integrations}</table></td></tr>
      <tr><td style="padding:16px 28px 0;">${sectionLabel("assumptions")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${bulletList(blueprint.assumptions, "None recorded")}</table></td></tr>
      <tr><td style="padding:24px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2b3040;border-radius:14px;background:#121724;"><tr><td style="padding:20px;">
          <p style="margin:0;color:#ffffff;font-size:15px;font-weight:700;line-height:22px;">Your n8n starter is attached.</p>
          <p style="margin:6px 0 0;color:#9aa1b0;font-size:14px;line-height:21px;">Import <strong style="color:#e9eaee;">${escapeHtml(options.workflowFilename)}</strong> into n8n, add your own credentials, review every field marked SETUP, test it, and activate it only when you are ready.</p>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:22px 28px 30px;color:#6f7787;font-size:11px;line-height:18px;">Requested ${escapeHtml(capturedLabel)} UTC<br>Designed by an n8n AI Agent. Figures are estimates, not measurements.</td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
}

const config = $('Configuration').first().json;
const ownerEmail = String(config.ownerEmail || '').trim().toLowerCase();
if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(ownerEmail) || ownerEmail === 'you@example.com') {
  throw new Error('Set ownerEmail in the Configuration node before delivering blueprints.');
}

const item = $input.first().json;
const capturedAt = item.capturedAt || new Date().toISOString();
const html = blueprintToEmailHtml(item.blueprint, {
  action: 'send-blueprint',
  firstName: item.contact.firstName,
  email: item.contact.email,
  workflowFilename: item.workflowFilename,
  capturedAt: capturedAt,
  brandName: String(config.brandName || 'Automation Blueprint'),
});

return [{
  json: Object.assign({}, item, {
    capturedAt: capturedAt,
    html: html,
    recipient: item.contact.email,
    ownerEmail: ownerEmail,
    senderName: String(config.senderName || 'Automation Blueprints'),
    subject: 'Your automation blueprint + n8n workflow: ' + item.blueprint.name,
  }),
}];
