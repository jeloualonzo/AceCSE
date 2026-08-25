import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import {
  getNextRemainingQuestionIds,
  getQuestionPreview,
  orderQuestionSelection,
  type WorkspaceQuestion,
  type WorkspaceQuestionState,
} from '@/data/contentBankWorkspace';
import { QuestionStateBadge } from '@/components/contentBank/badges';
import { contentBankBatchPath } from '@/navigation/contentBankRoutes';
import type { Difficulty } from '@/types';
import { Link } from 'react-router-dom';

/**
 * The question picker for one family.
 *
 * Scoped by the route rather than by a dropdown: the family is already decided
 * by the time you get here, so the picker cannot accidentally mix two families
 * into one batch. Only `remaining` questions are selectable — a question already
 * claimed by a batch shows which batch has it instead, so the answer to "why
 * can't I pick this one" is on screen rather than implied by a disabled control.
 *
 * The selection is an ordered list, not a set: every control writes it back
 * through {@link orderQuestionSelection}, so the batch that comes out is the
 * same whichever order the boxes were ticked in.
 */

const ALL = 'All';
type StateFilter = typeof ALL | WorkspaceQuestionState;
type StructureFilter = typeof ALL | 'structured' | 'legacy';
type DifficultyFilter = typeof ALL | Difficulty;

