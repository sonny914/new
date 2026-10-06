# Ticket aging export: what to ask for and how to read it

## What to ask for

One spreadsheet, one row per ticket, covering every ticket from the last 90 days plus everything still open. The template is `02-ticket-aging-export-template.csv`. Most OFS back-office systems (QuickBooks with a ticket add-on, ops-flo, Alpine, FieldCap, spreadsheets) can export these columns or something close. Accept whatever they have; map it afterwards.

Say: "Whatever you can pull in ten minutes. If a column is missing, leave it blank. Operator names can be replaced with A, B, C if you prefer."

## The columns

| Column | Why it matters |
|---|---|
| ticket_id | Join key |
| operator | The chase is per counterparty; every stat is cut by operator |
| ticket_date | Day the work happened |
| signed_date | Day the company man signed. Blank means unsigned |
| submitted_date | Day the invoice went into the portal |
| approved_date | Day the operator approved in the portal |
| paid_date | Day cash landed |
| amount | Dollars at risk per stage |
| status | open / approved / paid / disputed / rejected |
| dispute_reason | Free text; this becomes the pattern library |
| portal | OpenInvoice / Cortex / Ariba / email / other |

## The four stages

Every elapsed day lands in exactly one of these. The question the whole wedge hangs on is which stage holds the days.

| Stage | From | To | Who owns the delay | Chaseable by an office desk? |
|---|---|---|---|---|
| A. Field signature | ticket_date | signed_date | company man, crew | Partly (text the company man; escalate to his supervisor) |
| B. Office submission | signed_date | submitted_date | supplier's own billing | Yes, fully |
| C. Operator approval | submitted_date | approved_date | operator approver | Yes: this is the chase |
| D. Payment terms | approved_date | paid_date | operator AP, contract terms | No |

## The read

For each operator and in total, compute median and 90th-percentile days in each stage, the count and dollars of tickets currently sitting in each stage, and the share of tickets with any dispute or rejection.

Then answer three questions:

1. **Where do the days go?** If stages B and C hold most of the elapsed time, the loop is chaseable and the wedge lives. If stage D dominates, the delay is contractual and the right product is factoring, not chasing. If stage A dominates, the delay is physical and an office desk cannot reach it.
2. **Which operator is the problem?** Usually one or two operators account for most of stage C. That is where the pilot focuses.
3. **What are the disputes about?** Group the dispute reasons. Coding errors, missing attachments and rate mismatches are preventable before submission; those are the quickest wins in a pilot.

## Kill thresholds from this data

- Stage D holds 70%+ of elapsed days across operators: kill criterion 2 (the delay is contractual).
- Stage A holds 50%+ of stalled tickets: kill criterion 3 (the delay is physical).
- Dollars sitting in stages B and C under 5% of trailing 90-day revenue: the problem is too small for this supplier to pay for.

## Output

The one-page audit in `05-ticket-to-cash-audit.md` is built entirely from this read. Send it back within three days of receiving the export. Speed is the first demonstration of the service.
