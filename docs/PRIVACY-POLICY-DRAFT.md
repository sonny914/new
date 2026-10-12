# Quiet Bands — Privacy Policy DRAFT (not published)

Status: draft for owner and legal review. `docs/` is served as a 404 (see `_redirects`), so this file is not public.
No `/privacy/` route exists yet on purpose: the bracketed facts below must be confirmed first.

## Verified data map (from source + Supabase schema inspection, 2026-10-12)

| Flow | What is collected | Where it goes | Verified? |
| --- | --- | --- | --- |
| Contact form `/work/` | intent, task description, optional who/how often/systems/what goes wrong/tried/artifacts/if gone/imagined build, name, optional business name, email, first-touch attribution (UTM, referrer, landing page) | Supabase `public.leads` (anon INSERT) | Source + schema verified |
| Lead scoring | lead fields excluding intake/attribution JSON | Netlify function `score-lead` → Anthropic Messages API → score written back to Supabase | Source verified; production env + success not verified |
| Analytics events | event name + small props (intent, source); never names/emails/text | `window.dataLayer`/`gtag`/`plausible` **if installed** (none found in page source), Supabase `rd_events` | Source verified; production tags not verified |
| Browser storage | `qb_attr_v1` (localStorage, attribution), `qb_sid_v1` (session id), `qb_pt_v1` (Pressure Test answers) | Visitor's browser; attribution + PT answers sent with a form submission | Source verified |
| Orb playground | nothing | stays in browser; no fetch, no storage | Source verified |
| Hosting logs | IP, UA, path, time | Netlify | Assumed from provider; retention unknown |
| Fonts | IP/UA to Google Fonts | Google | Source verified (fonts.googleapis.com) |
| Three.js | IP/UA to jsDelivr CDN | jsDelivr | Source verified |

## Open security item (verified live, NOT fixed)

`public.leads` has policy `Only authenticated can read` → `SELECT` to role `authenticated` using `true`.
Any account that can sign in to this Supabase project can read every lead. Not changed without owner authorization.
Before fixing: check whether public sign-up is enabled (Auth settings) and what legitimately reads leads (the
score-lead function uses the service role and is unaffected). Likely fix: drop the policy, or restrict it to an
explicit owner user id / role. Do not publish restricted-access claims in the policy until this is resolved.

## Questions to finalize before publishing
1. Legal entity "Quiet Bands LLC" and privacy contact jason@quietbands.com — confirm; business mailing address?
2. Is AI scoring enabled in production (ANTHROPIC_API_KEY set)? Anthropic org data-retention / training settings?
3. Any analytics tags (GA4/GTM/Plausible) actually installed in production? If none, say so.
4. Email, scheduling, payment providers used for training sessions or projects?
5. Are sessions recorded or transcribed?
6. Retention periods for leads, client files, logs, AI inputs/outputs, backups.
7. Confirm "we do not sell or share for targeted advertising" is accurate.
8. Effective date.

---

### Quiet Bands Privacy Policy

**Draft for review | Effective date [insert publication date]**

*Complete the bracketed items and verify the described practices before publication. This draft is for legal and operational review.*

Quiet Bands LLC ("Quiet Bands," "we," "us," or "our") is based in Houston, Texas. We provide AI education, hands-on training, custom software development, and related services. This Privacy Policy explains how we handle personal information through quietbands.com, our business communications, and the services described here.

When we process information for a client within a client-operated product, that client's privacy notice describes its handling of the information, and our agreement with the client governs our processing instructions. This policy covers our own business operations.

#### 1. Information we collect

We collect information you choose to provide, such as your name, email address, optional telephone number, business or creator name, and messages about your training needs or software project. If you work with us, this may also include materials you share for the engagement, correspondence, and service or billing records.

If you contact us through social media, we receive the profile details, comments, or messages that the platform makes available to us for that interaction.

Our website infrastructure may receive technical information such as your IP address, browser and device information, pages requested, referring page, timestamps, and error or security logs.

Please avoid sending passwords, account secrets, payment card numbers, sensitive personal information, or other people's personal data through a general inquiry form.

[Confirm the actual form fields, logs, uploaded materials, billing records, and social integrations collected in production. Remove categories that are not used.]

#### 2. How we use information

We use relevant information to respond to inquiries, discuss and provide services, communicate about an engagement, maintain business records, troubleshoot problems, and protect our website and systems.

If you choose to receive educational or promotional updates, we use your contact details for that purpose. You can unsubscribe using the instructions in a message or by contacting us. Service-related communications may continue when needed for an ongoing engagement.

[Confirm any marketing subscription process and distinguish it from submitting an ordinary inquiry.]

