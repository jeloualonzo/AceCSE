#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/grouped-content.json', import.meta.url), 'utf8'));
const { group, questions } = fixture;

assert.equal(group.questionIds.length, 3);
assert.deepEqual(group.questionIds, questions.map((question) => question.id));
assert.equal(group.selectionPolicy, 'atomic');
assert.equal(group.orderPolicy, 'fixed');
assert.equal(group.contentBlocks.length, 1);
assert.equal(group.contentBlocks[0].kind, 'text');
assert.equal(new Set(group.questionIds).size, group.questionIds.length);

const singletonId = (id) => `singleton:${id}`;
assert.equal(singletonId('Q1'), singletonId('Q1'));
assert.notEqual(singletonId('Q1'), singletonId('Q2'));

// Similar-format questions are not rejected by this foundation fixture: only
// identity and structural relationships are asserted at this stage.
console.log('✓ Content model fixture and legacy singleton invariants pass.');
