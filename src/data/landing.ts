/** Landing-page-only content types. The exam engine uses the canonical Question model in src/types. */

export interface DiagnosticQuestion {
  id: string;
  category: 'Numerical' | 'Verbal' | 'Analytical' | 'General Info';
  level: 'Professional' | 'Subprofessional' | 'Both';
  question: string;
  passage?: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: {
    summary: string;
    steps: string[];
    keyTakeaway: string;
  };
}

export interface SubjectCoverage {
  id: string;
  title: string;
  code: string;
  description: string;
  itemCount: string;
  weight: string;
  levels: ('Professional' | 'Subprofessional')[];
  topics: string[];
}

export interface CoreFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  iconName: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const TRUST_INDICATORS = [
  { label: 'Professional & Subprofessional', detail: 'Covering 100% of CSE scope' },
  { label: 'Timed Practice Exams', detail: 'Exact item count & time limits' },
  { label: 'Detailed Explanations', detail: 'Step-by-step rationales for every item' },
];

export const SAMPLE_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'q-num-1',
    category: 'Numerical',
    level: 'Both',
    question: 'A team of 4 civil engineers can complete a road inspection survey in 15 days. How many days will it take 6 civil engineers working at the same rate to complete the same survey?',
    options: [
      { id: 'A', text: '8 days' },
      { id: 'B', text: '10 days' },
      { id: 'C', text: '12 days' },
      { id: 'D', text: '22.5 days' },
      { id: 'E', text: '9 days' },
    ],
    correctOptionId: 'B',
    explanation: {
      summary: 'This is an inverse proportion problem because increasing the number of workers decreases the time needed to complete the work.',
      steps: [
        'Formula: Workers × Days = Constant Total Worker-Days',
        'Total Work = 4 engineers × 15 days = 60 engineer-days',
        'New Days needed = Total Work / New number of engineers',
        'Days = 60 / 6 = 10 days',
      ],
      keyTakeaway: 'Remember: More workers take fewer days (Inverse proportion: W₁ × D₁ = W₂ × D₂).',
    },
  },
  {
    id: 'q-verb-1',
    category: 'Verbal',
    level: 'Both',
    question: 'Select the word or phrase that BEST completes the sentence adhering to formal administrative Philippine English rules:\n"The committee members __________ submitting their audited financial reports before the Friday deadline."',
    options: [
      { id: 'A', text: 'has been mandated to' },
      { id: 'B', text: 'are mandated to' },
      { id: 'C', text: 'is mandated for' },
      { id: 'D', text: 'were been mandated to' },
      { id: 'E', text: 'have mandated for' },
    ],
    correctOptionId: 'B',
    explanation: {
      summary: 'Subject-verb agreement: "committee members" is a plural noun phrase requiring a plural verb ("are").',
      steps: [
        'Identify the subject: "committee members" (plural).',
        'The prepositional modifier "members" makes the subject count as plural.',
        'Choose the matching plural active/passive auxiliary verb: "are mandated to".',
        'Option A and C use singular verbs ("has", "is"), while D is ungrammatical.',
      ],
      keyTakeaway: 'When collective nouns are pluralized (e.g., "committee members"), always match with a plural verb.',
    },
  },
  {
    id: 'q-ana-1',
    category: 'Analytical',
    level: 'Professional',
    question: 'Premise 1: All department division chiefs are required to attend the quarterly ethics seminar.\nPremise 2: Attorney Santos is a division chief.\nPremise 3: Everyone who attends the quarterly ethics seminar receives a compliance certificate.\nConclusion: Which of the following statements MUST be true?',
    options: [
      { id: 'A', text: 'Attorney Santos will receive a compliance certificate.' },
      { id: 'B', text: 'Attorney Santos is the head of the ethics committee.' },
      { id: 'C', text: 'Only division chiefs attend the quarterly ethics seminar.' },
      { id: 'D', text: 'Attorney Santos does not need to attend if she has prior compliance.' },
      { id: 'E', text: 'All seminar attendees are division chiefs.' },
    ],
    correctOptionId: 'A',
    explanation: {
      summary: 'Syllogism/Logical Deduction: Valid transitive conclusion.',
      steps: [
        'Premise 1 + 2: Atty. Santos is a division chief → She MUST attend the seminar.',
        'Premise 3: Seminar attendee → Receives a compliance certificate.',
        'Transitive rule: Atty. Santos attends → Atty. Santos receives a compliance certificate.',
        'Option C and E commit the fallacy of converse affirmation.',
      ],
      keyTakeaway: 'Follow categorical logic strictly: If A → B and B → C, then A → C.',
    },
  },
  {
    id: 'q-gen-1',
    category: 'General Info',
    level: 'Both',
    question: 'Under Republic Act No. 6713 (Code of Conduct and Ethical Standards for Public Officials and Employees), public officials must respond to letters, telegrams, or other communications sent by the public within how many working days from receipt?',
    options: [
      { id: 'A', text: '5 working days' },
      { id: 'B', text: '7 working days' },
      { id: 'C', text: '15 working days' },
      { id: 'D', text: '30 working days' },
      { id: 'E', text: '10 calendar days' },
    ],
    correctOptionId: 'C',
    explanation: {
      summary: 'Section 5(a) of R.A. 6713 mandates prompt action on public communications.',
      steps: [
        'R.A. 6713 Section 5(a): "Act promptly on letters and requests."',
        'All public officials and employees shall respond within fifteen (15) working days from receipt of communications.',
        'The response must contain the action taken on the request.',
      ],
      keyTakeaway: 'R.A. 6713 Section 5(a) explicitly specifies 15 working days as the statutory limit.',
    },
  },
];

