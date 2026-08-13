/**
 * Examinee Descriptive Questionnaire (EDQ) — the administrative section that
 * opens every real CSC booklet (and every AceCSE simulation).
 *
 * STRUCTURE: modeled on the recurring structure of actual CSE examinee
 * questionnaires (demographics → education → present occupation →
 * government service → eligibility → examination purpose), including the
 * real questionnaires' CONDITIONAL runs ("answer only the item that
 * applies…"). All wording is original AceCSE phrasing — the structure is the
 * reference, never a third-party reviewer's text.
 *
 * PRODUCT + PRIVACY CONTRACT:
 *  - These 20 items are NEVER scored. They exist so an examinee is not
 *    surprised on exam day when booklet items 1–20 ask about the examinee.
 *  - Responses are OPTIONAL and live only inside the local session object
 *    (localStorage via sessionStorage.ts). They are NEVER written to
 *    Firestore: `gradeSession` builds the Attempt from scored questionIds
 *    only, and the Attempt shape has no EDQ field. Do not add one.
 *  - Do not collect unnecessary personal information; this is simulation
 *    practice, not data collection.
 */

export interface EdqCondition {
  /** Id of the controlling EDQ item. */
  dependsOn: string;
  /** The item applies when the controlling answer is one of these options. */
  appliesWhenAnyOf: string[];
}

export interface EdqItem {
  /** Stable administrative id — never collides with question ids. */
  id: string;
  prompt: string;
  /** 2–5 numbered response options, as a booklet would list them. */
  options: string[];
  /**
   * Shared run label — adjacent items carrying the same groupLabel belong to
   * one instructed run; the instruction renders ONCE above the first item.
   */
  groupLabel?: string;
  /** Shared instruction for the run (rendered once, booklet-style). */
  instruction?: string;
  /** Generic applicability condition; absent = always applicable. */
  condition?: EdqCondition;
}

export type EdqApplicability = 'applicable' | 'not-applicable' | 'unknown';

/**
 * Generic conditional visibility: 'unknown' (controller unanswered) keeps an
 * item enabled — the examinee decides; 'not-applicable' disables it exactly
 * like the real questionnaire's "answer only the item that applies to you".
 */
export function edqApplicability(
  item: EdqItem,
  answers: Readonly<Record<string, string>>
): EdqApplicability {
  if (!item.condition) return 'applicable';
  const controlling = answers[item.condition.dependsOn];
  if (!controlling) return 'unknown';
  return item.condition.appliesWhenAnyOf.includes(controlling) ? 'applicable' : 'not-applicable';
}

export const EDQ_SECTION_ID = 'EDQ';
export const EDQ_SECTION_TITLE = 'Examinee Descriptive Questionnaire';

const EDUCATION = {
  HS: 'High school graduate',
  VOC: 'Vocational or technical certificate',
  UNDERGRAD: 'College undergraduate (some college units)',
  GRAD: 'College graduate',
  POSTGRAD: 'With postgraduate units or degree',
};

const EMPLOYMENT = {
  GOV: 'Government',
  PRIVATE: 'Private',
  SELF: 'Self-employed',
  NONE: 'Not presently employed',
};

const EMPLOYED = [EMPLOYMENT.GOV, EMPLOYMENT.PRIVATE, EMPLOYMENT.SELF];

const GOV_GROUP = 'GOVERNMENT SERVICE';
const GOV_INSTRUCTION =
  'Items 12 to 15 apply only to examinees presently employed in government. If you are not a government employee, leave these items blank and proceed to item 16.';

