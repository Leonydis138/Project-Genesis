import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchJson, readJsonResponse, withTimeout } from './http.ts';

test('readJsonResponse returns parsed JSON for successful responses', async () => {
  const res = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await readJsonResponse(res);
  assert.deepEqual(data, { ok: true });
});

test('fetchJson rejects structured errors for non-OK responses', async () => {
  const res = new Response(JSON.stringify({ error: 'bad request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(() => fetchJson('/api/test', { method: 'POST', body: JSON.stringify({}) }, { timeoutMs: 1000, allowEmpty: true }, res), {
    message: /bad request/i,
  });
});

test('withTimeout resolves a value within the timeout', async () => {
  const result = await withTimeout(Promise.resolve('done'), 1000);
  assert.equal(result, 'done');
});
