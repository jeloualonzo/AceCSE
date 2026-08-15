# Phase 5C Number Series Inventory

## Scope

The production bank contains **11** questions classified as `Number Series`. Every record is in `content/questions/numerical/`, has `questionType: number_sequence`, `questionFormat: number_sequence`, `taskFormat: number_sequence`, and is assigned to the canonical `numerical-number-sequence` pool. None belongs to a fixed context set.

All 11 current source stems use a terminal blank. This pass therefore represents the existing authored blank at the final one-based position; it does not manufacture middle blanks. The schema is designed to support any valid position and any sequence length for future items.

## Inventory

| ID | Source file | Subtopic | Authored sequence shape | Length | Missing position | Correct option |
|---|---|---|---|---:|---:|---|
| `num-0019` | `numerical/core.json` | Arithmetic Sequence | `4, 9, 14, 19, ___` | 5 | 5 | B |
| `num-0020` | `numerical/core.json` | Geometric Sequence | `3, 6, 12, 24, ___` | 5 | 5 | E |
| `num-0021` | `numerical/core.json` | Increasing Differences | `2, 5, 9, 14, 20, ___` | 6 | 6 | C |
| `num-0022` | `numerical/core.json` | Fibonacci Sequence | `1, 1, 2, 3, 5, 8, ___` | 7 | 7 | D |
| `num-0023` | `numerical/core.json` | Multiply-and-Add Pattern | `2, 5, 11, 23, ___` | 5 | 5 | E |
| `num-0024` | `numerical/core.json` | Perfect Squares | `1, 4, 9, 16, 25, ___` | 6 | 6 | A |
| `num-0025` | `numerical/core.json` | Interleaved Sequences | `3, 7, 4, 10, 5, 13, 6, ___` | 8 | 8 | C |
| `num-0026` | `numerical/core.json` | Second-Difference Pattern | `1, 3, 7, 13, 21, ___` | 6 | 6 | B |
| `num-0108` | `numerical/2026-08-06-2300-gemini-draft-import.json` | Differences as Consecutive Perfect Squares | `5, 6, 10, 19, 35, 60, ___` | 7 | 7 | A |
| `num-0137` | `numerical/2026-08-07-0030-web-export-w1.json` | Paired Equivalent Fractions Pattern | `2/4, 1/2, 2/6, 1/3, 2/8, 1/4, 2/10, ___` | 8 | 8 | A |
| `num-0147` | `numerical/2026-08-07-0100-web-export-w2.json` | Signed Fibonacci Variant — Subtraction Recurrence | `13, −21, 34, −55, 89, ___` | 6 | 6 | D |

The missing-position distribution is **position 5: 3 items; position 6: 4 items; position 7: 2 items; position 8: 2 items**. No current item uses positions 1–4, but the structured representation supports them without a renderer change.

## Classification safeguards

The two known analytical letter-series corrections remain outside this numeric pool. `ana-0038` and `ana-0040` are classified as `letter_sequence` in the `analytical-letter-sequence` pool, with `taskFormat: letter_sequence`. They are not Number Series records and will not be migrated here.

The canonical numeric pool already contains exactly these 11 IDs and no letter-series records. Historical `grp-num-series-01` and `grp-num-series-02` are splittable provenance groups; they will not control runtime selection or appear as separate semantic Practice concepts after the reusable pool-backed visibility filter is applied.

## Conservative migration decision

Each item will receive an additive `numberSeries` structure and a compact `taskInstance` payload. The sequence values will be stored in authored order, with `null` at the existing final blank and string values retained where exact notation matters, including fractions and the Unicode minus sign. Existing question text, choices, correct answers, explanations, steps, references, provenance, and IDs will remain unchanged. No middle blanks will be manufactured and no arithmetic content will be rewritten.
