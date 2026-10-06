# Submission sheet: Blueprint delivery

Submit after the discovery agent template is approved (new creators get one
template in review at a time).

## Files

| What | File |
|---|---|
| Workflow upload | `blueprint-delivery.json` |
| Description (paste as-is) | `blueprint-delivery.md` |
| Test payload (do not upload) | `blueprint-delivery.sample-request.json` |

## Title

Email HTML automation blueprints with n8n workflow attachments via Gmail

## Category

Sales / lead generation first, then email or marketing if offered. Free.

## Test before submitting (about 10 minutes)

1. Import `blueprint-delivery.json` into n8n (Workflows > Create > ⋯ > Import from File).
2. Check the canvas: yellow overview top-left, red warning over the webhook, three white sections.
3. **Configuration** node: set `ownerEmail` to your inbox.
4. Both Gmail nodes: select your Gmail credential.
5. **Lead Webhook**: create a Header Auth credential, Name `x-webhook-secret`, any value.
6. In `blueprint-delivery.sample-request.json`, change `email` to an inbox you own.
7. Click **Execute workflow**, then from the `n8n/templates` folder in PowerShell run:

   ```powershell
   curl.exe -X POST "https://YOUR-INSTANCE.app.n8n.cloud/webhook-test/blueprint-delivery" `
     -H "Content-Type: application/json" `
     -H "x-webhook-secret: YOUR-VALUE" `
     --data "@blueprint-delivery.sample-request.json"
   ```

8. Expect `{"ok":true,"action":"send-blueprint",...}` and an email with
   `email-enquiries-to-excel.json` attached, BCC'd to you.
9. Screenshot the canvas and the received email for the description.
10. Close without exporting. Submit the repo file, not a re-export (a re-export
    writes your credential names and IDs back into the JSON).

## After the discovery agent is approved

- In `blueprint-delivery.md`, turn the template name under **Works with** into a
  link to its n8n.io page, then run `npm run templates:build`.
- Optionally edit the approved discovery agent description to link back here
  (keep its overview sticky under 300 words; it is at 269).
