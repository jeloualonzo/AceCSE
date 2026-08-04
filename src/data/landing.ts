import type { Question } from '@/types';

/** Landing-page-only content types. The exam engine uses the canonical Question model in src/types. */

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

export interface SampleQuestion {
  category: 'Numerical' | 'Verbal' | 'Analytical' | 'General Info';
  question: Question;
}

/**
 * Real, fully-enriched questions from the production bank — the landing page
 * shows visitors exactly the teaching experience they get inside Practice.
 */
export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    "category": "Numerical",
    "question": {
      "id": "num-0001",
      "examLevel": "Both",
      "subject": "Numerical Reasoning",
      "topic": "Fractions",
      "subtopic": "Addition of Fractions",
      "difficulty": "Easy",
      "question": "What is 3/8 + 5/12?",
      "choices": [
        {
          "id": "A",
          "text": "19/24"
        },
        {
          "id": "B",
          "text": "1/2"
        },
        {
          "id": "C",
          "text": "8/20"
        },
        {
          "id": "D",
          "text": "7/12"
        }
      ],
      "correctOptionId": "A",
      "explanation": "To add fractions, you need a common denominator — a number that both 8 and 12 divide into evenly. The least common multiple of 8 and 12 is 24. Convert each fraction: 3/8 becomes 9/24 (multiply top and bottom by 3), and 5/12 becomes 10/24 (multiply top and bottom by 2). Now that the denominators match, simply add the numerators: 9 + 10 = 19. The answer is 19/24, which is already in its simplest form since 19 is prime.",
      "steps": [
        "Find the least common multiple (LCM) of 8 and 12: multiples of 8 are 8, 16, 24; multiples of 12 are 12, 24 — so LCM = 24.",
        "Convert 3/8 to 24ths: 3/8 × 3/3 = 9/24.",
        "Convert 5/12 to 24ths: 5/12 × 2/2 = 10/24.",
        "Add the numerators: 9/24 + 10/24 = 19/24. The denominator stays 24."
      ],
      "distractorExplanations": {
        "B": "1/2 = 12/24, which would only be correct if the fractions were added incorrectly — perhaps by averaging the numerators (3+5=8) and the denominators (8+12=20) and simplifying 8/20 = 2/5, which is still wrong. A common error is to add numerators and denominators directly.",
        "C": "8/20 results from the classic mistake of adding numerators together (3+5=8) and denominators together (8+12=20) — a method that does NOT work for fraction addition.",
        "D": "7/12 appears if someone only converts one fraction and adds incorrectly, or picks the wrong common denominator. Always convert both fractions to the same denominator before adding."
      },
      "tip": {
        "label": "Math Shortcut",
        "text": "LCM of two numbers = (first × second) ÷ GCD. Here GCD(8,12)=4, so LCM = 8×12÷4 = 24. Use this to find common denominators quickly."
      },
      "tags": [
        "fractions",
        "addition",
        "basic-operations",
        "LCM"
      ]
    }
  },
  {
    "category": "Verbal",
    "question": {
      "id": "verb-0051",
      "examLevel": "Both",
      "subject": "Verbal Ability",
      "topic": "Vocabulary",
      "subtopic": "Synonyms",
      "difficulty": "Medium",
      "question": "The senator's VOCIFEROUS objections during the committee hearing disrupted the proceedings for nearly an hour. VOCIFEROUS most nearly means:",
      "choices": [
        {
          "id": "A",
          "text": "Loud and forceful"
        },
        {
          "id": "B",
          "text": "Logical and well-reasoned"
        },
        {
          "id": "C",
          "text": "Polite but persistent"
        },
        {
          "id": "D",
          "text": "Vague and disorganized"
        }
      ],
      "correctOptionId": "A",
      "explanation": "Vociferous comes from the Latin 'vox' (voice) and 'ferre' (to carry), meaning clamoring or shouting loudly, especially in protest. A vociferous objection is one expressed with great volume and insistence—it is not merely strong in content but loud in delivery. The context of disrupting proceedings for an hour reinforces this: polite or quiet objections would not derail a hearing for that long. 'Loud and forceful' captures both the volume and the intensity. Logical (B) describes the quality of reasoning, not volume. Polite but persistent (C) contradicts the disruptive nature of the objection. Vague and disorganized (D) says nothing about volume or force.",
      "distractorExplanations": {
        "B": "'Logical and well-reasoned' describes the quality of an argument's content, not its volume or forcefulness. A vociferous objection may or may not be logical.",
        "C": "'Polite but persistent' implies courteous restraint—the opposite of the disruptive, clamoring quality that vociferous conveys.",
        "D": "'Vague and disorganized' describes the structure of an argument, not its volume or emotional intensity; vociferous implies clarity of feeling, if not of thought."
      },
      "tip": {
        "label": "Vocabulary Trick",
        "text": "VOX = voice (Latin). Vociferous, vocalist, vocabulary—all from the same root. A vociferous person carries their voice far and loud. Think: VOICE + FORCE = vociferous."
      },
      "reference": "Latin root: vox (voice) + ferre (to carry)",
      "tags": [
        "vocabulary",
        "synonyms",
        "latin-roots"
      ]
    }
  },
  {
    "category": "Analytical",
    "question": {
      "id": "ana-0041",
      "examLevel": "Both",
      "subject": "Analytical Reasoning",
      "topic": "Number and Letter Pattern",
      "subtopic": "Letter-to-Number Cipher (A1Z26)",
      "difficulty": "Easy",
      "question": "In a letter-code system: ACE = 1-3-5 and BED = 2-5-4. Using the same code, what is the code for ZIP?",
      "choices": [
        {
          "id": "A",
          "text": "26-9-16"
        },
        {
          "id": "B",
          "text": "26-10-16"
        },
        {
          "id": "C",
          "text": "25-9-16"
        },
        {
          "id": "D",
          "text": "26-9-17"
        }
      ],
      "correctOptionId": "A",
      "explanation": "This cipher assigns each letter its position number in the alphabet: A=1, B=2, C=3, ..., Z=26. Verification: ACE → A=1, C=3, E=5 → 1-3-5 ✓. BED → B=2, E=5, D=4 → 2-5-4 ✓. Applying the same rule: ZIP → Z=26, I=9, P=16 → 26-9-16. This is the A1Z26 cipher — the most fundamental letter-to-number encoding system.",
      "steps": [
        "Step 1: Decode the pattern from ACE=1-3-5: A is the 1st letter, C is the 3rd, E is the 5th. Each letter maps to its alphabetical position number.",
        "Step 2: Confirm with BED=2-5-4: B=2nd, E=5th, D=4th ✓.",
        "Step 3: Apply to ZIP: Z is the 26th letter → 26; I is the 9th → 9; P is the 16th → 16.",
        "Step 4: ZIP = 26-9-16."
      ],
      "distractorExplanations": {
        "B": "Using I=10 confuses I (9th letter) with J (10th letter) — I and J are commonly swapped.",
        "C": "Using Z=25 confuses Z (26th) with Y (25th) — both are near the end of the alphabet.",
        "D": "Using P=17 confuses P (16th letter) with Q (17th letter)."
      },
      "tip": {
        "label": "Remember",
        "text": "Anchor points for A1Z26: A=1, E=5, J=10, M=13, P=16, T=20, Z=26. Memorize these to quickly place other letters without counting from A each time."
      },
      "tags": [
        "cipher",
        "A1Z26",
        "letter-code",
        "easy"
      ]
    }
  },
  {
    "category": "General Info",
    "question": {
      "id": "gen-0051",
      "examLevel": "Both",
      "subject": "General Information",
      "topic": "Philippine History",
      "subtopic": "Philippine Revolution",
      "difficulty": "Medium",
      "question": "Who drafted and read the Act of Declaration of Philippine Independence on June 12, 1898 at Kawit, Cavite?",
      "choices": [
        {
          "id": "A",
          "text": "Emilio Aguinaldo"
        },
        {
          "id": "B",
          "text": "Ambrosio Rianzares Bautista"
        },
        {
          "id": "C",
          "text": "Apolinario Mabini"
        },
        {
          "id": "D",
          "text": "Artemio Ricarte"
        }
      ],
      "correctOptionId": "B",
      "explanation": "While Emilio Aguinaldo was the face of the revolution and the one who proclaimed Philippine independence, the intellectual heavy lifting for the declaration was done by Ambrosio Rianzares Bautista, Aguinaldo's War Counselor and Special Delegate. Bautista drafted the Act of Declaration of Philippine Independence and read it aloud to the crowd gathered at Aguinaldo's ancestral home in Kawit, Cavite on June 12, 1898 — between four and five o'clock in the afternoon. Ninety-eight persons signed the declaration. The national flag, sewn in Hong Kong by Marcela Agoncillo with her daughter Lorenza and Delfina Herboza, was hoisted publicly for the first time that afternoon, and the Marcha Nacional Filipina was played.",
      "distractorExplanations": {
        "A": "Aguinaldo proclaimed independence and was declared the Dictator and Supreme Chief of the Nation, but he did not draft or read the Act itself — that was Bautista's role as War Counselor and Special Delegate.",
        "C": "Apolinario Mabini — the 'Sublime Paralytic' and Aguinaldo's chief adviser — was not yet at Kawit when independence was proclaimed. He actually arrived later and reportedly objected to the proclamation as premature, preferring to negotiate from a stronger military position.",
        "D": "General Artemio Ricarte was present and addressed the crowd to explain the symbolism of the new flag's colors and markings, but he did not draft or read the formal Act of Declaration."
      },
      "tip": {
        "label": "Historical Note",
        "text": "June 12, 1898: Aguinaldo proclaimed, Bautista drafted and READ the Act, Mabini was NOT there (and objected later). The flag was made in Hong Kong by Marcela Agoncillo."
      },
      "reference": "National Historical Commission of the Philippines; Act of the Declaration of Philippine Independence, June 12, 1898",
      "tags": [
        "Philippine history",
        "independence",
        "1898",
        "Kawit",
        "Aguinaldo",
        "Bautista"
      ]
    }
  }
] as SampleQuestion[];

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
    description: 'Practice under full 170-item, 3-hour and 10-minute exam conditions or 165-item Subprofessional timing. Features full item navigation and zero distractions.',
    highlights: [
      'Exact time-limit enforcement and item distribution',
      'Item-palette navigation to revisit skipped questions',
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