export const SUBJECT_COVERAGE: SubjectCoverage[] = [
  {
    id: 'numerical',
    title: 'Numerical Ability',
    code: 'NUM',
    description: 'Evaluates basic mathematical operations, word problems, data interpretation, and speed calculations.',
    itemCount: 'approx. 40 items',
    weight: '25% of total exam',
    levels: ['Professional', 'Subprofessional'],
    topics: [
      'Basic Operations & Fractions',
      'Percentages, Ratios & Proportions',
      'Work, Rate & Distance Problems',
      'Algebraic Equations & Series',
      'Tables, Charts & Data Interpretation',
    ],
  },
  {
    id: 'verbal',
    title: 'Verbal Ability',
    code: 'VERB',
    description: 'Tests English and Filipino vocabulary, grammar, reading comprehension, and paragraph organization.',
    itemCount: 'approx. 50 items',
    weight: '30% of total exam',
    levels: ['Professional', 'Subprofessional'],
    topics: [
      'Vocabulary & Contextual Synonyms',
      'Grammar & Correct Usage',
      'Paragraph Organization & Coherence',
      'Reading Comprehension Passages',
      'Wasto at Tamang Gamit ng Salita',
    ],
  },
  {
    id: 'analytical',
    title: 'Analytical Ability',
    code: 'ANAL',
    description: 'Exclusive to the Professional level. Measures logical reasoning, syllogisms, pattern recognition, and data analysis.',
    itemCount: 'approx. 40 items',
    weight: '25% of total exam',
    levels: ['Professional'],
    topics: [
      'Word Association & Analogies',
      'Logical Reasoning & Syllogisms',
      'Number & Letter Series Patterns',
      'Data Sufficiency & Statement Assumptions',
      'Abstract Spatial Reasoning',
    ],
  },
  {
    id: 'clerical',
    title: 'Clerical Ability',
    code: 'CLER',
    description: 'Exclusive to the Subprofessional level. Assesses speed and accuracy in office procedures, filing, and coding.',
    itemCount: 'approx. 40 items',
    weight: '25% of total exam',
    levels: ['Subprofessional'],
    topics: [
      'Alphabetical & Subject Filing Rules',
      'Spelling & Proofreading Accuracy',
      'Clerical Coding & Matching',
      'Office Procedures & Record Keeping',
    ],
  },
  {
    id: 'geninfo',
    title: 'General Information & Laws',
    code: 'GEN',
    description: 'Mandatory subject covering statutory civil service knowledge, constitutional rights, and environmental awareness.',
    itemCount: 'approx. 20 items',
    weight: '20% of total exam',
    levels: ['Professional', 'Subprofessional'],
    topics: [
      '1987 Philippine Constitution (Bill of Rights)',
      'R.A. 6713 Code of Conduct & Ethical Standards',
      'Peace & Human Rights Concepts',
      'Environment Protection & Disaster Management',
    ],
  },
];

