# Phase 5B Spelling Task Design

## Canonical task definition

Spelling remains a Clerical Ability semantic pool (`clerical-spelling`) with one shared task format (`shared_spelling_task`). The task definition will support the two authored variants already present in the bank: `correctly_spelled_word` and `misspelled_word`. It will also declare optional `No Error` support without adding `E. No Error` to any existing item.

The shared direction will be neutral and task-level: the examinee reads the listed words and selects the letter matching the item instruction. For a correctly-spelled item, the requested word is the correctly spelled word; for a misspelled-word item, it is the word containing the spelling error. If an item explicitly includes `No Error`, E is selected only when all listed words are correctly spelled. This wording does not claim to reproduce official CSC wording and contains no product or implementation language.

An original, unscored example may demonstrate the variant and No Error convention. It will be stored as task-definition metadata, not as a production question and not as a replacement item.

## Compact instance schema

Each of the 14 existing Spelling questions will receive canonical metadata and a compact task instance:

| Field | Value or rule |
|---|---|
| `taskInstance.kind` | `spelling` |
| `payload.taskDefinitionId` | `spelling_default` |
| `payload.instanceFormat` | `compact` |
| `payload.words` | Exact existing choice texts in authored A–E order |
| `payload.itemPrompt` | Short variant instruction derived from the existing task type |
| `payload.answerStructure` | `word_selection` |
| `payload.noErrorVariant` | `false` for all current records |
| `payload.migrationStatus` | `safe_compact_conversion` |
| `payload.sourcePromptPreserved` | `true` |
| `payload.choiceEncoding` | `direct_word_choices` |

The original `question` field, choices, correct option, explanations, references, and provenance remain intact. The compact renderer will show the short item instruction and rely on the existing choice renderer for the exact word options, preventing the repeated long sentence while avoiding duplicate word lists.

## Migration decision

All 14 existing Spelling records are independently answerable, use five choices, and clearly fall into one of the two controlled variants. They are therefore safe compact conversions rather than legacy full-prompt exceptions. No IDs are added, removed, or renamed. No word is corrected, normalized, re-capitalized, or reordered. No No Error option is fabricated.

## Runtime and presentation

Simulation allocation will continue to draw these records through the existing canonical `clerical-spelling` pool and will emit one pool block with `taskFormat: shared_spelling_task`, keeping selected Spelling IDs contiguous. The two historical splittable groups remain source/provenance records only and will not control selection.

Practice will receive a canonical Spelling task-format builder analogous to Filing, with all 14 existing IDs in one pool block and `config.taskFormat: shared_spelling_task`. The existing Practice flow will show the shared task context for the active item, preserve immediate explanations, and use a compact item renderer. Booklet rendering will use the existing generic pool/shared-context path and normal document flow; Filing-specific behavior remains unchanged.

## Validation and tests

The Spelling validator will enforce the 14-ID inventory, canonical pool membership, task-definition resolution, compact payload schema, exact choice/word preservation, variant consistency, optional No Error rules, five-choice integrity, forbidden user-visible language, and absence of historical group control. Regression tests will cover task metadata, compact rendering, No Error handling through a synthetic non-production fixture, practice/runtime pool blocks, contiguity, and frozen Filing gates.
