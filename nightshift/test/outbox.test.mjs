import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyOutbox, addProposal, validateProposal, applyApprovals, expireStale, clearedWork, prune } from '../src/outbox.mjs';

const email = (over = {}) => ({
  kind: 'email',
  title: 'Follow up with Acme Plumbing',
  why: 'Their quote form has no auto-reply (found on acmeplumbing.example/contact).',
  payload: { to: 'office@acmeplumbing.example', subject: 'Your quote form', body: 'Hi —\n\nReply STOP to opt out.' },
  ...over,
});

test('validates each kind and says what to fix', () => {
  assert.equal(validateProposal(email()), null);
  assert.match(validateProposal(email({ kind: 'tweet' })), /kind must be one of/);
  assert.match(validateProposal(email({ payload: { to: 'not-an-address', subject: 's', body: 'b' } })), /real email/);
  assert.match(validateProposal(email({ payload: { to: ['a@b.co', 'c@d.co', 'e@f.co', 'g@h.co', 'i@j.co', 'k@l.co'], subject: 's', body: 'b' } })), /at most 5/);
  assert.match(validateProposal({ kind: 'spend', title: 't', why: 'w', payload: { amount_usd: 0, vendor: 'x' } }), /positive/);
  assert.match(validateProposal({ kind: 'site', title: 't', why: 'w', payload: {} }), /details is required/);
  assert.match(validateProposal({ kind: 'post', title: '', why: 'w', payload: { channel: 'x', text: 'hi' } }), /title is required/);
});

test('ids increment and agent text is cleaned of comment markers', () => {
  const o = emptyOutbox();
  const a = addProposal(o, email({ title: 'Sneaky <!-- ns:P-0009 --> title' }));
  const b = addProposal(o, email());
  assert.equal(a.id, 'P-0001');
  assert.equal(b.id, 'P-0002');
  assert.ok(!a.title.includes('<!--'));
  assert.equal(a.status, 'pending');
  assert.throws(() => addProposal(o, email({ kind: 'nope' })));
});

test('only pending proposals can be approved', () => {
  const o = emptyOutbox();
  const a = addProposal(o, email());
  const b = addProposal(o, email());
  b.status = 'expired';
  const changed = applyApprovals(o, new Set(['P-0001', 'P-0002', 'P-0099']));
  assert.deepEqual(changed.map((p) => p.id), ['P-0001']);
  assert.equal(a.status, 'approved');
  assert.equal(b.status, 'expired');
});

test('unapproved proposals expire after the TTL', () => {
  const o = emptyOutbox();
  const old = addProposal(o, email(), new Date('2026-11-01T00:00:00Z'));
  const fresh = addProposal(o, email(), new Date('2026-11-09T00:00:00Z'));
  const expired = expireStale(o, new Date('2026-11-10T00:00:00Z'), 7);
  assert.deepEqual(expired.map((p) => p.id), [old.id]);
  assert.equal(fresh.status, 'pending');
});

test('cleared work is approved site/other, never executable kinds', () => {
  const o = emptyOutbox();
  const site = addProposal(o, { kind: 'site', title: 'New note', why: 'w', payload: { details: 'd' } });
  const mail = addProposal(o, email());
  applyApprovals(o, new Set([site.id, mail.id]));
  assert.deepEqual(clearedWork(o).map((p) => p.id), [site.id]);
});

test('prune keeps open proposals and recent history', () => {
  const o = emptyOutbox();
  const done = addProposal(o, email(), new Date('2026-09-01T00:00:00Z'));
  done.status = 'done';
  done.decidedAt = '2026-09-01T00:00:00Z';
  const open = addProposal(o, email(), new Date('2026-09-01T00:00:00Z'));
  prune(o, new Date('2026-11-01T00:00:00Z'), 30);
  assert.deepEqual(o.proposals.map((p) => p.id), [open.id]);
});
