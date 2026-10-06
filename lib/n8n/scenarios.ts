import type { AutomationBlueprint, QuickReply } from "./types";

/**
 * Deterministic demo scenarios.
 *
 * Internal note: these scripts produce realistic but pre-authored agent
 * behavior so live demonstrations never depend on an external service.
 * The audience-facing UI never labels them as demo data.
 */

export interface ScenarioQuestion {
  message: string;
  quickReplies?: QuickReply[];
}

export interface DemoScenario {
  id: string;
  /** Lower-cased keywords matched against the visitor's first message. */
  keywords: string[];
  questions: ScenarioQuestion[];
  revealMessage: string;
  blueprint: AutomationBlueprint;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "gmail-enquiries-to-sheet",
    keywords: ["email", "gmail", "inbox", "enquir", "inquir", "excel", "spreadsheet", "copy", "paste"],
    questions: [
      {
        message: "How do those enquiries usually arrive?",
        quickReplies: [
          { label: "Gmail", value: "Gmail" },
          { label: "Outlook", value: "Outlook" },
          { label: "A website form", value: "A website form" },
          { label: "Multiple sources", value: "Multiple sources" },
        ],
      },
      {
        message:
          "Got it. What do you need captured from each enquiry — and where should it end up?",
        quickReplies: [
          { label: "Name, need, contact → Google Sheets", value: "Name, what they need, and contact details, into Google Sheets" },
          { label: "Everything → Excel", value: "The whole message into Excel" },
        ],
      },
    ],
    revealMessage:
      "That's everything I need. This is a classic extract-and-route pattern — here's the automation I'd build.",
    blueprint: {
      name: "Inbox-to-Sheet Autopilot",
      problem:
        "Customer enquiries arrive by email and are copied into a spreadsheet by hand every morning — slow, error-prone, and easy to miss one.",
      trigger: "New email arrives in the enquiries inbox",
      inputs: ["Sender name and address", "Enquiry text", "Date received"],
      steps: [
        {
          title: "Gmail Trigger",
          description: "Watches the inbox and fires the moment an enquiry lands — no more morning batch job.",
          kind: "deterministic",
        },
        {
          title: "Filter enquiries",
          description: "Deterministic rules skip newsletters, receipts and internal mail.",
          kind: "deterministic",
        },
        {
          title: "AI extraction",
          description: "An AI step reads the messy email body and pulls out name, request, urgency and contact details as clean fields.",
          kind: "ai",
        },
        {
          title: "Confidence check",
          description: "If the AI is unsure about any field, the enquiry is routed to a human instead of being written blind.",
          kind: "human",
        },
        {
          title: "Append to Google Sheets",
          description: "Clean rows are appended to the tracking sheet with a timestamp.",
          kind: "deterministic",
        },
        {
          title: "Confirmation",
          description: "A short summary is sent back to you so nothing lands unseen.",
          kind: "deterministic",
        },
      ],
      integrations: [
        { name: "Gmail", role: "Enquiry source and confirmation channel" },
        { name: "n8n AI Agent", role: "Reads unstructured email text into structured fields" },
        { name: "Google Sheets", role: "System of record for enquiries" },
      ],
      exceptions: [
        "Emails the AI cannot confidently parse are flagged for human review, never guessed.",
        "Duplicate enquiries from the same sender within 24h are merged, not double-logged.",
      ],
      outputs: ["Structured row per enquiry in Google Sheets", "Daily summary email"],
      complexity: "beginner",
      difficulty: "easy",
      estimatedHoursSavedPerWeek: 5,
      assumptions: [
        "Enquiries arrive in one shared inbox",
        "Google Workspace account available for Sheets",
      ],
    },
  },
  {
    id: "friday-invoice-reconciliation",
    keywords: ["invoice", "reconcil", "friday", "accounting", "xero", "quickbooks", "statement", "payment"],
    questions: [
      {
        message: "Where do the invoices live, and what are you reconciling them against?",
        quickReplies: [
          { label: "Email PDFs vs bank statement", value: "PDF invoices arrive by email and I check them against the bank statement" },
          { label: "Accounting software vs spreadsheet", value: "Invoices in accounting software checked against a spreadsheet" },
        ],
      },
      {
        message: "And what happens when something doesn't match — who needs to know?",
        quickReplies: [
          { label: "I fix it myself", value: "I investigate and fix mismatches myself" },
          { label: "Finance team is alerted", value: "The finance team should be alerted" },
        ],
      },
    ],
    revealMessage:
      "Perfect — reconciliation is mostly deterministic matching, with AI only where documents get messy. Here's the design.",
    blueprint: {
      name: "Friday Reconciliation Robot",
      problem:
        "Every Friday, invoices are manually checked line-by-line against payment records — hours of repetitive matching with real cost when a mismatch slips through.",
      trigger: "Schedule: every Friday at 8:00 AM (or on new invoice arrival)",
      inputs: ["Invoice PDFs / records", "Payment or bank statement export", "Supplier list"],
      steps: [
        {
          title: "Schedule Trigger",
          description: "Runs the reconciliation automatically before you start your Friday.",
          kind: "deterministic",
        },
        {
          title: "Collect documents",
          description: "Pulls the week's invoices and the latest payment export.",
          kind: "deterministic",
        },
        {
          title: "AI document reading",
          description: "AI extracts invoice number, amount, supplier and date from PDFs that don't follow a template.",
          kind: "ai",
        },
        {
          title: "Deterministic matching",
          description: "Exact rules match invoices to payments by number and amount — no AI guessing on money.",
          kind: "deterministic",
        },
        {
          title: "Human review of mismatches",
          description: "Only the exceptions land on a human desk, with the AI's best explanation attached.",
          kind: "human",
        },
        {
          title: "Reconciliation report",
          description: "A summary of matched, unmatched and flagged items is delivered to the team.",
          kind: "deterministic",
        },
      ],
      integrations: [
        { name: "Email / Drive", role: "Invoice intake" },
        { name: "n8n AI Agent", role: "Reads non-standard invoice PDFs" },
        { name: "Spreadsheet / Accounting API", role: "Payment records source" },
        { name: "Slack or Email", role: "Mismatch alerts and weekly report" },
      ],
      exceptions: [
        "Amount mismatches are never auto-resolved — always escalated with context.",
        "Unreadable documents are queued for human handling.",
      ],
      outputs: ["Weekly reconciliation report", "Mismatch alerts with context"],
      complexity: "intermediate",
      difficulty: "moderate",
      estimatedHoursSavedPerWeek: 4,
      assumptions: [
        "Payment data can be exported or reached via API",
        "Invoices arrive digitally (email or shared folder)",
      ],
    },
  },
  {
    id: "website-leads-to-crm",
    keywords: ["lead", "crm", "website", "form", "hubspot", "salesforce", "pipedrive", "contact", "sales"],
    questions: [
      {
        message: "Where do the leads come from today, and which CRM should they land in?",
        quickReplies: [
          { label: "Website form → HubSpot", value: "Website form leads going into HubSpot" },
          { label: "Several sources → one CRM", value: "Leads from several sources going into one CRM" },
        ],
      },
      {
        message:
          "Should every lead go straight in, or do you want them qualified and routed first?",
        quickReplies: [
          { label: "Qualify + route", value: "Qualify them and route hot leads to sales immediately" },
          { label: "Just log them all", value: "Log everything, no qualification" },
        ],
      },
    ],
    revealMessage:
      "Great — that's a capture-enrich-route pattern. Here's the automation, with AI only where judgment is needed.",
    blueprint: {
      name: "Lead Flow Fastlane",
      problem:
        "Website leads are re-typed into the CRM by hand, so hot leads wait hours — or get lost — before anyone follows up.",
      trigger: "New form submission on the website",
      inputs: ["Form fields (name, email, company, message)", "Source page / campaign"],
      steps: [
        {
          title: "Webhook Trigger",
          description: "The website form posts straight into n8n the second a lead submits.",
          kind: "deterministic",
        },
        {
          title: "Validate & dedupe",
          description: "Deterministic checks reject spam and merge repeat submissions.",
          kind: "deterministic",
        },
        {
          title: "AI qualification",
          description: "AI reads the free-text message and scores intent: hot, warm, or informational.",
          kind: "ai",
        },
        {
          title: "Create CRM record",
          description: "Lead is created in the CRM with score, source and campaign attached.",
          kind: "deterministic",
        },
        {
          title: "Hot-lead handoff",
          description: "Hot leads ping the sales channel instantly; a human decides whether to call.",
          kind: "human",
        },
        {
          title: "Acknowledgement",
          description: "The lead gets an immediate, personalised acknowledgement email.",
          kind: "deterministic",
        },
      ],
      integrations: [
        { name: "Website form / Webhook", role: "Lead capture" },
        { name: "n8n AI Agent", role: "Scores lead intent from free text" },
        { name: "CRM (HubSpot / Pipedrive)", role: "System of record" },
        { name: "Slack / Email", role: "Instant sales alerts" },
      ],
      exceptions: [
        "Suspected spam is quarantined for review, never silently deleted.",
        "CRM API failures queue the lead and retry — nothing is dropped.",
      ],
      outputs: ["CRM record with score and source", "Instant sales alert for hot leads"],
      complexity: "beginner",
      difficulty: "easy",
      estimatedHoursSavedPerWeek: 3,
      assumptions: [
        "The website form can POST to a webhook (most builders can)",
        "CRM has API access on the current plan",
      ],
    },
  },
];

