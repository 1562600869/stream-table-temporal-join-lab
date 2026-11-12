import test from 'node:test';
import assert from 'node:assert/strict';
import { VersionedTable } from '../src/versionedTable.js';
import { joinVersioned, rejoinLateDimension } from '../src/temporalJoin.js';
test('versioned table getAsOf returns visible version', () => {
  const t = new VersionedTable();
  t.upsert('u1', { tier: 'A' }, 1000);
  t.upsert('u1', { tier: 'A+' }, 2500);
  assert.deepEqual(t.getAsOf('u1', 1200), { tier: 'A' });
  assert.deepEqual(t.getAsOf('u1', 2600), { tier: 'A+' });
  assert.equal(t.getAsOf('u1', 500), undefined);
});
test('temporal join attaches dimension as of event time', () => {
  const t = new VersionedTable();
  t.upsert('u1', { tier: 'A' }, 1000);
  t.upsert('u1', { tier: 'A+' }, 2500);
  const events = [ { id:1,key:'u1',ts:1200,amount:10 }, { id:3,key:'u1',ts:2600,amount:7 } ];
  const out = joinVersioned(events, t);
  assert.equal(out.length, 2);
  assert.equal(out[0].dim.tier, 'A');
  assert.equal(out[1].dim.tier, 'A+');
});
test('late dimension update produces corrections', () => {
  const t = new VersionedTable();
  t.upsert('u1', { tier: 'A' }, 1000);
  const events = [{ id:4, key:'u1', ts:1800, amount:3 }];
  const first = joinVersioned(events, t);
  assert.equal(first[0].dim.tier, 'A');
  t.upsert('u1', { tier: 'A+' }, 1500);
  const corrections = rejoinLateDimension(events, t);
  assert.ok(corrections.length >= 1);
  assert.equal(corrections[0].dim.tier, 'A+');
  assert.equal(corrections[0].id, 4);
});
