Email an HTML automation blueprint to a lead with a ready-to-import n8n workflow attached, and get a copy yourself for follow-up.

## Who's it for

Consultants and agencies who generate reports or automation plans in a web app.

## How it works

1. A webhook receives the recipient, an HTML report, a Markdown copy and an n8n workflow JSON string.
2. A Code node validates every field, sanitizes the HTML and picks the recipient.
3. The workflow JSON is checked to be valid and inactive, then attached as a file.
4. `send-blueprint` emails the visitor and BCCs you. `build-request` goes only to you.
5. The webhook returns a clear success or error.

## Setup

Takes about 10 minutes.

1. In the Configuration node, set `ownerEmail` and `senderName`.
2. Add a Gmail OAuth2 credential to both Gmail nodes.
3. On the webhook, create a Header Auth credential (for example `x-webhook-secret`).
4. POST a test request with `action`, `firstName`, `email`, `blueprintName`, `blueprintMarkdown`, `blueprintHtml` and `workflowJson`.

## Requirements

- Gmail account
- A backend that builds the HTML with every value escaped. Never call this webhook from a browser: the Code node strips scripts and forms, but your server is the real safeguard.

## Works with

Pairs with the "Turn repetitive tasks into n8n automation blueprints with a Claude discovery agent" template. Render its blueprint JSON as HTML on your server, then post it here.

## How to customize the workflow

Swap the Gmail nodes for Outlook or SMTP, add a CRM step after the owner email, or change the subject lines in the Validate + Format Lead node.
