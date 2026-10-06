# Pilot ledger: the touch log and the Friday report

The ledger is the only system the pilot has. It is a spreadsheet. Template: `04-pilot-ledger-template.csv`. One row per action taken on a ticket. Never edit a row; add a new one. On day 30 this file is the evidence for gate criterion 3 (does the pattern repeat?) and the raw material for anything that might one day be built.

## Columns

| Column | Fill with |
|---|---|
| timestamp | Date and time of the action |
| customer | Which pilot supplier |
| ticket_id | From their export |
| operator | Counterparty |
| stage | A signature / B submission / C approval / D payment |
| action | resend / text / call / portal_update / dispute_response / escalate / match_remittance / note |
| channel | portal / email / sms / phone / in_person |
| counterparty_person | Role, not name, in the shared copy (company man, approver, AP clerk, field supervisor) |
| what_was_asked | One line |
| result | no_reply / committed_date / signed / approved / rejected / paid / referred_to_customer |
| committed_date | If the counterparty promised a date |
| days_open_at_action | Days since the ticket entered its current stage |
| blocker_reason | Free text; this is the pattern library |
| minutes_spent | Honest |
| next_action_date | When this ticket is touched again |

## The daily block

Thirty minutes, same time each day, both customers.

1. Sort the ledger by next_action_date. Work everything due today.
2. Check each portal for status changes since yesterday; log each change as a portal_update row even if no action was needed.
3. New stalled tickets (crossed the stage threshold: 3 days in B, 7 days in C): first touch, log it.
4. Anything in Section 2 of the authorisation (price, scope, terms) goes to the customer's designated contact, logged as referred_to_customer.

## Escalation ladder (default; adjust per operator after week one)

| Stage | Day 0 | Day 3 | Day 7 | Day 14 |
|---|---|---|---|---|
| A signature | text company man with ticket image | second text + call | customer's ops lead asks field supervisor | referred_to_customer |
| B submission | submit (customer's own job: prompt them) | prompt again | referred_to_customer | |
| C approval | portal status check | email approver with one-line summary and ticket link | call approver; ask for a date | escalate to operator's stated path; referred_to_customer |
| D payment | nothing (not chaseable) | | AP status check if past terms | referred_to_customer |

## The Friday report (one page, every Friday, both customers)

Send by 5pm. Format:

**[Customer] ticket-to-cash, week of [date]**

| Operator | Open tickets | $ in A | $ in B | $ in C | $ in D | Median days in C (this week / baseline) | Approved this week | Paid this week |
|---|---|---|---|---|---|---|---|---|

**Moved this week.** Three to five lines: tickets that got signed, approved or paid because of a touch, with the touch that did it.

**Stuck.** Up to five tickets, each with operator, days open, last action, and what is needed from the customer.

**Pattern note.** One or two sentences on what keeps recurring (an operator that never approves without a PO number on the ticket; a company man who only signs on Thursdays). This is the paragraph that becomes software, if anything does.

## Day-30 read

From the ledger:

- Stage C median days, pilot weeks versus the baseline from the export. Gate criterion 2 needs 20% better.
- Count distinct blocker_reason values and how many tickets each covers. If the top five reasons cover 70%+ of touches across both customers, the pattern repeats (criterion 3). If every ticket has its own story, it does not, and QB has described a staffing agency.
- Minutes per ticket moved. This is the cost side of any future price.
