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
    const visibleDefinition = JSON.stringify({ title: definition?.title, directions: definition?.directions, rules: definition?.rules, examples: definition?.examples });
    expect(visibleDefinition).not.toMatch(/AceCSE|simulator|training platform|apply the AceCSE|authored task|prefixes supported/i);
    expect(visibleDefinition).not.toContain('Example: Example:');
    expect(JSON.stringify(definition?.examples)).toMatch(/filed before|filed after/i);
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

  it('keeps 13 compact instances and 13 legacy prompts in the live bank', async () => {
    const catalog = await loadContentCatalog(subjects);
    const filing = catalog.getQuestionsForSubject('Clerical Ability', 'Subprofessional').filter((question) => question.topic === 'Filing & Alphabetizing');
    expect(filing).toHaveLength(26);
    expect(filing.filter((question) => question.taskInstance?.payload?.instanceFormat === 'compact')).toHaveLength(13);
    expect(filing.filter((question) => question.taskInstance?.payload?.instanceFormat === 'legacy_full_prompt')).toHaveLength(13);
    expect(filing.every((question) => question.id && question.choices.length >= 4 && question.choices.some((choice) => choice.id === question.correctOptionId))).toBe(true);
  });

  it('uses compact permutations only for safe ordering items and preserves answer keys', async () => {
    const catalog = await loadContentCatalog(subjects);
    const expectedCorrect: Record<string, string> = {
      'cler-0001': 'D', 'cler-0004': 'A', 'cler-0006': 'C', 'cler-0007': 'A',
      'cler-0008': 'A', 'cler-0010': 'B', 'cler-0011': 'D',
    };
    const candidateEntryIds = ['cler-0059', 'cler-0060', 'seed-cler-001'];
    for (const [id, correct] of Object.entries(expectedCorrect)) {
      const question = catalog.getQuestion(id);
      expect(question?.choices.every((choice) => /^\d(?:-\d){3}$/.test(choice.text))).toBe(true);
      expect(question?.correctOptionId).toBe(correct);
    }
    for (const id of candidateEntryIds) {
      const question = catalog.getQuestion(id);
      const entries = question?.taskInstance?.payload?.entries;
      expect(question?.choices.some((choice) => /[A-Za-z]/.test(choice.text))).toBe(true);
      expect(question?.choices.every((choice) => !/^\d(?:-\d){3}$/.test(choice.text))).toBe(true);
      if (id === 'seed-cler-001') {
        expect(entries).toHaveLength(4);
        expect((entries as string[]).every((entry) => question?.choices.some((choice) => choice.text === entry))).toBe(true);
        expect(question?.choices.filter((choice) => !(entries as string[]).includes(choice.text))).toHaveLength(1);
      } else {
        expect(entries).toHaveLength(5);
        expect(new Set(question?.choices.map((choice) => choice.text))).toEqual(new Set(entries as string[]));
      }
    }
    const filing = catalog.getQuestionsForSubject('Clerical Ability', 'Subprofessional').filter((question) => question.topic === 'Filing & Alphabetizing');
    const visible = JSON.stringify(filing.map((question) => ({ question: question.question, choices: question.choices, taskInstance: question.taskInstance })));
    expect(visible).not.toMatch(/AceCSE|simulator|training platform/i);
  });

  it('covers the suffix convention, cleaned explanations, and low-priority stem wording', async () => {
    const catalog = await loadContentCatalog(subjects);
    const suffix = catalog.getQuestion('cler-0010');
    expect(suffix?.taskInstance?.payload?.itemNote).toMatch(/unsuffixed name first.*Jr\., Sr\., and III/i);
    const cleanedIds = ['cler-0006', 'cler-0007', 'cler-0036', 'cler-0038', 'cler-0039', 'cler-0040', 'cler-0041'];
    for (const id of cleanedIds) {
      expect(catalog.getQuestion(id)?.explanation).not.toMatch(/wait|let me recheck|actually|correcting|keyed answer|let me correct/i);
    }
    expect(catalog.getQuestion('cler-0002')?.question).not.toMatch(/four names/i);
    expect(catalog.getQuestion('cler-0003')?.question).toMatch(/following/i);
    const seed = catalog.getQuestion('seed-cler-001');
    expect(seed?.correctOptionId).toBe('C');
    expect(seed?.choices.find((choice) => choice.id === 'C')?.text).toBe('Del Fierro, Ana');
    expect(seed?.taskInstance?.payload?.entries).toEqual(['De La Cruz, Juan', 'Del Rosario, Maria', 'De Castro, Pedro', 'Del Fierro, Ana']);
    expect(seed?.explanation).toMatch(/Del Fierro.*third|third.*Del Fierro/i);
    expect(seed?.steps?.join(' ')).not.toMatch(/De la Rama|hypothetical|actually|wait/i);
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
          itemPrompt: 'Select the correct filing order.',
          itemNote: 'For this item, keep the entries as shown.',
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
    const { container } = render(<FilingInstanceRenderer question={question} />);
    expect(screen.getByText('Bautista, Rina M.')).toBeInTheDocument();
    expect(screen.getByText('Bartolome, Leo A.')).toBeInTheDocument();
    expect(screen.getByText('Select the correct filing order.')).toBeInTheDocument();
    expect(screen.getByText('For this item, keep the entries as shown.')).toBeInTheDocument();
    expect(screen.queryByText('Which of the following sets of names is arranged in correct alphabetical filing order?')).not.toBeInTheDocument();
    expect(screen.queryByText('Filing item')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('mb-6');
    expect(container.firstChild).not.toHaveClass('rounded-lg');
    expect(container.firstChild).not.toHaveClass('bg-emerald-50/50');
    expect(container.firstChild).not.toHaveClass('border-l-4');
  });
});