export const EDQ_ITEMS: readonly EdqItem[] = [
  // ---- Personal information -------------------------------------------------
  { id: 'edq-01', prompt: 'Sex', options: ['Male', 'Female'] },
  {
    id: 'edq-02',
    prompt: 'Civil status',
    options: ['Single', 'Married', 'Widowed', 'Legally separated or annulled'],
  },
  {
    id: 'edq-03',
    prompt: 'Age bracket you belong to',
    options: ['18–24 years old', '25–31 years old', '32–38 years old', '39–45 years old', 'More than 45 years old'],
  },
  {
    id: 'edq-04',
    prompt: 'Are you a member of an indigenous cultural community or indigenous peoples group?',
    options: ['Yes', 'No'],
  },
  // ---- Educational background ----------------------------------------------
  {
    id: 'edq-05',
    prompt: 'Year of last attendance in school',
    options: ['Within the last 2 years', '3–5 years ago', '6–10 years ago', '11–15 years ago', 'More than 15 years ago'],
  },
  {
    id: 'edq-06',
    prompt: 'Highest educational attainment',
    options: [EDUCATION.HS, EDUCATION.VOC, EDUCATION.UNDERGRAD, EDUCATION.GRAD, EDUCATION.POSTGRAD],
  },
  {
    id: 'edq-07',
    prompt: 'Academic honors or awards received upon graduation from college',
    options: ['Summa cum laude', 'Magna cum laude', 'Cum laude', 'Other academic award', 'None'],
    groupLabel: 'EDUCATIONAL BACKGROUND',
    instruction:
      'Items 7 and 8 — answer only the item that applies to your highest educational attainment. Leave the other item blank.',
    condition: { dependsOn: 'edq-06', appliesWhenAnyOf: [EDUCATION.GRAD, EDUCATION.POSTGRAD] },
  },
  {
    id: 'edq-08',
    prompt: 'If not a college graduate, highest year level completed in college',
    options: ['Did not attend college', 'First year', 'Second year', 'Third year', 'Fourth year'],
    groupLabel: 'EDUCATIONAL BACKGROUND',
    instruction:
      'Items 7 and 8 — answer only the item that applies to your highest educational attainment. Leave the other item blank.',
    condition: {
      dependsOn: 'edq-06',
      appliesWhenAnyOf: [EDUCATION.HS, EDUCATION.VOC, EDUCATION.UNDERGRAD],
    },
  },
  // ---- Present occupation ----------------------------------------------------
  {
    id: 'edq-09',
    prompt: 'Present employment status',
    options: [EMPLOYMENT.GOV, EMPLOYMENT.PRIVATE, EMPLOYMENT.SELF, EMPLOYMENT.NONE],
  },
  {
    id: 'edq-10',
    prompt: 'Type of present job',
    options: [
      'Professional, technical, or scientific',
      'General clerical or administrative support',
      'Trades and crafts',
      'Sales or services',
      'Others',
    ],
    groupLabel: 'PRESENT OCCUPATION',
    instruction: 'Items 10 and 11 apply only if you are presently employed.',
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: EMPLOYED },
  },
  {
    id: 'edq-11',
    prompt: 'Length of experience in your present job',
    options: ['Less than one year', 'One to two years', 'Three to four years', 'More than four years'],
    groupLabel: 'PRESENT OCCUPATION',
    instruction: 'Items 10 and 11 apply only if you are presently employed.',
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: EMPLOYED },
  },
  // ---- Government service (conditional block) --------------------------------
  {
    id: 'edq-12',
    prompt: 'Status of your present appointment in government',
    options: ['Permanent', 'Temporary', 'Casual', 'Contractual or job order', 'Coterminous'],
    groupLabel: GOV_GROUP,
    instruction: GOV_INSTRUCTION,
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: [EMPLOYMENT.GOV] },
  },
  {
    id: 'edq-13',
    prompt: 'Total length of your government service',
    options: ['Less than one year', 'One to two years', 'Three to five years', 'Six to ten years', 'More than ten years'],
    groupLabel: GOV_GROUP,
    instruction: GOV_INSTRUCTION,
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: [EMPLOYMENT.GOV] },
  },
  {
    id: 'edq-14',
    prompt: 'Level of government where you are presently employed',
    options: [
      'National government agency',
      'Local government unit',
      'Government-owned or -controlled corporation',
      'State university or college',
      'Constitutional office',
    ],
    groupLabel: GOV_GROUP,
    instruction: GOV_INSTRUCTION,
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: [EMPLOYMENT.GOV] },
  },
  {
    id: 'edq-15',
    prompt: 'Do you presently hold a supervisory position in government?',
    options: ['Yes', 'No'],
    groupLabel: GOV_GROUP,
    instruction: GOV_INSTRUCTION,
    condition: { dependsOn: 'edq-09', appliesWhenAnyOf: [EMPLOYMENT.GOV] },
  },
  // ---- Eligibility ------------------------------------------------------------
  {
    id: 'edq-16',
    prompt: 'Do you presently hold any civil service eligibility?',
    options: ['Yes', 'No'],
  },
  {
    id: 'edq-17',
    prompt: 'If yes, which eligibility do you hold?',
    options: [
      'Career Service Subprofessional',
      'Career Service Professional',
      'Eligibility under special laws (e.g. barangay official)',
      'Board or bar eligibility (RA 1080)',
      'Others',
    ],
    condition: { dependsOn: 'edq-16', appliesWhenAnyOf: ['Yes'] },
  },
  // ---- Examination purpose ------------------------------------------------------
  {
    id: 'edq-18',
    prompt: 'Main reason for taking this examination',
    options: [
      'To qualify for government employment',
      'To qualify for promotion or change of appointment status',
      'Requirement of my present position',
      'Personal or professional advancement',
      'Other reasons',
    ],
  },
  {
    id: 'edq-19',
    prompt: 'Number of times you have taken this level of the examination before',
    options: ['This is my first time', 'Once before', 'Twice before', 'Three or more times'],
  },
  {
    id: 'edq-20',
    prompt: 'Occupational category you intend to pursue in government service',
    options: [
      'Clerical or administrative support',
      'Professional or technical',
      'Trades, crafts, or general services',
      'Uniformed or protective services',
      'Undecided',
    ],
  },
];

const EDQ_BY_ID = new Map(EDQ_ITEMS.map((item) => [item.id, item]));

export function getEdqItem(id: string): EdqItem | undefined {
  return EDQ_BY_ID.get(id);
}

export function isEdqItemId(id: string): boolean {
  return EDQ_BY_ID.has(id);
}
