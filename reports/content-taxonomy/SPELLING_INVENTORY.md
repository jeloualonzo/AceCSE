# Phase 5B Spelling Inventory

## Scope and starting state

This inventory covers every production question whose canonical topic is `Spelling` on branch `phase4-booklet`. The branch was synchronized from `origin/phase4-booklet` before inspection. The starting HEAD is recorded in the task execution log.

The production bank contains **14 Spelling questions** across two source files. Every record is independently answerable, uses five choices A–E, has a keyed answer, and currently has no `taskInstance`, `taskFormat`, or `questionFormat` field in the source question record. The canonical classification manifest already classifies all 14 as `shared_spelling_task` entries in pool `clerical-spelling`.

| Source file | IDs | Count |
|---|---|---:|
| `content/questions/clerical/core.json` | `cler-0012`, `cler-0013`, `cler-0014`, `cler-0015`, `cler-0016`, `cler-0017`, `cler-0018`, `cler-0019`, `cler-0034`, `seed-cler-002`, `cler-0046`, `cler-0047`, `cler-0048` | 13 |
| `content/questions/clerical/2026-08-06-2300-gemini-draft-import.json` | `cler-0055` | 1 |
| **Total** | 14 existing IDs | **14** |

## Existing task variants

The content divides into two controlled formats already present in the manifest:

| Controlled format | IDs | Count |
|---|---|---:|
| `correctly_spelled_word` | `cler-0012`, `cler-0014`, `cler-0016`, `cler-0018`, `cler-0034`, `cler-0046`, `cler-0048`, `cler-0055`, `seed-cler-002` | 9 |
| `misspelled_word` | `cler-0013`, `cler-0015`, `cler-0017`, `cler-0019`, `cler-0047` | 5 |
| `No Error` variant | None authored | 0 |

No record currently contains an authored `E. No Error` option. Therefore Phase 5B must not fabricate No Error options. The shared task definition may support the optional variant for future content, but the current migration has no No Error instances to convert.

## Historical groups and canonical pool

The historical content contains two splittable groups, each with a repeated shared direction:

| Historical group | IDs | Selection policy |
|---|---|---|
| `grp-spelling-01` / “Spelling — Set 1” | `cler-0012`–`cler-0018` | `splittable` |
| `grp-spelling-02` / “Spelling — Set 2” | `cler-0019`, `cler-0034`, `cler-0046`, `cler-0047`, `cler-0048`, `cler-0055`, `seed-cler-002` | `splittable` |

The canonical pool `clerical-spelling` already contains exactly these 14 IDs, with subject, question format, question type, and task format metadata. The canonical taxonomy already declares `spelling_default`, supporting `correctly_spelled_word` and `misspelled_word`, with optional No Error support. The current definition is minimal and references the historical group for directions; Phase 5B should extend it with natural shared directions, an original non-scored example if useful, explicit answer-structure metadata, and provenance wording without modifying Filing definitions.

## Conservative migration assessment

All 14 records are safe compact shared-task candidates because each asks the examinee to identify a correctly spelled or misspelled word from five existing choices, and the shared task direction can establish that action once. The migration must preserve each question ID, exact choice text including deliberate misspellings and capitalization, option order, correct option, explanation, reference/provenance, and any existing steps. The intended compact payload should carry the authored words and an explicit `itemPrompt` or controlled task variant only where needed; it must not rewrite the words or add No Error.

The expected Phase 5B migration is therefore **14 compact instances and 0 legacy full-prompt items**, subject to implementation-time checks that all exact source values remain unchanged. There are no true fixed-context Spelling sets to preserve: both historical sets are marked splittable, and runtime should use the canonical pool block rather than either historical group.

## Phase 5B quality requirements

The shared Spelling block should render its direction once, use neutral human-written language, avoid product or implementation terms, and present each word list in normal document flow without an emerald/tinted question card. Practice must remain individually answerable and retain immediate explanations. Runtime simulations and Practice must source Spelling through `clerical-spelling`, keep the selected Spelling items contiguous, and exclude historical `Spelling — Set 1` / `Spelling — Set 2` group remnants.