#### 3. Service providers and other disclosures

We share information with providers that support the relevant activity, such as hosting, data storage, email delivery, AI-assisted processing, scheduling, or payments. For example, a hosting provider processes technical request data; an inquiry-storage provider processes submitted contact details and messages; and an AI provider receives the information supplied for the enabled AI feature.

[Confirm the current provider list and data flows. Project notes identify Netlify for hosting and server functions, Supabase for inquiry storage, and Anthropic Claude for proposed or enabled inquiry analysis. Verify their production use, and add any email, scheduling, payment, analytics, or social automation providers actually used.]

We may also disclose relevant information to professional advisers, to comply with legal obligations, or when reasonably necessary to investigate fraud, protect rights, or respond to a security incident.

[Confirm where information is stored or processed and add any required international-transfer disclosures or safeguards.]

#### 4. AI tools and training sessions

Where enabled, AI-assisted tools may process inquiry text to produce summaries, categories, or suggested follow-up priorities. These outputs can be inaccurate. You can contact us to correct information about your inquiry or request review by a person.

[Confirm which AI features are enabled, which fields are sent, whether outputs affect access to services, and how human review works. State accurately whether Quiet Bands or its providers use submitted information for model training or improvement, including the relevant settings and retention terms.]

For client projects and training, the tools and permitted data use should be agreed for the engagement. A request to use one AI tool is not blanket permission to upload unrelated confidential material to other tools.

[Confirm whether sessions are recorded or transcribed. If so, describe the purpose, notice or consent process, recipients, and retention. Remove recording language if recording is not offered.]

#### 5. Cookies and the interactive playground

Cookies, browser storage, analytics, and embedded services can process information separately from an inquiry form. Browser settings can limit some cookies and stored data, although disabling them may affect site functions.

[List the technologies actually used, their purposes, and available controls. Confirm whether analytics, advertising pixels, embedded media, or tracking links are active. Describe the site's actual response to browser privacy signals and any required consent or opt-out controls.]

The orb playground demonstrates visual animation states. A label such as "thinking" does not, by itself, mean information is being sent to an AI service.

[Confirm whether orb settings and interactions stay in the browser, use local storage, or are transmitted or logged. Describe the verified behavior here.]

#### 6. Sale of information and targeted advertising

[Confirm the actual practice before publishing. If accurate, use: "We do not sell personal information or share it for targeted or cross-context behavioral advertising." If any activity qualifies as sale, sharing, or targeted advertising under applicable law, replace that statement with the relevant data categories, purposes, recipients, and working opt-out methods. Do not infer this from an absence of paid advertising.]

#### 7. How long we keep information

We retain information for the purposes described in this policy, considering ongoing inquiries and engagements, legal and accounting requirements, security needs, and the resolution of disputes. When retention is no longer necessary, information should be deleted or appropriately de-identified.

[Insert the retention periods or specific criteria actually used for inquiries, client files, logs, AI inputs and outputs, recordings, and backups. Confirm that deletion procedures support the published description.]

#### 8. Your choices and privacy requests

You can contact jason@quietbands.com to ask about your information or request access, correction, deletion, or a copy. Depending on your location and applicable law, you may also have rights to withdraw consent or opt out of certain sales, targeted advertising, or profiling that produces legally or similarly significant effects.

We may need reasonable information to verify your identity or an authorized representative's authority. We will respond within applicable legal time limits and explain any lawful reason we cannot fully fulfill a request.

If we decline a request, you may ask us to reconsider by emailing the same address with "Privacy Appeal" in the subject line. Where applicable law provides appeal rights, we will explain the appeal decision and how to contact the relevant regulator, including the Texas Attorney General where appropriate. We will not unlawfully discriminate against you for exercising your rights.

#### 9. Security

No internet transmission or storage system can be guaranteed completely secure. Please contact us if you believe information associated with our services has been exposed or misused.

[Describe safeguards actually implemented and verified, including relevant access controls and storage protections. Do not publish absolute security guarantees.]

#### 10. Children and external services

Our website and services are designed for creators and business owners and are not directed to children under 13. If you believe a child under 13 has provided personal information to us, contact jason@quietbands.com so we can investigate and take appropriate steps.

Our site may link to services or platforms operated by others. Their privacy notices govern their own collection and use of information. Our use of a provider to process information for us remains covered by the relevant disclosures in this policy.

#### 11. Changes and contact

We may update this policy as our practices change. We will post the revised version with an updated effective date and provide additional notice or obtain consent when applicable law requires it.

For questions or privacy requests, contact:

Quiet Bands LLC
Houston, Texas
jason@quietbands.com

[Confirm the legal business name and add a business mailing address where required.]