const FILTER_CLASS =
  'min-h-[38px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const CHIP_CLASS =
  'inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-400';

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="flex min-w-[130px] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={FILTER_CLASS}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FamilyQuestionPicker({
  questions,
  selectedIds,
  onChangeSelection,
}: {
  questions: readonly WorkspaceQuestion[];
  selectedIds: readonly string[];
  onChangeSelection: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(ALL);
  const [structure, setStructure] = useState<StructureFilter>(ALL);
  const [state, setState] = useState<StateFilter>('remaining');
  const [nextCount, setNextCount] = useState('10');
  const normalizedQuery = query.trim().toLowerCase();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visibleQuestions = useMemo(
    () =>
      questions.filter((item) => {
        if (difficulty !== ALL && item.question.difficulty !== difficulty) return false;
        if (structure !== ALL && (item.question.structuredExplanation ? 'structured' : 'legacy') !== structure) return false;
        if (state !== ALL && item.state !== state) return false;
        if (!normalizedQuery) return true;
        return [item.question.id, item.question.question, item.question.topic, item.question.subtopic ?? ''].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      }),
    [difficulty, normalizedQuery, questions, state, structure],
  );
  const visibleRemaining = visibleQuestions.filter((item) => item.state === 'remaining');
  const allRemaining = questions.filter((item) => item.state === 'remaining');

  /** Single write path, so no control can leave the selection out of order. */
  const select = (ids: Iterable<string>) => onChangeSelection(orderQuestionSelection(questions, ids));

  const toggle = (item: WorkspaceQuestion) => {
    if (item.state !== 'remaining') return;
    const next = new Set(selected);
    if (next.has(item.question.id)) next.delete(item.question.id);
    else next.add(item.question.id);
    select(next);
  };
  const selectNext = () => {
    const count = Number.parseInt(nextCount, 10);
    if (!Number.isFinite(count) || count <= 0) return;
    select(getNextRemainingQuestionIds({ questions: visibleQuestions }, count));
  };

  return (
    <section aria-labelledby="question-picker-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="question-picker-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select questions for the next batch
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {allRemaining.length === 0
              ? 'Every question in this family has been claimed by a batch. Nothing is left to select.'
              : `${allRemaining.length} ${allRemaining.length === 1 ? 'question is' : 'questions are'} still unclaimed. Only unclaimed questions can go into a new batch; the rest show which batch already has them.`}
          </p>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            <span data-testid="visible-question-count" className="text-slate-900 dark:text-white">
              {visibleQuestions.length}
            </span>{' '}
            shown
          </span>
          <span>
            <span data-testid="selected-question-count" className="text-slate-900 dark:text-white">
              {selectedIds.length}
            </span>{' '}
            selected
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="relative min-w-0 flex-[2] text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="mb-1.5 block">Search ID or question text</span>
            <Search className="pointer-events-none absolute left-3 top-[31px] h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, subtopic, or question preview"
              className="min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <FilterSelect
            label="Difficulty"
            value={difficulty}
            onChange={(value) => setDifficulty(value as DifficultyFilter)}
            options={[ALL, 'Easy', 'Medium', 'Hard']}
          />
          <FilterSelect
            label="Structure"
            value={structure}
            onChange={(value) => setStructure(value as StructureFilter)}
            options={[ALL, 'structured', 'legacy']}
          />
          <FilterSelect
            label="Refinement state"
            value={state}
            onChange={(value) => setState(value as StateFilter)}
            options={[ALL, 'remaining', 'in-progress', 'ready-for-qa', 'frozen']}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => select(allRemaining.map((item) => item.question.id))}
            disabled={allRemaining.length === 0}
            className={CHIP_CLASS}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Select all remaining ({allRemaining.length})
          </button>
          <button
            type="button"
            onClick={() => select(visibleRemaining.map((item) => item.question.id))}
            disabled={visibleRemaining.length === 0}
            className={CHIP_CLASS}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Select visible
          </button>
          <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Next N
            <input
              value={nextCount}
              onChange={(event) => setNextCount(event.target.value)}
              inputMode="numeric"
              className="min-h-[38px] w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={selectNext}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Select next N
          </button>
          <button
            type="button"
            onClick={() => onChangeSelection([])}
            disabled={selectedIds.length === 0}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-400 dark:hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/*
          Height-capped on purpose. A family can hold ninety unclaimed questions,
          and letting the table run its full length pushed the Create action so
          far down the page that the workflow read as missing. The header row
          sticks so the columns stay identified while scrolling.
        */}
        <div className="max-h-[30rem] overflow-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th scope="col" className="w-10 px-3 py-3">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-3 py-3 font-bold">
                  Question
                </th>
                <th scope="col" className="px-3 py-3 font-bold">
                  Difficulty
                </th>
                <th scope="col" className="px-3 py-3 font-bold">
                  Structure
                </th>
                <th scope="col" className="px-3 py-3 font-bold">
                  State
                </th>
                <th scope="col" className="px-3 py-3 font-bold">
                  Claimed by
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleQuestions.map((item) => {
                const canSelect = item.state === 'remaining';
                return (
                  <tr
                    key={item.question.id}
                    data-question-row={item.question.id}
                    className={`${canSelect ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20' : 'opacity-80'} text-slate-700 dark:text-slate-300`}
                  >
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.question.id}`}
                        checked={selected.has(item.question.id)}
                        disabled={!canSelect}
                        onChange={() => toggle(item)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="max-w-[420px] px-3 py-3 align-top">
                      <div className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">{item.question.id}</div>
                      <div className="mt-1 leading-5">{getQuestionPreview(item.question)}</div>
                    </td>
                    <td className="px-3 py-3 align-top">{item.question.difficulty}</td>
                    <td className="px-3 py-3 align-top">{item.question.structuredExplanation ? 'Structured' : 'Legacy'}</td>
                    <td className="px-3 py-3 align-top">
                      <QuestionStateBadge state={item.state} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      {item.batchIds.length === 0 ? (
                        <span className="text-slate-400">Unclaimed</span>
                      ) : (
                        <ul className="space-y-1">
                          {item.batchIds.map((batchId) => (
                            <li key={batchId}>
                              <Link
                                to={contentBankBatchPath(batchId)}
                                className="rounded font-mono text-[11px] font-semibold text-emerald-700 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
                              >
                                {batchId}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visibleQuestions.length === 0 && (
          <p className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">No questions match these filters.</p>
        )}
      </div>
    </section>
  );
}

export default FamilyQuestionPicker;
