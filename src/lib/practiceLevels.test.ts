import { describe, expect, it } from 'vitest';
import { SUBJECTS_BY_LEVEL } from '@/config/exam';
import { QUESTION_MANIFEST } from '@/data/questionBank';
import { practiceLevelOptions } from './practiceLevels';
import type { SubjectSupply } from '@/data/questionShape';
import type { Subject } from '@/types';

const supply = (professional: number, subprofessional: number, both: number): SubjectSupply => ({
  professional,
  subprofessional,
  both,
});

const ALL_SUBJECTS: Subject[] = [
  ...new Set([...SUBJECTS_BY_LEVEL.Professional, ...SUBJECTS_BY_LEVEL.Subprofessional]),
];

/**
 * There is no app-wide selected exam level any more, so Practice has to work
 * out for itself whether a subject selection genuinely offers a level choice.
 * Getting that wrong in either direction is a lie: one card where two pools
 * exist hides content, and two cards over one pool invents a distinction the
 * question bank cannot honour.
 */
describe('practiceLevelOptions', () => {
  it('gives a single-level subject one option, and it is not framed as a choice', () => {
    const professionalOnly = practiceLevelOptions(['Analytical Reasoning'], {
      'Analytical Reasoning': supply(108, 0, 15),
    });
    expect(professionalOnly).toEqual([
      { level: 'Professional', subjects: ['Analytical Reasoning'], supply: 123, levelIsLabelOnly: false },
    ]);

    const subprofessionalOnly = practiceLevelOptions(['Clerical Ability'], {
      'Clerical Ability': supply(0, 61, 0),
    });
    expect(subprofessionalOnly).toEqual([
      { level: 'Subprofessional', subjects: ['Clerical Ability'], supply: 61, levelIsLabelOnly: false },
    ]);
  });

  it('collapses to one option when both levels would draw an identical pool', () => {
    // Every question authored `examLevel: 'Both'`: the two levels are the same
    // 157 questions, so two buttons would be a manufactured difference.
    const options = practiceLevelOptions(['Numerical Reasoning'], {
      'Numerical Reasoning': supply(0, 0, 157),
    });
    expect(options).toEqual([
      { level: 'Professional', subjects: ['Numerical Reasoning'], supply: 157, levelIsLabelOnly: true },
    ]);
  });

  it('offers both levels as soon as one level-specific question exists', () => {
    const options = practiceLevelOptions(['Verbal Ability'], {
      'Verbal Ability': supply(1, 0, 198),
    });
    expect(options.map((option) => [option.level, option.supply, option.levelIsLabelOnly])).toEqual([
      ['Professional', 199, false],
      ['Subprofessional', 198, false],
    ]);
  });

  it('does not treat equal totals as an identical pool', () => {
    // 40 Professional-only vs 40 Subprofessional-only questions: same count,
    // zero overlap. A count comparison would wrongly collapse these.
    const options = practiceLevelOptions(['Verbal Ability'], {
      'Verbal Ability': supply(40, 40, 0),
    });
    expect(options).toHaveLength(2);
    expect(options.every((option) => option.levelIsLabelOnly)).toBe(false);
  });

  it('splits a mixed request per level and lists only the subjects that level tests', () => {
    const options = practiceLevelOptions(ALL_SUBJECTS, QUESTION_MANIFEST.subjects);

    expect(options.map((option) => option.level)).toEqual(['Professional', 'Subprofessional']);
    expect(options[0].subjects).toEqual([...SUBJECTS_BY_LEVEL.Professional]);
    expect(options[1].subjects).toEqual([...SUBJECTS_BY_LEVEL.Subprofessional]);
    // Analytical Reasoning is Professional-only and Clerical Ability is
    // Subprofessional-only, so neither list may contain the other's subject.
    expect(options[0].subjects).not.toContain('Clerical Ability');
    expect(options[1].subjects).not.toContain('Analytical Reasoning');
    expect(options.every((option) => option.levelIsLabelOnly)).toBe(false);
  });

  it('never returns a level with no subjects, or a subject the level does not test', () => {
    for (const subjects of [['Clerical Ability'], ['Analytical Reasoning'], ALL_SUBJECTS]) {
      for (const option of practiceLevelOptions(subjects as Subject[], QUESTION_MANIFEST.subjects)) {
        expect(option.subjects.length).toBeGreaterThan(0);
        for (const subject of option.subjects) {
          expect(SUBJECTS_BY_LEVEL[option.level]).toContain(subject);
        }
      }
    }
  });

  /**
   * Pins the current bank so the collapse is a measured fact, not an assumption
   * baked into the UI. If level-specific content is authored for a shared
   * subject later, this fails and the subject correctly gains a second option.
   */
  it('matches the real manifest: every shared subject is authored for both levels only', () => {
    const shared = SUBJECTS_BY_LEVEL.Professional.filter((subject) =>
      SUBJECTS_BY_LEVEL.Subprofessional.includes(subject)
    );
    expect(shared.length).toBeGreaterThan(0);

    for (const subject of shared) {
      const options = practiceLevelOptions([subject], QUESTION_MANIFEST.subjects);
      expect(options).toHaveLength(1);
      expect(options[0].levelIsLabelOnly).toBe(true);
      expect(options[0].supply).toBeGreaterThan(0);
    }
  });

  it('returns nothing for an empty selection rather than inventing a level', () => {
    expect(practiceLevelOptions([], QUESTION_MANIFEST.subjects)).toEqual([]);
  });

  it('reports zero supply honestly instead of hiding the option', () => {
    const options = practiceLevelOptions(['Clerical Ability'], {});
    expect(options).toEqual([
      { level: 'Subprofessional', subjects: ['Clerical Ability'], supply: 0, levelIsLabelOnly: false },
    ]);
  });
});
