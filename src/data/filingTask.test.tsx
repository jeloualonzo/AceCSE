/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import type { Question } from '@/types';
import { loadContentCatalog } from '@/data/questionBank';
import { getSharedTaskDefinition } from '@/data/taxonomy';
import { buildFilingPracticeSession, buildSimulationSession } from '@/lib/examEngine';
import { FilingInstanceRenderer } from '@/components/exam/FilingInstanceRenderer';

afterEach(() => cleanup());

const subjects = ['Clerical Ability'] as const;

describe('Filing task architecture', () => {
  it('defines shared directions, examples, entity types, and provisional provenance', () => {
    const definition = getSharedTaskDefinition('filing_default');
    expect(definition?.title).toBe('Filing and Alphabetizing');
    expect(definition?.directions).toEqual(expect.any(String));
    expect(definition?.rules).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(definition?.examples).toHaveLength(2);
    expect(definition?.supportedEntityTypes).toEqual(expect.arrayContaining(['personal_name', 'business_name', 'numeric_entry']));
    expect(definition?.provenance).toMatch(/training representation|observed exam behavior/);
  });

  it('builds one canonical Filing task block with all 26 existing IDs', async () => {
    const session = await buildFilingPracticeSession('Subprofessional');
    expect(session.questionIds).toHaveLength(26);
    expect(new Set(session.questionIds).size).toBe(26);
    expect(session.config.taskFormat).toBe('shared_filing_task');
    expect(session.items).toEqual([
      expect.objectContaining({ kind: 'pool', poolId: 'clerical-filing', taskFormat: 'shared_filing_task', questionIds: session.questionIds }),
    ]);
    expect(session.questionIds.some((id) => id === 'cler-0001')).toBe(true);
  });

  it('keeps 11 compact instances and 15 legacy prompts in the live bank', async () => {
    const catalog = await loadContentCatalog(subjects);
    const filing = catalog.getQuestionsForSubject('Clerical Ability', 'Subprofessional').filter((question) => question.topic === 'Filing & Alphabetizing');
    expect(filing).toHaveLength(26);
    expect(filing.filter((question) => question.taskInstance?.payload?.instanceFormat === 'compact')).toHaveLength(11);
    expect(filing.filter((question) => question.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt')).toHaveLength(15);
    expect(filing.every((question) => question.id && question.choices.length >= 4 && question.choices.some((choice) => choice.id === question.correctOptionId))).toBe(true);
  });

  it('uses one canonical Filing block across multiple real-bank simulation seeds', async () => {
    const clericalCatalog = await loadContentCatalog(['Clerical Ability']);
    const seeds = ['filing-runtime-01', 'filing-runtime-02', 'filing-runtime-03', 'filing-runtime-04', 'filing-runtime-05'];
    for (const level of ['Professional', 'Subprofessional'] as const) {
      const catalog = await loadContentCatalog(level === 'Professional' ? ['Numerical Reasoning', 'Analytical Reasoning', 'Verbal Ability', 'General Information'] : ['Clerical Ability', 'Numerical Reasoning', 'Verbal Ability', 'General Information']);
      for (const seed of seeds) {
        const expectedCount = level === 'Professional' ? 150 : 145;
        const session = await buildSimulationSession(level, expectedCount, { seed, catalog });
        expect(session.questionIds).toHaveLength(expectedCount);
        expect(new Set(session.questionIds).size).toBe(expectedCount);
        const filingBlocks = (session.items ?? []).filter((item) => item.kind === 'pool' && item.poolId === 'clerical-filing');
        expect(filingBlocks.length).toBeLessThanOrEqual(1);
        for (const item of filingBlocks) {
          expect(item.kind).toBe('pool');
          if (item.kind !== 'pool') continue;
          expect(item.taskFormat).toBe('shared_filing_task');
          expect(item.questionIds.every((id) => clericalCatalog.getClassification(id)?.topic === 'Filing & Alphabetizing')).toBe(true);
        }
        expect((session.items ?? []).filter((item) => item.kind === 'group' && item.groupId.startsWith('grp-filing-'))).toHaveLength(0);
      }
    }
  });

  it('renders compact Filing entries and item prompt without repeating the old prose stem', () => {
    const question: Question = {
      id: 'filing-test',
      examLevel: 'Subprofessional',
      subject: 'Clerical Ability',
      topic: 'Filing & Alphabetizing',
      questionFormat: 'personal_name_filing',
      taskFormat: 'shared_filing_task',
      difficulty: 'Medium',
      question: 'Which of the following sets of names is arranged in correct alphabetical filing order?',
      taskInstance: {
        kind: 'filing',
        payload: {
          instanceFormat: 'compact',
          entries: ['Bautista, Rina M.', 'Bartolome, Leo A.'],
          itemPrompt: 'Which arrangement is in correct alphabetical filing order?',
        },
      },
      choices: [
        { id: 'A', text: 'A-B' },
        { id: 'B', text: 'B-A' },
        { id: 'C', text: 'A-A' },
        { id: 'D', text: 'B-B' },
        { id: 'E', text: 'None' },
      ],
      correctOptionId: 'B',
      explanation: 'B is correct.',
      tags: ['filing'],
    };
    render(<FilingInstanceRenderer question={question} />);
    expect(screen.getByText('Bautista, Rina M.')).toBeInTheDocument();
    expect(screen.getByText('Bartolome, Leo A.')).toBeInTheDocument();
    expect(screen.getByText('Which arrangement is in correct alphabetical filing order?')).toBeInTheDocument();
    expect(screen.queryByText('Which of the following sets of names is arranged in correct alphabetical filing order?')).not.toBeInTheDocument();
  });
});
