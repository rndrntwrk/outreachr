import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('public landing page explains the architecture as a technical execution trace', () => {
  for (const required of [
    'encrypted local SQLite vault',
    'signed bounded request',
    'execution-class router',
    'Worker isolate',
    'Workflow / Queue / Durable Object',
    'Sandbox / Container',
    'terminate / sleep / hibernate',
    'Cost per completed unit',
  ]) {
    assert.match(html, new RegExp(required.replaceAll('/', '\\/'), 'u'), required);
  }
});

test('public landing page retains the local authority and proposal-only boundaries', () => {
  assert.match(html, /The founder approves every consequential transition/u);
  assert.match(html, /cannot send, submit, publish, spend, sign, accept terms, or merge code/u);
});

test('public landing page does not use the superseded emotional or slogan framing', () => {
  for (const prohibited of [
    'A private execution system for one founder',
    'The boundary is deliberate',
    'Founder-operated. Local-first. Evidence-first.',
    'overwhelmed',
    'expensive materials',
  ]) {
    assert.doesNotMatch(html, new RegExp(prohibited.replaceAll('.', '\\.'), 'u'), prohibited);
  }
});
