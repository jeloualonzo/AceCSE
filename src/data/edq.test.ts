import { describe, expect, it } from 'vitest';
import { EDQ_ITEMS, edqApplicability, getEdqItem } from '@/data/edq';

describe('EDQ structure', () => {
  it('has exactly 20 items with unique ids', () => {
    expect(EDQ_ITEMS).toHaveLength(20);
    expect(new Set(EDQ_ITEMS.map((i) => i.id)).size).toBe(20);
  });

  it('every item offers 2–5 options with non-empty, unique text', () => {
    for (const item of EDQ_ITEMS) {
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.options.length).toBeLessThanOrEqual(5);
      expect(item.options.every((o) => o.trim().length > 0)).toBe(true);
      expect(new Set(item.options).size).toBe(item.options.length);
    }
  });

  it('covers the realistic CSE-EDQ categories (education, occupation, government service, eligibility, purpose)', () => {
    const prompts = EDQ_ITEMS.map((i) => i.prompt.toLowerCase()).join(' | ');
    for (const needle of [
      'sex',
      'civil status',
      'age bracket',
      'indigenous',
      'educational attainment',
      'honors',
      'employment',
      'job',
      'government',
      'appointment',
      'eligibility',
      'reason for taking',
    ]) {
      expect(prompts).toContain(needle);
    }
  });

  it('conditional items reference existing controlling items and real options', () => {
    for (const item of EDQ_ITEMS) {
      if (!item.condition) continue;
      const controller = getEdqItem(item.condition.dependsOn);
      expect(controller).toBeTruthy();
      for (const option of item.condition.appliesWhenAnyOf) {
        expect(controller?.options).toContain(option);
      }
    }
  });

  it('items sharing a groupLabel are adjacent (the instruction renders once per run)', () => {
    const labels = EDQ_ITEMS.map((i) => i.groupLabel ?? null);
    const seen = new Set<string>();
    let prev: string | null = null;
    for (const label of labels) {
      if (label && label !== prev) {
        expect(seen.has(label)).toBe(false); // a label never restarts later
        seen.add(label);
      }
      prev = label;
    }
  });
});

describe('EDQ conditional applicability', () => {
  it('unconditional items are always applicable', () => {
    expect(edqApplicability(getEdqItem('edq-01')!, {})).toBe('applicable');
  });

  it('is unknown while the controlling item is unanswered (item stays enabled)', () => {
    expect(edqApplicability(getEdqItem('edq-12')!, {})).toBe('unknown');
  });

  it('education pair is mutually exclusive: exactly one applies for any attainment', () => {
    const honors = getEdqItem('edq-07')!;
    const yearLevel = getEdqItem('edq-08')!;
    for (const attainment of getEdqItem('edq-06')!.options) {
      const answers = { 'edq-06': attainment };
      const states = [edqApplicability(honors, answers), edqApplicability(yearLevel, answers)];
      expect(states.filter((s) => s === 'applicable')).toHaveLength(1);
      expect(states.filter((s) => s === 'not-applicable')).toHaveLength(1);
    }
  });

  it('government-service items are not applicable for non-government examinees', () => {
    const answers = { 'edq-09': 'Private' };
    for (const id of ['edq-12', 'edq-13', 'edq-14', 'edq-15']) {
      expect(edqApplicability(getEdqItem(id)!, answers)).toBe('not-applicable');
    }
    // …and applicable for government employees
    const gov = { 'edq-09': 'Government' };
    for (const id of ['edq-12', 'edq-13', 'edq-14', 'edq-15']) {
      expect(edqApplicability(getEdqItem(id)!, gov)).toBe('applicable');
    }
  });

  it('eligibility detail applies only after answering Yes', () => {
    const item = getEdqItem('edq-17')!;
    expect(edqApplicability(item, { 'edq-16': 'No' })).toBe('not-applicable');
    expect(edqApplicability(item, { 'edq-16': 'Yes' })).toBe('applicable');
  });
});
