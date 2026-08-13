/**
 * Examinee Descriptive Questionnaire (EDQ) — the administrative section that
 * opens every real CSC booklet (and every AceCSE simulation).
 *
 * PRODUCT + PRIVACY CONTRACT:
 *  - These 20 items are NEVER scored. They exist so an examinee is not
 *    surprised on exam day when booklet items 1–20 ask about the examinee
 *    rather than testing anything.
 *  - Responses are OPTIONAL and live only inside the local session object
 *    (localStorage via sessionStorage.ts). They are NEVER written to
 *    Firestore: `gradeSession` builds the Attempt from scored questionIds
 *    only, and the Attempt shape has no EDQ field. Do not add one.
 *  - Item wording is original AceCSE phrasing of standard demographic
 *    categories; it is representative, not a reproduction of any booklet.
 */

export interface EdqItem {
  /** Stable administrative id — never collides with question ids. */
  id: string;
  prompt: string;
  /** Numbered response options exactly as a booklet would list them. */
  options: string[];
}

export const EDQ_SECTION_ID = 'EDQ';
export const EDQ_SECTION_TITLE = 'Examinee Descriptive Questionnaire';

const YES_NO = ['Yes', 'No'];

export const EDQ_ITEMS: readonly EdqItem[] = [
  { id: 'edq-01', prompt: 'Sex', options: ['Male', 'Female'] },
  {
    id: 'edq-02',
    prompt: 'Civil status',
    options: ['Single', 'Married', 'Widowed', 'Separated / Annulled'],
  },
  {
    id: 'edq-03',
    prompt: 'Age bracket you belong to',
    options: ['18–24 years old', '25–31 years old', '32–38 years old', '39–45 years old', 'More than 45 years old'],
  },
  {
    id: 'edq-04',
    prompt: 'Highest educational attainment',
    options: [
      'College graduate',
      'Diploma or certificate course',
      'With master’s units',
      'Master’s degree',
      'With doctoral units or degree',
    ],
  },
  {
    id: 'edq-05',
    prompt: 'Year of last attendance in school',
    options: ['Within the last 2 years', '3–5 years ago', '6–10 years ago', 'More than 10 years ago'],
  },
  {
    id: 'edq-06',
    prompt: 'Academic honors received upon graduation',
    options: ['Summa cum laude', 'Magna cum laude', 'Cum laude', 'Other academic award', 'None / not applicable'],
  },
  {
    id: 'edq-07',
    prompt: 'Present employment',
    options: ['Government', 'Private', 'Self-employed', 'Not currently employed'],
  },
  {
    id: 'edq-08',
    prompt: 'Type of present job',
    options: [
      'Professional / technical / scientific',
      'General clerical',
      'Trades and crafts',
      'Others',
      'Not applicable',
    ],
  },
  {
    id: 'edq-09',
    prompt: 'Length of experience in your present job',
    options: ['Less than one year', 'One to two years', 'Three to four years', 'More than four years', 'Not applicable'],
  },
  {
    id: 'edq-10',
    prompt: 'Main reason for taking this examination',
    options: [
      'To qualify for government employment',
      'To qualify for promotion',
      'Requirement of present position',
      'Personal advancement',
      'Other reasons',
    ],
  },
  {
    id: 'edq-11',
    prompt: 'Is this your first time to take the Career Service Examination?',
    options: YES_NO,
  },
  {
    id: 'edq-12',
    prompt: 'If not your first time, how many times have you taken it before?',
    options: ['Not applicable — first time', 'Once', 'Twice', 'Three times or more'],
  },
  {
    id: 'edq-13',
    prompt: 'How did you prepare for this examination?',
    options: [
      'Self-review using books or reviewers',
      'Formal review center or class',
      'Online review materials or apps',
      'Group study',
      'No special preparation',
    ],
  },
  {
    id: 'edq-14',
    prompt: 'How long did you prepare for this examination?',
    options: ['Less than one month', 'One to three months', 'Four to six months', 'More than six months'],
  },
  {
    id: 'edq-15',
    prompt: 'Region where you currently reside',
    options: [
      'National Capital Region',
      'Luzon (outside NCR)',
      'Visayas',
      'Mindanao',
    ],
  },
  {
    id: 'edq-16',
    prompt: 'Are you currently holding a government position?',
    options: YES_NO,
  },
  {
    id: 'edq-17',
    prompt: 'If employed in government, what is your appointment status?',
    options: ['Permanent', 'Temporary / casual', 'Contract of service / job order', 'Not applicable'],
  },
  {
    id: 'edq-18',
    prompt: 'Monthly household income bracket',
    options: ['Below ₱15,000', '₱15,000–₱30,000', '₱30,001–₱60,000', 'Above ₱60,000'],
  },
  {
    id: 'edq-19',
    prompt: 'How did you learn about this examination schedule?',
    options: [
      'CSC website or official announcement',
      'Social media',
      'Friends, family, or co-workers',
      'News media',
      'Other sources',
    ],
  },
  {
    id: 'edq-20',
    prompt: 'Do you intend to take a higher-level Career Service Examination in the future?',
    options: ['Yes', 'No', 'Undecided'],
  },
];

const EDQ_BY_ID = new Map(EDQ_ITEMS.map((item) => [item.id, item]));

export function getEdqItem(id: string): EdqItem | undefined {
  return EDQ_BY_ID.get(id);
}

export function isEdqItemId(id: string): boolean {
  return EDQ_BY_ID.has(id);
}
