# Quiet Bands — Wedge Hunt

**Research only. No product designed, no code written.**
Prepared 2026-10-06 for the Quiet Bands "attack the economics" review.

---

## 0. Read this first: how to trust this document

**What was done.** Seven parallel research passes covered commercial real estate and property operations; construction, trades and restoration; logistics and supply chain; healthcare administration; professional services and finance; field services, hospitality and non-obvious industries; and the agentic-software landscape plus QB's own three ideas. Roughly 150 web searches were run. Every candidate workflow was scored on the same twelve dimensions, then re-normalised by one reviewer so the scores are comparable across passes.

**What could not be done.** Every attempt to open a web page was blocked by the session's network policy. Every claim below therefore rests on search-result snippets (titles, URLs, excerpts), not on opened pages. Consequences:

- Dates are publication dates where the snippet showed one, otherwise "accessed 2026-10-06".
- Vendor pricing is mostly `[UNVERIFIED]`.
- Claims drawn from training knowledge rather than a surfaced source are tagged `[UNVERIFIED this session]`.
- Four names from the ChatGPT brief could not be found at all: Tellora, Regather, SOYL, PAIVUS. Treat them as `[UNVERIFIED – existence not confirmed]`.
- The 2026 oil price environment, which matters for the number-one recommendation, was not researched: `[UNKNOWN]`.

Nothing in this document should be treated as a fact to build on until the cited source has been opened and read. The right next step for each finalist is a human conversation, not a search.

**Notation.** `P` pain, `F` frequency, `$` financial consequence, `M` manual coordination burden, `X` agent executability, `V` outcome verifiability, `I` incumbent weakness (10 = weak), `G` integration ease (10 = easy), `C` compliance and liability (10 = low risk), `S` sales cycle (10 = short), `H` buyer accessibility for a two-person Houston studio, `W` realistic willingness to pay. Maximum 120. Where an incumbent already ships the same agentic loop, `I` was cut to 1–4 and the total falls with it; the raw pass score is shown alongside so the penalty is visible.

---

## 1. Market map

### 1.1 The shape of the market in one paragraph

Every funded "agent that chases an outside party" company in 2026 owns exactly one loop, in one vertical, against one counterparty type, sells to mid-market or enterprise, and earns its margin on the verification step rather than on sending messages. Tennr owns fax-to-first-visit for provider groups ($101M Series C, 2025-06-19). Infinitus owns payer phone calls (4M+ calls, Series C 2024-10-23). HappyRobot owns carrier calls for enterprise logistics ($44M Series B 2025-09-03; $150M Series C Aug 2026 `[secondary]`). Jones owns certificate-of-insurance chasing for real estate ($15M Series B 2025-01-07). Zip and Tonkean own procurement intake ($190M Series D; Tonkean acquired by Coupa May 2026). Nobody has built the horizontal small-business version, and the one well-regarded horizontal human-in-the-loop agent builder, Relay.app, announced its shutdown on 2026-07-16. Gartner estimated that "only about 130 of the thousands of agentic AI vendors are real" (2025-06-25). BCG's 2026 tech-procurement study found that respondents report "high levels of internal value more frequently than high levels of external value" for supplier-facing use cases, so the outside half of the loop is where realised value lags, which is both the hole and the reason it is hard.

### 1.2 Where incumbents already ship the agentic loop (red zones: do not enter)

| Zone | Who ships it | Evidence |
|---|---|---|
| Multifamily make-ready, resident and vendor work orders | RealPage AI Facilities Agent, Entrata 100+ agents, AppFolio Realm-X, Buildium Lumina, Yardi Virtuoso | Entrata PR 2026-03-24; AppFolio–Claude connector June 2026; RealPage `[UNVERIFIED this session]` |
| HOA violations and architectural review | Vantaca HOAi | pass report, accessed 2026-10-06 |
| Vendor COI tracking (CRE, construction) | Jones, myCOI/illumend, bcs RiskBot, TrustLayer, Certificial, RealPage Vendor Credentialing | Jones PR 2025-01-07; bcs RiskBot Mar 2025 |
| Construction submittals, RFIs, daily logs | Procore agents (Groundbreak Oct 2025; expanded 2026-05-21) | ENR May 2026 |
| Permits and inspection scheduling | PermitFlow ($54M Series B 2025-12-02, voice agent calls to schedule inspections), Pulley | PermitFlow PR 2025-12-02 |
| Construction material expediting | Kojo, Wesco ($10M, 2025-09-17), StructShare | Wesco PR 2025-09-17 |
| Lender draws and pay apps | Rabbet, Built, Siteline | Rabbet 2025 report |
| SMB purchase-order confirmation and expediting | SourceDay Open Order Chaser, PO Delivery and PO Change agents (mid-2026) | pass report, accessed 2026-10-06 |
| Freight quote-to-book, carrier check calls, appointment setting | Vooma, HappyRobot, Parade (acquired by Mudflap Apr 2026) | dcvelocity; tech.eu 2025-09-03; FreightWaves 2026 |
| Freight claims (OS&D) | Freehand ($75M Series B, Manifest 2026), FreightClaims.com | pass report |
| Prior authorisation | Cohere, Latent ($80M Mar 2026), Rhyme, Infinitus; CMS-0057-F effective 2026-01-01 | pass report |
| Specialty referral intake | Tennr, Assort Health ($120M Series C; Referrals agent GA 2026-08-13), Linear Health | Endpoints 2025-07; Assort 2026-08-13 |
| DME physician documentation | Parachute Health AI Intake (3,000+ supplier locations) | parachutehealth.com, accessed 2026-10-06 |
| Provider credentialing and payer enrollment | Medallion, Verifiable, CertifyOS, Assured | Medallion 2025 report |
| Medical records retrieval | Datavant, Verisma Retrieval IQ (2026-04-29), MRO | pass report |
| Title and escrow payoffs, HOA estoppels | Qualia Clear 2.0 (Sept 2025); Rexera acquired by RealPage 2025-07-29 | pass report |
| Audit request lists and confirmations | Fieldguide Request Agent (Spring 2026), Suralink, DataSnipper, Confirmation.com | suralink.com, accessed 2026-10-06 |
| CPA tax-season document chasing | TaxDome Atlas (Spring 2026), Liscio, CallSphere, Content Snare | pass report |
| Fleet third-party repair approvals | Fleetio Service Advisor, Motive Maintenance AI, Fleet Rabbit | fleetio.com, accessed 2026-10-06 |
| Oil and gas owner-relations enquiries | Firm.app (131,000+ owner accounts), MineralAnswers, Enverus | firm.app, accessed 2026-10-06 |
| Self-storage lien notices | QuikStor (Apr 2026), Storable, Ai Lean | pass report |
| Home-services inbound calls and booking | Podium AI Operating System (2026-08-27), ServiceTitan, Housecall Pro, Jobber, Avoca | Morningstar/PR Newswire 2026-08-27 |
| Founder-led AI CRM (QB idea B) | Ahoy (launched 2026-07-08), Day.ai, Attio, Clarify, Zero, HubSpot Breeze, Agentforce SDR | ahoy.ai, accessed 2026-10-06 |

### 1.3 Where incumbents are reminder-only or enterprise-only (yellow zones)