export const CORE_FEATURES: CoreFeature[] = [
  {
    id: 'simulation',
    title: 'Realistic Exam Simulation',
    subtitle: 'Simulate the exact pressure, timing, and format of the Civil Service Exam.',
    description: 'Practice under full 170-item, 3-hour and 10-minute exam conditions or 165-item Subprofessional timing. Features full item navigation, question flagging, and zero distractions.',
    highlights: [
      'Exact time-limit enforcement and item distribution',
      'Item-palette navigation to review skipped or flagged questions',
      'Realistic computer-assisted testing interface',
    ],
    iconName: 'Clock',
  },
  {
    id: 'explanations',
    title: 'Detailed Answer Explanations',
    subtitle: 'Learn the reasoning behind every question, not just the correct answer.',
    description: 'Every single practice item is accompanied by a thorough step-by-step rationale explaining why the correct choice is right and why distractor options are incorrect.',
    highlights: [
      'Step-by-step mathematical and logical breakdowns',
      'Grammar rule references and law citations (R.A. 6713, Constitution)',
      'Actionable key takeaways for quick pattern recognition',
    ],
    iconName: 'BookOpen',
  },
  {
    id: 'tracking',
    title: 'Progress Tracking',
    subtitle: 'Identify your weak spots and monitor improvement over time.',
    description: 'Get immediate post-exam diagnostics breaking down your accuracy per subject area. Focus your limited review time where it will impact your score the most.',
    highlights: [
      'Subject-level accuracy percentage breakdown',
      'Targeted recommendations based on historical performance',
      'Passing score benchmark tracking against the 80% CSC threshold',
    ],
    iconName: 'BarChart3',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'Exam Basics',
    question: 'What is the passing grade for the Philippine Civil Service Examination?',
    answer: 'The Civil Service Commission (CSC) sets the passing mark at 80.00%. To pass, you must demonstrate proficiency across all core subject areas tested in either the Professional or Subprofessional exam level.',
  },
  {
    category: 'Exam Basics',
    question: 'What is the difference between Professional and Subprofessional levels?',
    answer: 'The Professional level consists of 170 items (3 hours, 10 minutes) and includes Analytical Ability (logical reasoning, analogies, syllogisms). The Subprofessional level consists of 165 items (2 hours, 30 minutes) and replaces Analytical Ability with Clerical Ability (filing rules, spelling, clerical operations).',
  },
  {
    category: 'Product & Features',
    question: 'How realistic is the AceCSE Exam Simulator?',
    answer: 'AceCSE models the exact structural layout, timing constraints, subject distributions, and difficulty of the actual Civil Service Examination. The questions follow official CSC scopes and regulations.',
  },
  {
    category: 'Product & Features',
    question: 'Can I practice individual subjects instead of full-length mock exams?',
    answer: 'Yes. AceCSE allows you to select specific subject modules (e.g., Numerical Ability or R.A. 6713 General Info) for targeted practice with immediate answer feedback.',
  },
  {
    category: 'Access & Usage',
    question: 'Do I need to install any software to use AceCSE?',
    answer: 'No. AceCSE is a web-based platform that works on modern desktop browsers, tablets, and smartphones. Your practice history and test sessions stay synchronized.',
  },
  {
    category: 'Access & Usage',
    question: 'How do the answer explanations work?',
    answer: 'After completing a mock exam or answering a diagnostic question in practice mode, you can view step-by-step rationales, mathematical formulas, grammar rules, and legal provisions for every option.',
  },
];