/** Generic fallback used when no scenario matches the visitor's task. */
export const GENERIC_QUESTIONS: ScenarioQuestion[] = [
  {
    message:
      "What kicks this task off — does something arrive (an email, a file, a message), or do you just do it at a set time?",
    quickReplies: [
      { label: "Something arrives", value: "It starts when something arrives" },
      { label: "Set time / schedule", value: "I do it at a set time" },
      { label: "Someone asks me", value: "It starts when someone asks me" },
    ],
  },
  {
    message: "And where does the finished result need to end up?",
    quickReplies: [
      { label: "Spreadsheet", value: "A spreadsheet" },
      { label: "Email to someone", value: "An email to someone" },
      { label: "Another app / system", value: "Another app or system" },
    ],
  },
  {
    message:
      "Last one: does this need judgment calls (reading messy text, deciding priorities), or is it the same steps every time?",
    quickReplies: [
      { label: "Needs judgment", value: "It needs judgment calls" },
      { label: "Same steps every time", value: "It is the same steps every time" },
    ],
  },
];

export function buildGenericBlueprint(
  firstMessage: string,
  answers: string[]
): AutomationBlueprint {
  const lowerAnswers = answers.join(" ").toLowerCase();
  const scheduled = lowerAnswers.includes("set time");
  const needsAi = !lowerAnswers.includes("same steps");
  const trigger = scheduled
    ? "Schedule trigger at your chosen time"
    : "Event trigger when the work item arrives";

  const steps = [
    {
      title: scheduled ? "Schedule Trigger" : "Event Trigger",
      description: scheduled
        ? "n8n starts the run automatically at your set time."
        : "n8n reacts the moment the item arrives — no polling by hand.",
      kind: "deterministic" as const,
    },
    {
      title: "Collect inputs",
      description: "Gathers the data the task needs from its source system.",
      kind: "deterministic" as const,
    },
    ...(needsAi
      ? [
          {
            title: "AI reasoning step",
            description:
              "An AI step handles the judgment part — reading unstructured input and deciding what it means.",
            kind: "ai" as const,
          },
          {
            title: "Human checkpoint",
            description:
              "Anything the AI is unsure about is routed to you for a quick approve/reject.",
            kind: "human" as const,
          },
        ]
      : [
          {
            title: "Apply your rules",
            description:
              "Your steps are encoded as deterministic workflow logic — same result every run, no AI needed.",
            kind: "deterministic" as const,
          },
        ]),
    {
      title: "Deliver the result",
      description: "The output is written to its destination and a confirmation is sent.",
      kind: "deterministic" as const,
    },
  ];

  return {
    name: "Custom Task Autopilot",
    problem: firstMessage.slice(0, 500),
    trigger,
    inputs: ["The task's source data", "Your business rules"],
    steps,
    integrations: [
      { name: "n8n", role: "Orchestrates the whole flow" },
      ...(needsAi
        ? [{ name: "n8n AI Agent", role: "Handles the judgment steps only" }]
        : []),
      { name: "Your destination app", role: "Receives the finished result" },
    ],
    exceptions: [
      "Unexpected input formats are routed to a human instead of failing silently.",
    ],
    outputs: ["Completed task delivered to its destination", "Run confirmation"],
    complexity: needsAi ? "intermediate" : "beginner",
    difficulty: needsAi ? "moderate" : "easy",
    estimatedHoursSavedPerWeek: null,
    assumptions: [
      "Source and destination systems are reachable by n8n (API, email, or file)",
      "Estimate of time saved needs a quick conversation about volumes",
    ],
  };
}

export function matchScenario(firstMessage: string): DemoScenario | null {
  const lower = firstMessage.toLowerCase();
  let best: { scenario: DemoScenario; hits: number } | null = null;
  for (const scenario of DEMO_SCENARIOS) {
    const hits = scenario.keywords.filter((k) => lower.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { scenario, hits };
    }
  }
  return best?.scenario ?? null;
}