Lien waivers (Levelset, GCPay, Textura, Siteline validate; none own the lower-tier chase at SMB price). Change orders (Clearstory, Briq Otto, Procore). Closeout documents (Pype, now locked in the Autodesk bundle; Procore has no closeout agent). Insurance agency renewal data (Applied Epic Conductor, Sept 2026, runs submissions but has not been shown chasing insureds or requesting loss runs; Zywave agents are prospecting). Commercial loan closing conditions (nCino Loan PreCheck June 2026, Casca). Covenant collection (Abrigo, Baker Hill, Teslar ticklers). Facilities work orders below enterprise scale (ServiceChannel's Summer 2026 agents "recommend next steps for stalled work orders"; Lessen's Aiden Outreach chases quotes only inside Lessen's network). Pass-through grant compliance (Instrumentl, Bonterra checklists). Hotel banquet event order changes (Cvent BEO Uploader 2025-03-12 versions the document, does not confirm vendors). 811 locate tickets (811spotter, Utilocate, SiteRight monitor; chase to utilities stays phone-based).

### 1.4 Where nobody owns the loop (green zones)

The pattern that survived every pass: **a smaller supplier or provider must get a larger counterparty to sign, approve, or pay, and the counterparty's system is built for the counterparty, not the supplier.** Specifically:

1. Oilfield-services suppliers getting a field ticket signed, invoiced through the operator's portal, and paid.
2. Home health and hospice agencies getting physicians to sign plans of care, interim orders and face-to-face attestations.
3. Commercial service contractors getting national-account clients to approve not-to-exceed proposals, close work orders and pay through ServiceChannel or Corrigo.
4. Restoration contractors getting carriers and third-party administrators to accept a claim file and pay.
5. General contractors getting subcontractors to deliver closeout documents so retainage releases.
6. Independent insurance agencies getting insureds and prior carriers to deliver renewal data and loss runs.
7. Auto dealers getting lenders and customers to clear stipulations so contracts in transit fund.
8. Small carriers getting shippers and brokers to pay detention.

Each is a single counterparty type, a binary verifiable artefact (signed, approved, posted, paid), a dollar consequence the buyer already feels every month, and an incumbent that is either on the other side of the table, enterprise-priced, or reminder-only.

### 1.5 Houston density by cluster

| Cluster | Houston anchor facts | Confidence |
|---|---|---|
| Oilfield services | Global OFS headquarters city; Enverus OpenInvoice is the dominant operator-side invoicing network; "almost all OFS companies [have] DSO > 45 days" (ops-flo, 2026) | medium `[vendor claim]` |
| Home health and hospice | 260 Medicare-certified home health agencies in Houston; Texas ~1,869–2,409 agencies (blackhealth.org; causeiq; healthcarecomps, accessed 2026-10-06); Texas Medical Center as counterparty density | medium |
| Commercial mechanical, electrical, plumbing | Dense base serving retail, QSR, grocery and healthcare national accounts | low (no count sourced) |
| Restoration | Cotton Holdings HQ Houston; Blackmon Mooring / BMS CAT Houston (~$322M revenue, ~1,000 employees, ZoomInfo estimate); Hurricane Beryl (Jul 2024) still driving roof work 2025–26 | medium |
| Construction | Harvey-Cleary ~$2B, Vaughn, SpawGlass, Linbeck, Arch-Con, Austin Commercial, Manhattan, McCarthy | medium |
| Property management | Asset Living HQ (446,427 units, 2026); Camden; Hines | medium |
| Auto retail | Group 1 Automotive HQ; top-5 US market | `[UNVERIFIED this session]` |
| Insurance agencies | IIAH; large independents (Bowen Miclette & Britt, Hotchkiss, Brady Chapman Holland, Dean & Draper) | `[UNVERIFIED this session]` |

---

## 2. Top 10 scored workflows

### 2.1 Scoreboard

| # | Workflow (stated as a workflow, not a category) | P | F | $ | M | X | V | I | G | C | S | H | W | **Total** | Pass raw |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | OFS supplier: field ticket signed → operator-portal invoice → approved → paid → short-pay reconciled | 9 | 10 | 9 | 9 | 6 | 9 | 6 | 5 | 8 | 7 | 10 | 6 | **94** | 94 |
| 2 | Home health (+ hospice): CMS-485 / interim order / F2F → physician signature chased → dated signature indexed → claim released | 9 | 9 | 8 | 9 | 8 | 9 | 7 | 5 | 5 | 7 | 9 | 7 | **92** | 92 |
| 3 | Commercial service contractor: NTE-exceed proposal → client approval → completion → within-NTE invoice → WO closure → remittance matched | 8 | 9 | 8 | 9 | 7 | 9 | 6 | 5 | 8 | 7 | 7 | 7 | **90** | 93 |
| 4 | Restoration mitigation: claim file assembled → carrier/TPA submission → RFIs answered → approval → paid → short-pays reconciled | 9 | 9 | 9 | 9 | 7 | 8 | 6 | 4 | 5 | 7 | 8 | 8 | **89** | 90 |
| 5 | GC: subcontractor closeout documents collected and validated → owner acceptance → retainage released | 8 | 5 | 8 | 9 | 8 | 8 | 7 | 6 | 8 | 6 | 7 | 7 | **87** | 87 |
| 6 | Commercial insurance agency: renewal data from insured + loss runs from prior carriers → complete submission before the 60-day mark | 8 | 9 | 7 | 9 | 7 | 8 | 4 | 5 | 6 | 6 | 8 | 7 | **84** | 85 |
| 7 | Auto dealer: contract in transit → lender stipulations → customer documents → re-submit → funded → CIT cleared | 7 | 9 | 7 | 8 | 7 | 10 | 6 | 5 | 4 | 6 | 7 | 7 | **83** | 84 |
| 8 | Small carrier / owner-operator fleet: detention event → timestamps assembled → claim filed with broker/shipper → paid | 8 | 8 | 7 | 8 | 7 | 8 | 6 | 6 | 8 | 6 | 7 | 5 | **82**| 85 |
| 9 | Roofing contractor: supplement assembled → carrier submission → adjuster follow-up → approved → paid | 8 | 9 | 9 | 8 | 6 | 8 | 4 | 4 | 3 | 7 | 8 | 8 | **80** | 82 |
| 10 | CRE owner/PM: third-party life-safety inspection → deficiency report → repair → AHJ/TDLR filing → certificate on file | 7 | 8 | 7 | 8 | 7 | 8 | 5 | 5 | 6 | 6 | 8 | 6 | **79** | 82 |

Normalisation notes: #1 executability cut from the pass score because the company-man signature is often physical and in the field; #3 incumbent weakness cut because ServiceChannel is adding stalled-work-order agents and contractor FSMs (BuildOps, ServiceTitan commercial) could extend; #4 compliance cut for Texas public-adjuster law; #6 incumbent weakness cut for Applied Epic Conductor (Sept 2026); #8 willingness-to-pay cut because small carriers are a notoriously cheap buyer and ELD vendors already produce the timestamps; #9 compliance kept at 3 for the same public-adjuster exposure; #10 incumbent weakness cut because contractor-side fire-protection FSMs (ServiceTrade, Inspect Point, Uptick) and AHJ portals (The Compliance Engine) already run deficiency outreach from the other side.

### 2.2 The ten, one by one

Each entry follows the required chain: trigger → steps → outside parties → current tools → failure point → consequence → current workaround → existing vendors → buyer → budget source → agent actions → human exception → proof of completion → plausible pricing. The three finalists (#1, #2, #3) get full deep dives in Section 4; here they are stated compactly so the ten can be compared on equal footing.

#### #1 — Oilfield-services supplier: field ticket → operator-portal invoice → paid (94)

- **Trigger.** Crew completes a job on an operator's lease (water hauling, rental equipment, wireline, roustabout, hot-shot, chemicals).
- **Steps.** Field ticket written → company man signs (paper or e-ticket) → office codes ticket to AFE/PO/cost centre → invoice built → submitted through the operator's invoicing portal (Enverus OpenInvoice dominant; Cortex, Ariba, Coupa at majors) → operator approver reviews → dispute or short-pay → re-submission → payment → remittance matched.
- **Outside parties.** Company man / consultant in the field, operator AP, operator approver, portal vendor.
- **Current tools.** Enverus OpenInvoice and OpenTicket (operator-side network; supplier pays a fee to submit) `[UNVERIFIED this session]`; FieldFX (ticket-to-invoice for OFS, now part of ServiceMax/PTC) `[UNVERIFIED this session]`; ops-flo, Alpine, Discovery Management, FieldCap, QuickBooks, spreadsheets.
- **Failure point.** Unsigned or disputed tickets stall invoices "for weeks" (ops-flo, 2026 `[vendor claim]`); invoice rejections for coding errors; nobody on the supplier side owns the chase from ticket to cash.
- **Consequence.** "Almost all OFS companies [have] DSO > 45 days" (ops-flo, 2026 `[vendor claim]`); suppliers factor receivables at 1.5–3% to bridge.
- **Current workaround.** Billing clerk logging into 3–8 operator portals daily; owner calls the company man; factoring.
- **Existing vendors.** Enverus is operator-side only; FieldFX automates ticket-to-invoice but no evidence it chases approvals or disputes `[UNVERIFIED this session]`; generic agentic AR (Stuut: 74 customers, $1.4B collected, 37% DSO reduction claim) is ERP-centric and not portal-aware. **No incumbent found shipping the supplier-side chase.**
- **Buyer.** Owner, controller or office manager of a $3–50M OFS company.
- **Budget source.** Billing labour, factoring fees, working capital.
- **Agent actions.** Ticket-aging watch → per-operator submission rules → missing-signature chase (text the company man with the ticket image, escalate to the operator's field supervisor after N days) → invoice validation against PO/AFE before submission → portal status polling → dispute response drafted from ticket evidence → remittance matched → weekly aging by operator.
- **Human exception.** Pricing disputes, scope disputes, any change to contract terms, a company man who refuses to sign.
- **Proof of completion.** Portal status Approved → Paid; remittance matched to invoice; days ticket-to-cash by operator trending down.
- **Plausible pricing.** $400–1,500/month plus 0.25–0.5% of accelerated receivables, anchored against factoring at 1.5–3%.

#### #2 — Home health and hospice: physician signature on orders (92)

- **Trigger.** Start of care, recertification, interim order, or face-to-face encounter documentation due.
- **Steps.** Order generated in the EMR (HCHB, Axxess, WellSky, MatrixCare) → faxed or e-signed to the certifying physician, often an unaffiliated hospitalist or PCP → sits in the office's inbox → orders coordinator refaxes, calls, escalates → signed and dated copy returned → indexed → final claim released.
- **Outside parties.** Physician office (front desk, nurse, physician), hospital liaison, referral source.
- **Current tools.** Forcura (now Mosai) and WorldView route documents and track orders; Element5 RPA for eligibility; offshore virtual assistants marketed for "physician order tracking".
- **Failure point.** "Faxes land in a general inbox with no owner, sit in physical stacks… [turning] a 30-second signature into a multi-week cycle" (WorldView, accessed 2026-10-06); unsigned 485s cited as the top cause of held claims (Interlace Health, vendor blog `[UNVERIFIED ranking]`).
- **Consequence.** A signed, dated plan of care is a condition of payment; the 2025 base 30-day period payment is $2,057, so each unsigned 485 freezes roughly $2,000; since the RAP was replaced by the NOA there is no upfront cash; verbal orders need written signature within 30 days (AAPC); a face-to-face outside its window is a near-automatic denial. No benchmark for average days outstanding was found `[UNVERIFIED]`.
- **Current workaround.** Orders coordinator at $40k+, or a $9–15/hr virtual assistant.
- **Existing vendors.** Forcura/Mosai, WorldView (routing and OCR, not autonomous chasing); Klio.care, Kassy Health (early); Qliqsoft Quincy (hospice CTI texting). **No vendor found that calls the physician office, negotiates the signing path and verifies a dated signature.**
- **Buyer.** Agency administrator or owner; Director of Clinical Operations; VP Revenue Cycle at 5–20-agency groups.
- **Budget source.** Billing labour and borrowed cash.
- **Agent actions.** Daily orders-aging → per-office channel profile (this office signs via fax on Tuesdays; that one wants the portal) → resend → day-7 call to the office for a commitment date → day-14 escalation to the liaison → OCR signature, date and face-to-face window math → write "ready to bill" to the chart → weekly per-office turnaround report.
- **Human exception.** Physician refusal or dispute, illegible or undated signature, physician left the practice, anything clinical.
- **Proof of completion.** Dated, legible signature on the order ID, indexed; claim acceptance (277CA / remittance).
- **Plausible pricing.** $8–15 per signed order or $500–1,500/month per agency with a cash-acceleration guarantee.
- **Bundle.** Hospice certification of terminal illness and F2F attestation (FY2026 hospice final rule, Federal Register 2025-08-05, requires signature and date on each attestation) is the same loop with the same buyer; scored 85 alone.

#### #3 — Commercial service contractor: national-account NTE, closure and payment loop (90)

- **Trigger.** Technician on a dispatched work order for a retail, QSR, bank or grocery site finds the repair will exceed the not-to-exceed limit.
- **Steps.** Tech documents cause and photos → office builds a proposal in the client's portal → status "Pending External Approval" (ServiceChannel developer guide, accessed 2026-10-06) → chase the facility manager → re-quote if pushed back → return trip, complete, check out with photos → invoice must sit within NTE or approved proposal → chase work-order closure, because "contractors cannot fully close certain work orders without client-side action, and if the client does not close the WO, billing is delayed" (Facilio ServiceChannel review, 2026) → reconcile rejected invoices.
- **Outside parties.** Client FM or regional manager, the client's FM platform (ServiceChannel — Fortive; Corrigo — JLL; Ecotrak, FacilityConnect `[UNVERIFIED this session]`), client AP, sometimes a landlord.
- **Current tools.** ServiceChannel Provider portal, app and API (proposal assign/escalate/update endpoints exist); Corrigo Pro; the contractor's FSM (ServiceTitan commercial, BuildOps, Fieldpoint, Jonas, Davisware `[UNVERIFIED this session]`); email, phone, spreadsheets.
- **Failure point.** Approval and closure sit on the client side; ServiceChannel's own 2025 e-book says low NTEs push providers "over budget, which leads to service delays as they wait for new budget approval" (servicechannel.com, file dated 2025-10-01). "Customers reserve the right to refuse invoices for work that was not approved in advance" (Trade Partner Guide, accessed 2026-10-06).
- **Consequence.** Unbilled completed work, invoice rejections, DSO blow-outs. No public dollar figure found `[UNVERIFIED]`.
- **Current workaround.** A national-accounts coordinator in 3–8 portals daily.
- **Existing vendors.** ServiceChannel and Corrigo are buyer-side; FSMs do intake, not chasing; ServiceChannel Summer 2026 adds agents that "recommend next steps for stalled work orders" for its clients, not for providers. **No incumbent found shipping the contractor-side loop.**
- **Buyer.** Owner, GM or VP Operations of a $5–50M commercial HVAC/R, plumbing or electrical contractor doing national accounts; the national-accounts manager.
- **Budget source.** G&A (coordinator salary) and working capital.
- **Agent actions.** Watch for NTE-exceed signals → draft proposal in the client's format and rate card → submit → poll status, escalate on the client's documented path after N days → one-click approve summary to the FM → trigger dispatch on approval → validate invoice against approved amount and client rules → chase closure and rejected invoices with the stated reason → match remittance → weekly unapproved/unclosed/unpaid aging.
- **Human exception.** Scope changes, pricing pushback, disputed rejections, anything touching a contract term.
- **Proof of completion.** Portal state transitions Approved → Completed → Invoiced → Paid plus matched remittance.
- **Plausible pricing.** $1,500–4,000/month per contractor tied to national-account volume, or 0.5–1% of recovered or accelerated billings.

#### #4 — Restoration mitigation: claim-file submission and carrier chasing (89)

- **Trigger.** Job reaches dry or complete in DASH, Albi or Encircle, or a TPA clock (estimate due in 24 hours) starts.
- **Steps.** Gather Xactimate estimate, photos, moisture and dry logs, equipment logs, authorisation, completion certificate → checklist → upload to XactAnalysis or email the adjuster → acknowledgement → RFIs → approval → invoice → chase → reconcile short-pays → flag supplement opportunities.
- **Outside parties.** Desk and field adjusters; TPAs (Contractor Connection, Alacrity, Code Blue); the policyholder.
- **Current tools.** Xactimate/XactAnalysis (Verisk), DASH (Next Gear), Encircle, Albi, CompanyCam, QuickBooks.
- **Failure point.** File flagged incomplete or adjuster silent; TPA scorecards penalise cycle time.
- **Consequence.** Restoration AR 45–120 days (Acquidex, Q1 2026 `[UNVERIFIED]`); carrier initial offers "59% of net invoice" with 5–15% recoverable via supplement (Virtual NexGen marketing `[UNVERIFIED]`).
- **Current workaround.** Insurance coordinator with a spreadsheet; offshore Xactimate and billing labour (~$8/hr `[UNVERIFIED]`).
- **Existing vendors.** DASH, Encircle, Albi (capture and rules automation, not chasing); Stuut (generic agentic AR, not carrier-aware); Verisk XactAI is carrier-side. **No incumbent ships submit → chase → reconcile for the contractor.**
- **Buyer.** Owner or GM of a 10–80-person firm; Director of Insurance Billing at multi-branch firms (Cotton, BMS CAT).
- **Budget source.** G&A.
- **Agent actions.** Completeness check against carrier/TPA requirements → submission → acknowledgement tracking → RFI answered from the file → approval tracking → invoice → chase on Texas Insurance Code chapter 542 prompt-pay clocks (15 days to acknowledge, 15 business days to accept or deny, 5 business days to pay; 18% interest plus attorney fees) → short-pay reconciliation.
- **Human exception.** Scope negotiation. Texas Insurance Code §4102.163 bars contractors from acting as public adjusters `[UNVERIFIED citation]`: the agent documents and chases, never negotiates scope.
- **Proof of completion.** Carrier approval and payment posted within tolerance; DSO per job.
- **Plausible pricing.** $500–1,500/month per branch plus $20–40 per claim closed. No contingency pricing (public-adjuster exposure).

#### #5 — GC subcontractor closeout for retainage release (87)

- **Trigger.** Substantial completion; closeout list issued (Division 01 77 00: O&M manuals, warranties, as-builts, attic stock, test and balance, training).
- **Steps.** Per-sub checklist → request → chase → validate each document (right project, right spec section, signed warranty with correct start date) → assemble → owner acceptance → retainage released down the chain.
- **Outside parties.** 20–60 subcontractors and suppliers; the owner's representative; the architect.
- **Current tools.** Procore, Autodesk Build closeout checklist, Pype Closeout (now only in the Autodesk Forma bundle; historically ~$2,500 one-time), email, spreadsheets.
- **Failure point.** Subs are paid and gone; the project engineer is on the next job; closeout takes 3–8 weeks manual (ustechautomations, 2026) or 30–90 days (Projul).
- **Consequence.** Retainage of 5–10%; a $20M project at 5% leaves $1M idle; most states require release 30–60 days after completion (MRSC). GCs spend 65 hours/month managing payments to subs and vendors (Rabbet 2025 Construction Payments Report).
- **Current workaround.** Project engineer plus a closeout spreadsheet.
- **Existing vendors.** Pype (automated notifications, "94% participation" claim, bundled); Procore has no closeout agent (its agents: Deep Search, Submittal Reviewer, RFI, Daily Log, Contract Review; ENR May 2026); Nomic early.
- **Buyer.** Project executive or Director of Operations at a mid-size GC; project engineer uses it.
- **Budget source.** Project general conditions (billable to the job).
- **Agent actions.** Build the list from the spec → per-sub requests → chase on a schedule → validate uploads against the spec section → flag mismatches → assemble the binder → track owner acceptance.
- **Human exception.** Disputed warranty terms, missing subs, owner rejections.
- **Proof of completion.** Complete, validated closeout set; owner acceptance; retainage release recorded.
- **Plausible pricing.** $1,500–4,000 per closeout or $1,000–2,000/month per GC.

#### #6 — Insurance agency renewal data and loss runs (84)

- **Trigger.** Policy expiration enters the 90–120-day window.
- **Steps.** Pull ACORDs → request payroll, sales, schedules and SOV from the insured → request 3–5 years of currently valued loss runs from each prior carrier (portal, email, phone; 5–15 business days) → chase both → validate against carrier supplementals → submit → track quotes.
- **Outside parties.** Insured, 1–6 prior carriers or MGAs, wholesalers, the insured's CPA or payroll provider.
- **Current tools.** Applied Epic plus Indio (portal, pre-fill, reminders), Vertafore AMS360, Zywave, Outlook, Excel, carrier portals; outsourced loss-run procurement services.
- **Failure point.** Insured ignores requests until 2–3 weeks out; carriers slow; late or incomplete submissions get declined and roll over at a worse rate.
- **Consequence.** Lost commission of 10–15% of premium per account; E&O exposure; 47 minutes of CSR time per quote request (Deloitte 2025 via Sonant `[UNVERIFIED primary]`).
- **Current workaround.** Account manager calendar reminders and phone calls.
- **Existing vendors.** Applied Epic Conductor (announced Applied Net Sept 2026) runs commercial submissions through an automated workflow but has not been shown chasing insureds or requesting loss runs (The Renewal Report, 2026-09-29); Zywave's agents are prospecting (Insurance Journal, 2026-02-23); loss-run *parsing* agents (Roots, Reinsured, FurtherAI, Inaza) are carrier-side. **Risk: Conductor is one release from this.**
- **Buyer.** Agency principal, COO, or Director of Commercial Lines Operations at $5–50M revenue agencies.
- **Budget source.** Service staff labour; retention.
- **Agent actions.** Renewal calendar → per-insured data request with pre-filled forms → per-carrier loss-run request through the carrier's known channel → chase both → validate → hand complete file to the producer.
- **Human exception.** Coverage questions, carrier declinations, anything advisory.
- **Proof of completion.** Complete submission file N days before expiration; loss runs on file for every prior carrier.
- **Plausible pricing.** $400–1,500/month per agency plus $15–25 per loss run procured.

#### #7 — Auto dealer contracts in transit (83)

- **Trigger.** Deal delivered; retail installment contract sent to the lender via Dealertrack or RouteOne; lender holds funding pending stipulations.
- **Steps.** Lender posts conditions → office manager or F&I calls the customer, salesperson and lender → corrected documents collected → re-submit → funded → CIT schedule cleared.
- **Outside parties.** Lender funding desks, the retail customer, insurance agents, DMV.
- **Current tools.** Dealertrack and RouteOne e-contracting; DMS CIT schedule (CDK, Reynolds `[UNVERIFIED this session]`); lenders adding AI on their side (Auto Finance News, accessed 2026-10-06).
- **Failure point.** "Most funding delays aren't caused by slow wire transfers but by stipulation requirements that take days to collect and verify" (Lendbuzz, accessed 2026-10-06); paper packages "spend an average of five days in transit" (Dealertrack, accessed 2026-10-06).
- **Consequence.** Floorplan interest on unfunded units; unwinds; a mid-size store carries hundreds of thousands in CIT at month-end `[UNVERIFIED]`.
- **Current workaround.** Daily CIT aging printout and phone calls.
- **Existing vendors.** Rails only (Dealertrack, RouteOne); lender-side stip AI. **No dealer-side agent found** `[UNVERIFIED absence]`.
- **Buyer.** Dealer principal, GM, controller or F&I director.
- **Budget source.** Finance department expense against floorplan interest.
- **Agent actions.** Ingest CIT aging → read lender conditions → text customer for specific documents with secure upload → nudge salesperson for dealer-side fixes → re-submit → poll lender → confirm funding → post.
- **Human exception.** Re-contracting at different terms, declines, fraud flags, any consumer disclosure.
- **Proof of completion.** Funding confirmation; CIT days outstanding by lender.
- **Plausible pricing.** $750–1,500 per rooftop per month.
- **Compliance flag.** Consumer PII, GLBA, adverse-action adjacency; scored C = 4.

#### #8 — Small-carrier detention collection (82)

- **Trigger.** Driver held at a shipper or receiver beyond free time (typically 2 hours).
- **Steps.** Capture arrival and departure timestamps (ELD, geofence, signed BOL) → assemble claim → file with the broker or shipper per their rules → chase → paid or denied.
- **Outside parties.** Broker, shipper, receiver.
- **Current tools.** ELDs (Motive, Samsara produce detention reports) `[UNVERIFIED this session]`; TMS; email.
- **Failure point.** Claims filed late or without proof; brokers deny by default.
- **Consequence.** Less than 50% of detention is collected; 70% is lost without timestamps (pass report, accessed 2026-10-06 `[secondary]`).
- **Current workaround.** Dispatcher emails; most carriers give up.
- **Existing vendors.** ELD detention reports; broker TMS detention modules; HappyRobot collections for enterprise brokers. No small-carrier-side chaser found.
- **Buyer.** Owner of a 5–50-truck carrier.
- **Budget source.** Found money.
- **Agent actions.** Detect detention from ELD → assemble proof → file per counterparty rules → chase on the counterparty's timeline → match payment.
- **Human exception.** Disputed timestamps, rate confirmation ambiguities.
- **Proof of completion.** Detention paid on remittance.
- **Plausible pricing.** 15–25% of detention collected (contingency works here: no licensing exposure).
- **Penalty.** Willingness to pay cut to 5: small carriers are a hard, cheap buyer, and the pain is real but modest per event.

#### #9 — Roofing supplement submission and follow-up (80)

- **Trigger.** Carrier estimate received below the contractor's scope.
- **Steps.** Build supplement with photos and code citations → submit → chase the adjuster → approved → paid.
- **Outside parties.** Carrier desk adjuster; policyholder.
- **Current tools.** Xactimate; CapOut and ESXpress write supplements with AI; supplement firms charge 10% residential, 5% commercial (Supplement Experts, accessed 2026-10-06).
- **Failure point.** Supplements sit; adjusters rotate; nobody follows up.
- **Consequence.** More than 90% of claims supplementable, $2–6k average recovery (CapOut `[UNVERIFIED vendor claim]`).
- **Existing vendors.** Supplement-writing tools own the document; none own the follow-up loop.
- **Buyer.** Owner of a storm-chasing or retail roofing contractor.
- **Plausible pricing.** $75–150 per supplement or $800–2,000/month.
- **Penalty.** Compliance 3: the line between "follow up on a supplement" and "negotiate a claim on the policyholder's behalf" is where Texas public-adjuster enforcement lives. Not recommended as a first wedge.

#### #10 — CRE owner: third-party life-safety and equipment inspection cycle (79)

- **Trigger.** Inspection due (fire alarm, sprinkler, backflow, elevator, generator) per NFPA 25/72 and Texas TDLR schedules.
- **Steps.** Schedule the inspector → inspection → deficiency report → quote → owner approval → repair → file with the AHJ or TDLR → certificate on file.
- **Outside parties.** Inspection contractor, repair contractor, AHJ, TDLR, tenant.
- **Current tools.** Property management system work orders, Building Engines/Prism, spreadsheets; AHJ portals (The Compliance Engine) that charge filing fees.
- **Failure point.** Expired certificates; deficiencies unrepaired for months; fines.
- **Existing vendors.** Contractor-side FSMs (ServiceTrade, Inspect Point, Uptick) and AHJ portals already run deficiency outreach from the other side; owner-side ownership is thin.
- **Buyer.** Property manager or Director of Engineering at a regional owner/operator.
- **Plausible pricing.** $200–600 per building per year.
- **Penalty.** Incumbent weakness 5 and willingness to pay 6: compliance is a cost centre and the contractor side is already automating.

### 2.3 The long list (everything scored, ranked)

| Rank | Workflow | Normalised | Note |
|---|---|---|---|
| 1 | OFS field ticket → paid | 94 | finalist |
| 2 | Home health / hospice physician signature | 92 | finalist |
| 3 | Commercial contractor NTE / portal loop | 90 | finalist |
| 4 | Restoration claim-file chase | 89 | first alternate |
| 5 | Sub closeout / retainage | 87 | |
| 6 | Hospice CTI / F2F (standalone) | 85 | bundled into #2 |
| 7 | Agency renewal / loss runs | 84 | Applied Conductor risk |
| 8 | Dealer contracts in transit | 83 | GLBA |
| 9 | Small-carrier detention | 82 | |
| 10 | POD collection for small brokers/carriers | 80 | |
| 11 | Roofing supplement follow-up | 80 | UPPA |
| 12 | Texas lien waiver collection, lower tiers | 79 | Siteline/Levelset adjacent |
| 13 | CRE life-safety inspection cycle | 79 | |
| 14 | Estoppel / SNDA chase at sale or refi | 79 | low frequency; Rexera adjacent |
| 15 | Fire-protection deficiency follow-up (contractor side) | 79 | incumbents ship most |
| 16 | Pass-through nonprofit sub-grantee documents | 79 | WTP 4 |
| 17 | OS&D freight claims | 79 | Freehand, FreightClaims.com |
| 18 | Port Houston demurrage / detention disputes | 78 | FMC rule effective 2024-05-28 |
| 19 | Commercial loan closing third-party conditions | 78 | bank sales cycle |
| 20 | Behavioural health single-case agreements | 78 | low frequency |
| 21 | Payer enrollment document chasing | 78 | Medallion et al. |
| 22 | Agency COI fulfilment | 77 | Certificial, CSR24 |
| 23 | Post-close covenant / financial collection | 77 | |
| 24 | Hotel BEO change → vendor re-confirmation | 77 | WTP 4 |
| 25 | Change-order approval chasing | 76 | Clearstory, Briq, Procore |
| 26 | 811 locate / permit coordination | 76 | |
| 27 | OEM warranty claims (equipment/truck dealers) | 76 | ServiceCPQ, Annata ship most (raw 82) |
| 28 | DME physician documentation | 75 | Parachute ships most (raw 85) |
| 29 | SMB PO confirmation / expediting | 74 | SourceDay ships it (raw 90) |
| 30 | Staffing credentialing | 75 | Bullhorn/Asurint |
| 31 | PCP outbound referral closure | 74 | quality, not cash |
| 32 | CPA tax document chasing | 73 | TaxDome Atlas |
| 33 | Audit PBC / confirmations | 71 | Fieldguide, Suralink |
| 34 | SCAR (supplier corrective action) | 70 | |
| 35 | Multifamily make-ready turns | 70 | RealPage ships it (raw 88) |
| 36 | CAM reconciliation | 68 | |
| 37 | HOA violation / ARC | 60 | Vantaca ships it (raw 76) |
| 38 | Outside-vendor work orders, multifamily | 55 | PMS incumbents (raw 79) |
| 39 | Vendor COI tracking | 55 | Jones, myCOI, bcs (raw 76) |
| 40 | Specialty referral intake | 50 | Tennr, Assort (raw 80) |

Rejected without full scoring (incumbent ships the loop or pain has evaporated): prior authorisation; outpatient PT plan-of-care signatures (CMS no longer requires physician signature as of 2025-01-01); dental attachments; medical records; denial appeals; patient balances; clinical-trial site documents; lab result retrieval; submittals and RFIs; permits; material expediting; lender draws; punch lists; title payoffs and HOA estoppels; residential mortgage conditions; ACAT/NIGO; immigration evidence; discovery; marketing approvals; fleet repair approvals; oil and gas owner relations; self-storage liens; franchisee compliance; lab chain of custody; certified payroll; tower site access; childcare licensing.

---

## 3. Competitive landscape, cross-cutting

### 3.1 Horizontal tools a buyer could use instead (2026 pricing)

| Platform | What it ships | Price | Could a non-technical owner build "email, wait, call, verify, log"? |
|---|---|---|---|
| Lindy | Email, calendar, phone agents; 1,000+ integrations | $29.99–199.99/month; voice ~$0.19/min (nocode.mba, accessed 2026-10-06) | Closest to yes; no verification, no shared ledger, no audit trail |
| Zapier Agents | Agents metered by "activities" | Free 400/month; Pro $50 (zapier.com/pricing, accessed 2026-10-06) | Partially; a multi-week chase burns activities; no phone |
| Relay.app | **Shutting down**: announced 2026-07-16, paid accounts close 2026-09-14 (docs.relay.app) | was $19–69 | N/A; the cautionary tale |
| Gumloop, Make, n8n | Visual/dev builders | $16–60/month tiers | No; these are what a $150/hour automation consultant will use to compete |
| Copilot Studio, Agentforce, ServiceNow, Workday | Enterprise suites | $0.10/action and up; $195–550/user/month editions | Enterprise only |
| Bland, Vapi, Retell | Voice primitives | $0.05–0.14/min platform | Developer primitives |
| Intercom Fin | Support agent | $0.99/outcome | Inbound only; sets the per-outcome anchor |
| Content Snare | Client document reminders | $35–215/month | Reminders only; the realistic SMB ceiling for "reminders" |

**Verdict.** A vertical product's moat against these is state, verification, escalation and audit, not the ability to send messages. The horizontal small-business agent-builder market consolidated hard in 2026 (Relay.app dead; Zapier, Lindy, Gumloop, Make, n8n remain).

### 3.2 Macro findings that bear on the choice

- BCG (2026): agentic procurement "can free up 60% of buyer capacity"; but "internal operational benefits appear first" and external, supplier-facing value is reported less often. The outside half of the loop is the hard half.
- McKinsey (June 2025): "Agentic systems brutally expose friction by removing handoffs… every transition creates delay and ambiguity." Only ~23% of organisations have scaled an agentic system (State of AI, Nov 2025, via cxtoday). The literal phrase "coordination tax" was not found in any McKinsey piece `[UNVERIFIED as a McKinsey term]`.
- Gartner (2025-06-25): "over 40% of agentic AI projects will be canceled by the end of 2027"; ~130 of thousands of vendors are real.
- Forrester (Oct 2025): "less than 15% of organisations will actually enable agentic features in their automation platforms in 2026."
- Bessemer (2025): LLM-native vertical AI companies growing ~400% year over year at ~65% gross margins; professional services ~13% of US GDP.
- a16z (Dec 2024) and Sequoia (2026): outcome-based pricing is the direction; Deloitte published accounting guidance for outcome-based pricing in agentic products on 2026-06-04. Counter-signal: "pure outcome-based deals… often end up looking more like bespoke service contracts than product pricing" (getmonetizely, 2026).

Read-through for QB: ship with an audit trail and a human-escalation design as the product, not as features; price per verified outcome against a known dollar anchor (factoring fee, floorplan interest, frozen claim); pick the one counterparty type whose rules you can learn.

---

## 4. Top 3 deep dives

### Finalist 1 — OFS supplier ticket-to-cash loop (94)

**Why now.** Enverus has made OpenInvoice the de facto operator network, so supplier billing is now a portal problem, and portal problems are agent problems. Supplier-side DSO is structurally above 45 days (ops-flo, 2026 `[vendor claim]`). Factoring at 1.5–3% is the price the market already pays for the same outcome. Generic agentic AR (Stuut) proved the enterprise version works (37% DSO reduction claim) but is not portal-aware or OFS-aware. Caveat: the 2026 oil price and rig count were not researched `[UNKNOWN]`; this bet is pro-cyclical.

**Why incumbents have not won.** Enverus sells to operators; its supplier offering is a submission fee, and an agent that argues with operator approvers on suppliers' behalf is against its customers' interest. FieldFX (ServiceMax/PTC) automates ticket-to-invoice for larger OFS firms but has not been shown chasing signatures or disputes `[UNVERIFIED this session]`. HappyRobot and Vooma are logistics. Factoring companies profit from the delay.

**Why QB could enter.** Houston is the only city where the buyer, the counterparty's field staff, and the portal vendors are all within driving distance. The outcome is binary and in the bank. The compliance surface is commercial B2B, with no HIPAA, no public-adjuster law, no consumer protection. The chase can be run manually first.

**First buyer persona.** Owner-operator or controller of a $3–30M OFS company in Houston or the Permian with 3–8 operator customers, 50–400 tickets a month, factoring some receivables, and one billing clerk who "knows OpenInvoice". Secondary: the office manager who actually does it.

**What QB could deliver manually before building software.** A ticket-to-cash desk: QB staff (or a contractor under QB's direction) log into the customer's own portals under written authorisation, work the aging daily, text company men for missing signatures with ticket images, respond to disputes from ticket evidence, and send a Friday one-page aging by operator. Tools: the customer's portal logins, a shared spreadsheet, a phone, a calendar.

**What would prove demand within 30 days.** Three OFS companies hand over a ticket aging export. Two allow QB to work the chase for two weeks. One agrees to pay at least $1,000/month for the manual service to continue, or signs for a 0.5% success fee on accelerated receivables. Days from ticket date to portal approval improve measurably against the customer's prior 90-day baseline.

**What evidence would kill it.** Operator portal terms of use forbid third-party or automated access and operators enforce it. The binding delay is contractual payment terms (net 60/90), not friction, so chasing moves nothing. The binding delay is the physical signature in the field, which no office process reaches. Suppliers already pay a $15/hour clerk and see no gap. FieldFX or Enverus announce supplier-side chase features. Oil below the level at which OFS owners stop buying anything `[UNKNOWN threshold]`.

**Potential first contract value.** $1,000–1,500/month plus 0.5% of accelerated receivables; for a $10M-revenue supplier with 60-day DSO pulled to 45 days that is roughly $400k of working capital released once, so a first-year contract in the $15–25k range is defensible.

### Finalist 2 — Home health and hospice physician-signature loop (92)

**Why now.** The NOA regime removed upfront cash, so every unsigned order is frozen revenue (~$2,057 per 30-day period, 2025). CMS payment cuts proposed for CY2025 and CY2026 squeeze margins. The FY2026 hospice final rule (Federal Register 2025-08-05) tightened face-to-face attestation signature and date requirements. Document-routing vendors (Forcura/Mosai, WorldView) have digitised the fax but left the human chase in place.

**Why incumbents have not won.** Forcura and WorldView sell to agencies and are paid per document moved, not per signature obtained; chasing physician offices is labour they have avoided. Element5 chose eligibility and authorisation RPA. Tennr and Assort chose the specialty-practice side of referrals. The home-health agency is too small and too fragmented for the venture-funded players (median agency is owner-operated).

**Why QB could enter.** 260 Medicare-certified agencies in Houston, most owner-operated and reachable by phone. The Texas Medical Center concentrates the counterparty physicians, so per-office "signing profiles" (who signs, how, on which day) become a local asset that compounds. The outcome is binary: dated signature indexed, claim accepted.

**First buyer persona.** Administrator-owner of a 1–3-location Houston home health agency with 150–600 census, a billing manager, and an orders coordinator (or a virtual assistant) whose job is "chasing 485s". Secondary: VP Revenue Cycle at a 5–20-agency Texas group.

**What QB could deliver manually before building software.** Under a Business Associate Agreement, an orders-chasing desk: daily orders-aging review inside the agency's EMR, refax and call physician offices on a schedule, log each office's signing path, escalate to the liaison, confirm signature and date on return, and produce a weekly per-physician turnaround report the agency can use with its referral sources.

**What would prove demand within 30 days.** Three agencies share their unsigned-orders aging (count and dollars). Two sign a BAA and let QB work the queue for two weeks. One agrees to pay $8–15 per signed order or $750/month for continuation. Median days-to-signature falls against the prior baseline; at least one physician office switches to a faster channel because QB asked.

**What evidence would kill it.** Unsigned orders are a small share of held claims at real agencies (the "number one cause" claim is a vendor's). Agencies already use $9–15/hour offshore VAs and see the gap as closed. Physician offices refuse to engage with a non-agency third party even under BAA. HIPAA and BAA overhead exceeds what a two-person studio can carry. Forcura/Mosai or Axxess (HQ Dallas `[UNVERIFIED]`) ship an autonomous chase.

**Potential first contract value.** $750–1,500/month per agency, or $8–15 per signed order; an agency releasing 20 frozen 30-day periods a month (~$40k) pays for itself on day one. First-year $9–18k per agency.

### Finalist 3 — Commercial service contractor national-account loop (90)

**Why now.** National accounts have pushed their facility work onto ServiceChannel and Corrigo, both of which now expose documented APIs for proposals and status (ServiceChannel developer guide, accessed 2026-10-06). ServiceChannel's own content admits low NTEs cause providers to wait for budget approvals (NTE e-book, 2025-10-01). Podium's August 2026 "Operator" and ServiceTitan's AI investments prove contractors will buy back-office agents, but those products are residential and inbound.

**Why incumbents have not won.** ServiceChannel and Corrigo are paid by the client; an agent that pressures clients to approve and close faster is not something they will sell to providers. FSMs (ServiceTitan, BuildOps) make money on dispatch and intake. The multi-portal chase sits in the gap between two kinds of software, owned by a coordinator with eight browser tabs.

**Why QB could enter.** Houston's commercial mechanical, electrical and plumbing base is large and owner-led. The outcome is a portal state transition plus cash, verifiable without any judgement. Compliance exposure is commercial B2B. The same buyer profile overlaps with Finalist 1 (field-service owners who bill large counterparties), so one go-to-market motion serves two wedges.

**First buyer persona.** Owner or VP Operations of a $5–50M commercial HVAC/R or plumbing contractor doing 30%+ national-account revenue, with a national-accounts coordinator and visible frustration about "unbilled work sitting in the portal".

**What QB could deliver manually before building software.** A portal desk: QB works the contractor's ServiceChannel and Corrigo queues daily under provider credentials, drafts proposals from tech notes, chases FMs on the client's escalation path, validates invoices against approved amounts before submission, and reports unapproved/unclosed/unpaid aging weekly.

**What would prove demand within 30 days.** Three contractors export their pending-proposal and unclosed-work-order aging. Two let QB work the queue for two weeks. One pays $1,500/month to continue. Pending-approval age falls; rejected-invoice count falls.

**What evidence would kill it.** ServiceChannel's provider API terms forbid third-party operation on a provider's behalf, or provider API access is only available at a subscription tier the target buyers do not hold. The real bottleneck is the client's approver, who ignores everyone equally, so chasing moves nothing. Contractors treat unbilled national-account work as a cost of doing business and will not pay to fix it. ServiceChannel or Corrigo ship a provider-side "get my proposals approved" agent.

**Potential first contract value.** $1,500–3,000/month; first-year $18–36k per contractor.

### 4.4 The three finalists against QB's existing ideas

| Dimension | A. Founder Capital Allocation OS | B. Revenue Memory / follow-up | C. Outside Loop (horizontal) | F1 OFS ticket-to-cash | F2 Home health signatures | F3 Contractor portal loop |
|---|---|---|---|---|---|---|
| P | 5 | 7 | 8 | 9 | 9 | 8 |
| F | 3 | 8 | 9 | 10 | 9 | 9 |
| $ | 6 | 6 | 8 | 9 | 8 | 8 |
| M | 3 | 6 | 9 | 9 | 9 | 9 |
| X | 3 | 7 | 7 | 6 | 8 | 7 |
| V | 2 | 4 | 8 | 9 | 9 | 9 |
| I | 4 | 3 | 6 | 6 | 7 | 6 |
| G | 6 | 7 | 5 | 5 | 5 | 5 |
| C | 7 | 7 | 5 | 8 | 5 | 8 |
| S | 5 | 7 | 4 | 7 | 7 | 7 |
| H | 6 | 7 | 6 | 10 | 9 | 7 |
| W | 3 | 4 | 7 | 6 | 7 | 7 |
| **Total** | **53** | **73** | **82** | **94** | **92** | **90** |

**Idea A is already lost.** The $250k–$3M founder has no finance function and no data source for hours or capacity, so the product becomes a questionnaire. The companies holding the bank, card and ledger data (Ramp, Brex, Mercury, Intuit, Digits, Puzzle) are giving the decision layer away. The category's history is absorption (Causal, Finmark, Pry) and collapse (Bench, Dec 2024), and the survivors (Runway, Mosaic, Abacum, Pigment) sell $10–50k/year to companies with a finance hire. Outcome is unverifiable: you never learn the counterfactual. `[Competitor facts UNVERIFIED this session]`

**Idea B is a land-grab QB cannot fund.** Ahoy launched 2026-07-08 as "the AI CRM built for founder-led sales" with follow-up sequences still "in development for late 2026"; Day.ai, Attio, Clarify and Zero tell the same story; HubSpot Breeze and Agentforce SDR ship "who to follow up with" at the platform layer; Google and Microsoft are shipping forgotten-follow-up detection inside the inbox. Nine-figure money went only to outbound (Clay, Nooks, 11x). "Found a forgotten deal" cannot be attributed, so outcome pricing cannot work.

**Idea C survives only in its vertical form.** The horizontal "any outside loop" product has no verification moat and gets priced against Lindy ($29.99/month) and Zapier Agents ($50/month). Every verifiable loop with a dollar value already belongs to a vertical company with $40–600M behind it, and each earns its margin on a counterparty-specific verification asset. The three finalists are what Idea C becomes when forced to choose one counterparty type and one dollar outcome. In that sense the hypothesis is not disproved; it is narrowed to the only shape in which anyone has made it work.

---

## 5. The recommended wedge

**Finalist 1: the oilfield-services supplier ticket-to-cash loop.**

The case, in order of weight:

1. **Buyer accessibility is a 10 and nothing else is.** QB's binding constraint is not capital or capability; it is two people in Houston with no industry credentials. The only market where that geography is an unfair advantage is the one headquartered here.
2. **The outcome is cash, verified by the counterparty's own system.** No clinical judgement, no claim negotiation, no consumer protection. "Approved" and "Paid" are portal states.
3. **The price anchor already exists.** Suppliers pay 1.5–3% to factors for the same outcome. A 0.5% success fee is a 70% discount on a product the buyer already buys.
4. **No incumbent is on the supplier's side.** Enverus is paid by operators; FieldFX stops at the invoice; Stuut does not know what a field ticket is.
5. **It can be sold and delivered manually in 30 days,** which is the only honest way to find out whether the pain is real.

The case against it is in Section 8. The two caveats that matter most: oil cyclicality `[UNKNOWN for 2026]` and operator portal terms of use `[UNVERIFIED]`. Both are checkable in week one of the validation plan below, before any money is spent.

Finalist 2 is the stronger product if the HIPAA burden can be carried; Finalist 3 shares a buyer motion with Finalist 1 and should be the second conversation with every field-service owner QB meets.

---

## 6. 30-day no-code validation plan

**Principle.** Sell the outcome as a manual service first. Build nothing. Every artefact is a spreadsheet, a phone, a calendar and a written authorisation.

**Week 1 — Disprove the two killers before anything else.**
- Read (not search) Enverus OpenInvoice supplier terms of use and any ServiceChannel provider terms for language on third-party or automated access. Output: a yes/no on whether QB may operate a supplier's portal under their credentials with written authorisation.
- Confirm the 2026 oil price and Permian rig count and whether OFS owners are hiring or cutting. Output: a one-line "buying climate" note.
- Pull 20 Houston-area job postings mentioning "OpenInvoice", "field ticket" and "billing" from the last 90 days. Output: evidence that firms are paying humans for this loop, with salary bands.
- Fifteen conversations booked with OFS owners, controllers and office managers. Sources: Energy Workforce & Technology Council member list, Houston OFS directories, LinkedIn job titles "billing coordinator" at OFS firms, Jay's existing Houston network. Script: "Walk me through the last ticket that took more than 30 days to get paid."

**Week 2 — Get the data.**
- Ask each of the fifteen for a ticket aging export (ticket date, submit date, approval date, paid date, operator, status). Offer a free one-page "ticket-to-cash audit" in return. Target: three exports.
- From the exports, compute per-operator days ticket → submitted, submitted → approved, approved → paid, and the share of tickets stalled at each step. This tells QB whether the delay is field signature, office submission, operator approval, or payment terms. Only the middle two are chaseable.

**Weeks 3–4 — Run the loop by hand.**
- Two of the three agree to a two-week pilot: written authorisation, portal credentials, a daily 30-minute working block in QB's calendar, a shared spreadsheet as the ledger, a weekly Friday aging by operator.
- Work every open item daily: resend, text the company man with the ticket image, respond to disputes from ticket evidence, escalate on day seven. Log every touch with timestamp, channel, counterparty and result.
- Measure days-to-approval and approved-not-paid against each customer's prior 90 days.

**Day 30 — Decide.** Success is defined before starting:
- At least one pilot customer agrees to pay at least $1,000/month, or a 0.5% success fee, for the manual service to continue.
- Pending-approval age falls at least 20% against baseline for the chaseable steps.
- The touch log shows a repeatable pattern (same counterparties, same reasons, same fixes) that a system could own.
- Nobody in the fifteen said "we tried this and operators shut it down."

If all four hold, the next step is still not code. It is a third and fourth paying manual customer, because that is what proves the pattern generalises beyond two friendly owners.

**Budget.** Zero software. Roughly 40 hours of QB time in weeks one and two and 20 hours a week in weeks three and four.

**Parallel track, optional.** Run the identical plan for Finalist 3 with the same field-service owners (many commercial contractors also serve OFS customers) and for Finalist 2 only if a Houston agency administrator comes forward unsolicited; do not go looking for the HIPAA burden until the OFS answer is in.

---

## 7. Kill criteria

Stop the OFS wedge immediately if any one of these is true:

1. **Portal terms forbid it and operators enforce it.** Written authorisation does not cure a terms-of-use ban on third-party or automated access, and QB will not operate against a counterparty's terms.
2. **The delay is contractual.** If the ticket-aging exports show that 70%+ of elapsed days sit between operator approval and payment (net 60/90 terms), chasing is irrelevant and factoring is the right product.
3. **The delay is physical.** If 50%+ of stalled tickets are waiting on a signature that only a person standing next to the company man can get, the office loop is not the lever.
4. **Nobody pays by day 30.** Two pilots run and neither customer will pay $1,000/month or a success fee. Compliments are not a yes.
5. **An incumbent moves.** Enverus, FieldFX or ServiceMax announces supplier-side signature chasing or dispute automation. Check before each pilot starts.
6. **The buyer climate collapses.** Oil price or rig count falls to a level where owners say they are cutting back-office spend `[threshold UNKNOWN; set it in week one]`.
7. **The pattern does not repeat.** If the touch log from two customers shows no overlap in counterparties, reasons or fixes, there is nothing for software to own and QB has built a staffing agency.

Kill criteria for the alternates: Finalist 2 dies if agencies' unsigned-order dollars are below 5% of monthly billings, if physician offices will not deal with a BAA third party, or if Forcura/Mosai or Axxess ship autonomous chasing. Finalist 3 dies if ServiceChannel's provider API terms forbid third-party operation or if contractors will not pay $1,500/month after a two-week pilot.

---

## 8. The one-paragraph case against the winner

QB should not pursue the oilfield-services ticket-to-cash wedge because it is a pro-cyclical bet made by two people with no energy credentials in a relationship-driven industry whose buyers have watched software vendors come and go for thirty years; because the counterparties are a handful of operators who can close the gap any quarter by asking Enverus for a supplier-side feature, which Enverus would ship to protect its network; because the realistic product is a billing desk with good habits, which is a services business whose margin collapses the moment QB tries to replace people with software and discovers that the binding constraint is a company man who does not sign; because the price anchor cuts both ways (if factoring already solves the cash problem at 1.5–3%, the supplier's willingness to pay for a cheaper version is bounded by the clerk they already employ, not by the receivable); and because every claim in this document that makes the wedge look attractive (DSO above 45 days, weeks-long stalls, no incumbent on the supplier side) rests on vendor marketing read through search snippets, none of which has been opened, let alone confirmed by a single owner who has agreed to pay.

---

## Appendix A — Research method and budget

Seven research passes ran in parallel on 2026-10-06, each capped by a shared web-search budget (roughly 16–30 queries per pass) with all page fetches blocked by the network policy. Each pass produced a report with its own scores; the reviewer normalised scores onto the twelve-dimension rubric above, applied incumbent penalties uniformly, and resolved overlaps (for example, three passes independently surfaced vendor COI tracking; one score is kept). Where passes disagreed on a vendor's capabilities, the more conservative (less favourable to QB) reading was kept.

## Appendix B — Source index

All accessed 2026-10-06 unless a publication date is shown. Secondary sources are marked.

**Macro.** BCG, "AI in procurement drives competitive advantage" (2026), bcg.com/publications/2026/ai-in-procurement-drives-competitive-advantage. BCG, "Scaling agentic AI in tech procurement" (2026), bcg.com/publications/2026/scaling-agentic-ai-in-tech-procurement. BCG Executive Perspectives, "From AI assistance to agentic orchestration" (July 2026). McKinsey, "Seizing the agentic AI advantage" (June 2025). McKinsey State of AI 2025 via cxtoday.com (Nov 2025) `[secondary]`. Gartner press releases 2025-06-25 and 2025-08-26. Forrester, "Predictions 2026: AI moves from hype to hard-hat work" (Oct 2025); "The state of agentic AI in 2026". a16z, enterprise newsletter Dec 2024; "AI inside opens new markets for vertical SaaS". Bessemer, "The state of AI 2025", bvp.com/atlas. Sequoia, "The pricing maturity curve for agentic AI companies", inferencebysequoia.substack.com. Deloitte DART, outcome-based pricing guidance, 2026-06-04. getmonetizely, "2026 guide to SaaS, AI and agentic pricing models". The Register, "AI agents fail a lot", 2025-06-29.

**Horizontal platforms.** zapier.com/pricing; nocode.mba Lindy pricing; docs.relay.app shutdown notice (2026-07-16); zapier.com/blog/gumloop-pricing; miniloop.ai n8n pricing 2026; make.com blog; aguidetocloud.com Copilot Studio pricing; supered.io and concret.io Agentforce pricing; a8gent.com HubSpot Breeze; eesel.ai ServiceNow pricing; newsroom.workday.com 2025-05-19; intercom.com pricing; sacra.com/c/sierra; BusinessWire Decagon 2026-01-28; SiliconANGLE Parloa 2026-01-15; getmacha Bland pricing; cloudtalk Vapi pricing; retellai.com; portico.run Content Snare review.

**Vertical agentic companies.** Endpoints News, Tennr Series C (July 2025); Fierce Healthcare, Tennr (July 2025); PR Newswire, Infinitus Series C (2024-10-23); dcvelocity and indexventures.com, Vooma; tech.eu, HappyRobot Series B (2025-09-03); sacra.com/c/happyrobot; FreightWaves, Mudflap–Parade (Apr 2026); zip.com/blog/series-d; BusinessWire Zip (2025-12-02); coupa.com newsroom, Tonkean (May 2026); calcalistech Tonkean; PR Newswire, Jones Series B (2025-01-07); vertikalrms COI pricing guide 2026; evidentid.com; suralink.com; lessen.com; aiforproptech.com Lessen; BusinessWire ServiceChannel AI (2026-04-07); servicechannel.com Summer 2026 release; facilio.com Corrigo and ServiceChannel reviews (2026); Commercial Observer, Handoff (June 2025); nemetschek.com Handoff; astucia.io Podium pricing; Morningstar/PR Newswire Podium home services (2026-08-27); ACHR News Podium; contractortoolstack.com Podium; entrata.com press (2026-03-24); aitoolsbakery EliseAI review (2026); ahoy.ai/blog/introducing-ahoy (2026-07-08); letsdatascience Ahoy; techcrunch.com Codi (2025-10-21); Assort Health Referrals GA (2026-08-13); Latent Series A (Mar 2026); CMS-0057-F; availity and medaiverdict on PA API deadlines.

**Oilfield services.** ops-flo (2026) on OFS DSO and unsigned tickets `[vendor]`; Enverus OpenInvoice and OpenTicket `[UNVERIFIED this session]`; FieldFX / ServiceMax `[UNVERIFIED this session]`; Stuut customer and DSO claims `[vendor]`.

**Home health and hospice.** WorldView on fax inbox stalls; Interlace Health on held claims `[vendor]`; AAPC on verbal-order signature windows; Federal Register, FY2026 hospice final rule (2025-08-05); CMS CY2025 home health base payment; Forcura/Mosai; Element5; Klio.care; Kassy Health; Qliqsoft Quincy; blackhealth.org, causeiq, healthcarecomps on Texas and Houston agency counts; AMA prior-authorisation survey (Dec 2025); CAQH 2024 via icanotes (2026-02-23); Parachute Health AI Intake; Medallion 2025 enrollment report; Verisma Retrieval IQ (2026-04-29).

**Commercial field service.** ServiceChannel developer guide (proposals status, assign/escalate); ServiceChannel Trade Partner Guide; ServiceChannel Payment Services terms; ServiceChannel NTE e-book (2025-10-01); ServiceChannel "Get paid faster"; Facilio ServiceChannel review (2026).

**Construction and restoration.** Rabbet 2025 Construction Payments Report ($299B, 65 hours/month); Built survey, BusinessWire 2025-05-21; Acquidex Q1 2026 `[UNVERIFIED]`; Virtual NexGen `[vendor]`; ustechautomations 2026 and Projul on closeout duration; MRSC on retainage release; Pype Closeout; ENR, Procore agents (May 2026); PermitFlow Series B (2025-12-02); Wesco (2025-09-17); Supplement Experts, CapOut, ESXpress `[vendor]`; Texas Property Code §53.284; Texas Insurance Code chapter 542 via reyeslaw; Texas Insurance Code §4102.163 `[UNVERIFIED citation]`; Cotton Holdings; BMS CAT via ZoomInfo estimate.

**Insurance agencies and finance.** The Renewal Report on Applied Epic Conductor (2026-09-29); iireporter Applied Net; usecarly.com; Insurance Journal on Zywave agents (2026-02-23); Zywave agentic suite (2025-12-16); Sonant on Deloitte 2025 CSR time `[secondary]`; quotesweep on loss-run turnaround; nCino Loan PreCheck (June 2026); Casca Series A; Qualia Clear 2.0 (Sept 2025); RealPage–Rexera (2025-07-29); TaxDome Atlas (Spring 2026); Fieldguide Request Agent (Spring 2026); Asurint–Bullhorn (2026-07-07).

**Auto, equipment, other.** Dealertrack contracts-in-transit tips; Lendbuzz on stipulations; Dealer Bible; F&I Magazine, "The CIT fix"; Auto Finance News on lender-side AI; Withum dealership procedures; ServiceCPQ warranty automation `[vendor]`; Annata A365 Warranty; WickedFile (2026); Claimlane (2026); The Compliance Engine; KomplyOS; Uptick; Cvent BEO Uploader (2025-03-12); Planning Pod; Knack; 811spotter, Utilocate, SiteRight, 811Assist, GPRS SiteMap; Underground Infrastructure (Oct 2024); Fundrobin and Grantboost on subrecipient monitoring `[attribution UNVERIFIED]`; Forvis Mazars (Jan 2025); Fleetio Service Advisor; Motive Maintenance; Fleet Rabbit; Firm.app; MineralAnswers; Enverus mineral owner support; QuikStor (Apr 2026); Ai Lean; TrustLayer franchise; Lab Manager LIMS; American Tower FAQs.

**Logistics.** BCG procurement (above); McKinsey handoffs (above); Port Houston 4.3M TEU (2025); FMC detention and demurrage rule effective 2024-05-28; Freehand Series B (Manifest 2026); FreightClaims.com; SourceDay agents (mid-2026); HappyRobot valuation `[secondary]`.
