import { describe, expect, it } from 'vitest';
import { loadContentCatalog } from './questionBank';
import { getStructuredExplanation, isValidStructuredExplanation } from './structuredExplanation';

const FROZEN_PILOT_IDS = ['num-0019', 'num-0020', 'num-0021'] as const;
const BATCH2_IDS = ['num-0022', 'num-0023', 'num-0024'] as const;
const BATCH3_IDS = ['num-0025', 'num-0026'] as const;
const BATCH4_IDS = ['num-0108', 'num-0137', 'num-0147'] as const;
const SPELLING_PILOT_IDS = [
  'cler-0055', 'cler-0012', 'cler-0013', 'cler-0014', 'cler-0015',
  'cler-0016', 'cler-0017', 'cler-0018', 'cler-0019', 'cler-0046', 'cler-0047', 'cler-0048',
] as const;
const FILING_BATCH1_IDS = [
  'cler-0053', 'cler-0054', 'cler-0058', 'cler-0059', 'cler-0060',
  'cler-0001', 'cler-0002', 'cler-0003', 'cler-0004', 'cler-0005',
] as const;
const FILING_BATCH2_IDS = [
  'cler-0006', 'cler-0007', 'cler-0008', 'cler-0009', 'cler-0010', 'cler-0011',
  'cler-0031', 'cler-0032', 'cler-0033', 'seed-cler-001', 'cler-0036', 'cler-0037',
  'cler-0038', 'cler-0039',
] as const;
const GRAMMAR_PILOT_IDS = ['verb-0059', 'verb-0060', 'verb-0061', 'verb-0062'] as const;
const CLERICAL_OPERATIONS_STRUCTURED_IDS = [
  'cler-0020', 'cler-0021', 'cler-0022', 'cler-0023', 'cler-0024',
  'cler-0025', 'cler-0042', 'cler-0043', 'cler-0044', 'cler-0045',
  'cler-0051', 'cler-0057', 'seed-cler-003',
] as const;
const ALL_NUMBER_SERIES_IDS = [...FROZEN_PILOT_IDS, ...BATCH2_IDS, ...BATCH3_IDS, ...BATCH4_IDS];
const AGE_PROBLEMS_IDS = ['num-0030', 'num-0031', 'num-0142'] as const;
const AVERAGES_BATCH1_IDS = ['num-0046', 'num-0047', 'num-0049', 'num-0145', 'num-0146', 'seed-num-005'] as const;
const BASIC_ALGEBRA_BATCH1_IDS = ['num-0048', 'num-0050', 'num-0073', 'num-0085', 'num-0094', 'num-0122', 'num-0128', 'num-0140', 'num-0150'] as const;
const DECIMALS_BATCH1_IDS = ['num-0002', 'num-0005', 'num-0066', 'num-0127'] as const;
const FRACTIONS_BATCH1_IDS = ['num-0001', 'num-0004', 'num-0006', 'num-0007', 'num-0008', 'num-0067', 'num-0070', 'num-0103', 'num-0115', 'num-0119', 'num-0138', 'num-0139'] as const;
const ALL_STRUCTURED_IDS = [...ALL_NUMBER_SERIES_IDS, ...AGE_PROBLEMS_IDS, ...AVERAGES_BATCH1_IDS, ...BASIC_ALGEBRA_BATCH1_IDS, ...DECIMALS_BATCH1_IDS, ...FRACTIONS_BATCH1_IDS, ...SPELLING_PILOT_IDS, ...FILING_BATCH1_IDS, ...FILING_BATCH2_IDS, ...GRAMMAR_PILOT_IDS, ...CLERICAL_OPERATIONS_STRUCTURED_IDS];
const ALL_SUBJECTS = [
  'Analytical Reasoning',
  'Clerical Ability',
  'General Information',
  'Numerical Reasoning',
  'Verbal Ability',
] as const;

function containsLegacySolutionHeading(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((block) => {
    if (typeof block !== 'object' || block === null) return false;
    const candidate = block as Record<string, unknown>;
    if (candidate.type === 'heading' && candidate.text === 'Solution') return true;
    return containsLegacySolutionHeading(candidate.blocks);
  });
}

const EXPECTED_FROZEN_BLOCKS = {
  "num-0019": [
    {
      "type": "correct_answer",
      "text": "B — 24"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The difference between each consecutive term is **5**:\n\n\\[\n9-4=5,\\quad 14-9=5,\\quad 19-14=5\n\\]\n\nContinuing the same pattern:\n\n\\[\n19+5=24\n\\]\n\nTherefore, the missing term is **24**."
    }
  ],
  "num-0020": [
    {
      "type": "correct_answer",
      "text": "E — 48"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is multiplied by **2**:\n\n\\[\n3\\times2=6,\\quad 6\\times2=12,\\quad 12\\times2=24\n\\]\n\nContinuing the same pattern:\n\n\\[\n24\\times2=48\n\\]\n\nTherefore, the missing term is **48**."
    }
  ],
  "num-0021": [
    {
      "type": "correct_answer",
      "text": "C — 27"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences increase by **1** each time:\n\n\\[\n5-2=3,\\quad 9-5=4,\\quad 14-9=5,\\quad 20-14=6\n\\]\n\nThe next difference is therefore **7**:\n\n\\[\n20+7=27\n\\]\n\nTherefore, the missing term is **27**."
    }
  ]
} as const;

const EXPECTED_BATCH2_BLOCKS = {
  "num-0022": [
    {
      "type": "correct_answer",
      "text": "D — 13"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is the sum of the two preceding terms:\n\n\\[\n1+1=2\n\\]\n\\[\n1+2=3\n\\]\n\\[\n2+3=5\n\\]\n\\[\n3+5=8\n\\]\n\nTherefore, the next term is:\n\n\\[\n5+8=13\n\\]\n\nThe missing term is **13**."
    }
  ],
  "num-0023": [
    {
      "type": "correct_answer",
      "text": "E — 47"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Each term is multiplied by **2**, then **1** is added:\n\n\\[\n2\\times2+1=5\n\\]\n\\[\n5\\times2+1=11\n\\]\n\\[\n11\\times2+1=23\n\\]\n\nContinuing the same pattern:\n\n\\[\n23\\times2+1=47\n\\]\n\nThe missing term is **47**."
    }
  ],
  "num-0024": [
    {
      "type": "correct_answer",
      "text": "A — 36"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The terms are consecutive perfect squares:\n\n\\[\n1=1^2,\\quad 4=2^2,\\quad 9=3^2,\\quad 16=4^2,\\quad 25=5^2\n\\]\n\nTherefore, the next term is:\n\n\\[\n6^2=36\n\\]\n\nThe missing term is **36**."
    }
  ]
} as const;

const EXPECTED_BATCH3_BLOCKS = {
  "num-0025": [
    {
      "type": "correct_answer",
      "text": "C — 16"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The series contains two interleaved sequences. The odd-position terms increase by **1**:\n\n\\[\n3,\\ 4,\\ 5,\\ 6\n\\]\n\nThe even-position terms increase by **3**:\n\n\\[\n7,\\ 10,\\ 13,\\ \\_\\_\\_\n\\]\n\nSince the missing term is in the 8th position, continue the even-position pattern:\n\n\\[\n13+3=16\n\\]\n\nThe missing term is **16**."
    }
  ],
  "num-0026": [
    {
      "type": "correct_answer",
      "text": "B — 31"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences between consecutive terms are:\n\n\\[\n3-1=2,\\quad 7-3=4,\\quad 13-7=6,\\quad 21-13=8\n\\]\n\nThe differences increase by **2**, so the next difference is **10**:\n\n\\[\n21+10=31\n\\]\n\nThe missing term is **31**."
    }
  ]
} as const;

const EXPECTED_BATCH4_BLOCKS = {
  "num-0108": [
    {
      "type": "correct_answer",
      "text": "A — 96"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The differences between consecutive terms are consecutive perfect squares:\n\n\\[\n6-5=1=1^2\n\\]\n\\[\n10-6=4=2^2\n\\]\n\\[\n19-10=9=3^2\n\\]\n\\[\n35-19=16=4^2\n\\]\n\\[\n60-35=25=5^2\n\\]\n\nThe next difference is therefore:\n\n\\[\n6^2=36\n\\]\n\nSo the next term is:\n\n\\[\n60+36=96\n\\]\n\nThe missing term is **96**."
    }
  ],
  "num-0137": [
    {
      "type": "correct_answer",
      "text": "A — 1/5"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The terms form pairs in which the second fraction is the simplified form of the first:\n\n\\[\n\\frac{2}{4}\\rightarrow\\frac{1}{2}\n\\]\n\\[\n\\frac{2}{6}\\rightarrow\\frac{1}{3}\n\\]\n\\[\n\\frac{2}{8}\\rightarrow\\frac{1}{4}\n\\]\n\nTherefore:\n\n\\[\n\\frac{2}{10}\\div2=\\frac{1}{5}\n\\]\n\nThe missing term is **1/5**."
    }
  ],
  "num-0147": [
    {
      "type": "correct_answer",
      "text": "D — −144"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The absolute values follow the Fibonacci pattern:\n\n\\[\n13+21=34\n\\]\n\\[\n21+34=55\n\\]\n\\[\n34+55=89\n\\]\n\nThe signs alternate:\n\n\\[\n+,\\ -,\\ +,\\ -,\\ +\n\\]\n\nTherefore, the next absolute value is:\n\n\\[\n55+89=144\n\\]\n\nThe next sign is negative, so the missing term is **−144**."
    }
  ]
} as const;

const EXPECTED_AGE_PROBLEMS_BLOCKS = {
  'num-0030': [
    {
      type: 'correct_answer',
      text: 'D — 8',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let S be the son’s current age, so Mia’s age is 3S. In 8 years, their ages will be S + 8 and 3S + 8. Since Mia will then be twice her son’s age:\n\n\\[\n3S+8=2(S+8)\n\\]\n\n\\[\n3S+8=2S+16\n\\]\n\n\\[\n3S-2S+8=2S-2S+16\n\\]\n\n\\[\nS+8=16\n\\]\n\n\\[\nS+8-8=16-8\n\\]\n\n\\[\nS=8\n\\]\n\nTherefore, the son is **8 years old**.\n\nCheck:\n\n\\[\n3(8)=24\n\\]\n\n\\[\n24+8=32,\\quad 8+8=16,\\quad 32=2(16)\n\\]\n\nThe answer is **8**.',
    },
  ],
  'num-0031': [
    {
      type: 'correct_answer',
      text: 'D — 33',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let S be Sonia’s current age, so Romy’s age is S + 12. In 2 years, their ages will be S + 2 and S + 14. Their future ages must total 58:\n\n\\[\n(S+2)+(S+14)=58\n\\]\n\n\\[\n2S+16=58\n\\]\n\n\\[\n2S+16-16=58-16\n\\]\n\n\\[\n2S=42\n\\]\n\n\\[\n\\frac{2S}{2}=\\frac{42}{2}\n\\]\n\n\\[\nS=21\n\\]\n\nRomy is 12 years older:\n\n\\[\n21+12=33\n\\]\n\nTherefore, Romy is **33 years old**.\n\nCheck:\n\n\\[\n23+35=58\n\\]\n\nso the future-age condition is satisfied.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Both people become 2 years older, so their combined age increases by 4.\n\n\\[\n58-4=54\n\\]\n\nTheir current ages total **54**, and Romy is **12 years older** than Sonia.\n\nRemove the 12-year difference:\n\n\\[\n54-12=42\n\\]\n\nThe remaining 42 is split equally between the two ages:\n\n\\[\n42\\div2=21\n\\]\n\nSo Sonia is **21 years old**.\n\nAdd the 12-year difference back to get Romy’s age:\n\n\\[\n21+12=33\n\\]\n\nCheck the current total:\n\n\\[\n21+33=54\n\\]\n\nAnd in two years:\n\n\\[\n23+35=58\n\\]\n\nTherefore, Romy is **33 years old**.',
    },
  ],
  'num-0142': [
    {
      type: 'correct_answer',
      text: 'C — 30 years old',
    },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let I be the intern’s current age. The assistant is I + 10, and the supervisor is I + 25. In 5 years, their ages will be I + 5, I + 15, and I + 30. Their future ages must total 110:\n\n\\[\n(I+5)+(I+15)+(I+30)=110\n\\]\n\n\\[\n3I+50=110\n\\]\n\n\\[\n3I+50-50=110-50\n\\]\n\n\\[\n3I=60\n\\]\n\n\\[\n\\frac{3I}{3}=\\frac{60}{3}\n\\]\n\n\\[\nI=20\n\\]\n\nThe assistant is 10 years older than the intern:\n\n\\[\n20+10=30\n\\]\n\nTherefore, the assistant is **30 years old**.\n\nCheck:\n\n\\[\n25+35+50=110\n\\]\n\nThe future-age condition is satisfied.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'In 5 years, three people gain a total of 15 years.\n\n\\[\n110-15=95\n\\]\n\nTheir current ages total **95**.\n\nExpress everyone relative to the youngest:\n\n\\[\nIntern=x,\\quad Assistant=x+10,\\quad Supervisor=x+25\n\\]\n\nThe age differences above the intern are:\n\n\\[\n0+10+25=35\n\\]\n\nRemove those differences:\n\n\\[\n95-35=60\n\\]\n\nThe remaining 60 is divided equally among the three people:\n\n\\[\n60\\div3=20\n\\]\n\nSo the intern is **20**.\n\nThe assistant is 10 years older:\n\n\\[\n20+10=30\n\\]\n\nTherefore, the assistant is **30 years old**.',
    },
  ],
} as const;

const EXPECTED_BASIC_ALGEBRA_BLOCKS = {
  "num-0048": [
    {
      "type": "correct_answer",
      "text": "A — x = 15"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Solve the equation by first expanding the expression in parentheses:\n\n\\[\n3x-7=2(x+4)\n\\]\n\n\\[\n3x-7=2x+8\n\\]\n\nSubtract \\(2x\\) from both sides:\n\n\\[\n3x-2x-7=2x-2x+8\n\\]\n\n\\[\nx-7=8\n\\]\n\nAdd 7 to both sides:\n\n\\[\nx-7+7=8+7\n\\]\n\n\\[\nx=15\n\\]\n\nCheck:\n\n\\[\n3(15)-7=38\n\\]\n\n\\[\n2(15+4)=38\n\\]\n\nBoth sides are equal, so **x = 15**."
    }
  ],
  "num-0050": [
    {
      "type": "correct_answer",
      "text": "D — x = 12"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "The two equations contain \\(+y\\) and \\(-y\\), so add them to eliminate \\(y\\):\n\n\\[\nx+y=20\n\\]\n\n\\[\n3x-y=28\n\\]\n\nAdding the equations:\n\n\\[\n(x+y)+(3x-y)=20+28\n\\]\n\n\\[\n4x=48\n\\]\n\nDivide both sides by 4:\n\n\\[\n\\frac{4x}{4}=\\frac{48}{4}\n\\]\n\n\\[\nx=12\n\\]\n\nTherefore, **x = 12**.\n\nCheck:\n\n\\[\n12+y=20\n\\]\n\nso \\(y=8\\). Then:\n\n\\[\n3(12)-8=28\n\\]\n\nBoth equations are satisfied."
    }
  ],
  "num-0073": [
    {
      "type": "correct_answer",
      "text": "C — 19"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Translate the statement into an equation:\n\n\\[\n2n+13=51\n\\]\n\nSubtract 13 from both sides:\n\n\\[\n2n+13-13=51-13\n\\]\n\n\\[\n2n=38\n\\]\n\nDivide both sides by 2:\n\n\\[\n\\frac{2n}{2}=\\frac{38}{2}\n\\]\n\n\\[\nn=19\n\\]\n\nCheck:\n\n\\[\n2(19)+13=38+13=51\n\\]\n\nTherefore, the number is **19**."
    }
  ],
  "num-0085": [
    {
      "type": "correct_answer",
      "text": "D — 33"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Let the middle integer be \\(n\\). Then the three consecutive integers are:\n\n\\[\nn-1,\\quad n,\\quad n+1\n\\]\n\nTheir sum is:\n\n\\[\n(n-1)+n+(n+1)=96\n\\]\n\nThe \\(-1\\) and \\(+1\\) cancel:\n\n\\[\n3n=96\n\\]\n\nDivide both sides by 3:\n\n\\[\n\\frac{3n}{3}=\\frac{96}{3}\n\\]\n\n\\[\nn=32\n\\]\n\nSo the three integers are:\n\n\\[\n31,\\quad32,\\quad33\n\\]\n\nTherefore, the largest integer is **33**.\n\nCheck:\n\n\\[\n31+32+33=96\n\\]"
    },
    {
      "type": "collapsible",
      "title": "Mental Shortcut",
      "content": "For three consecutive integers, the middle integer is the average.\n\n\\[\n96\\div3=32\n\\]\n\nSo 32 is the middle number. The largest is one step higher:\n\n\\[\n32+1=33\n\\]\n\nTherefore, the largest integer is **33**."
    }
  ],
  "num-0094": [
    {
      "type": "correct_answer",
      "text": "B — 32"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Consecutive even integers differ by 2. Let the smallest integer be \\(n\\). Then the three integers are:\n\n\\[\nn,\\quad n+2,\\quad n+4\n\\]\n\nTheir sum is:\n\n\\[\nn+(n+2)+(n+4)=90\n\\]\n\nCombine like terms:\n\n\\[\n3n+6=90\n\\]\n\nSubtract 6 from both sides:\n\n\\[\n3n+6-6=90-6\n\\]\n\n\\[\n3n=84\n\\]\n\nDivide both sides by 3:\n\n\\[\n\\frac{3n}{3}=\\frac{84}{3}\n\\]\n\n\\[\nn=28\n\\]\n\nSo the three integers are:\n\n\\[\n28,\\quad30,\\quad32\n\\]\n\nTherefore, the largest integer is **32**.\n\nCheck:\n\n\\[\n28+30+32=90\n\\]"
    },
    {
      "type": "collapsible",
      "title": "Mental Shortcut",
      "content": "For three consecutive even integers, the middle integer is the average.\n\n\\[\n90\\div3=30\n\\]\n\nSo 30 is the middle integer. Since consecutive even integers differ by 2, the largest is:\n\n\\[\n30+2=32\n\\]\n\nTherefore, the largest integer is **32**."
    }
  ],
  "num-0122": [
    {
      "type": "correct_answer",
      "text": "E — 6"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Because the family has an equal number of adults and children, think of each adult and child as one pair.\n\nOne adult and one child cost:\n\n\\[\n₱60+₱35=₱95\n\\]\n\nThe family paid ₱285, so the number of pairs is:\n\n\\[\n₱285\\div₱95=3\n\\]\n\nEach pair contains 2 people:\n\n\\[\n3\\times2=6\n\\]\n\nTherefore, there are **6 people** in the family.\n\nCheck:\n\n\\[\n3\\times₱60+3\\times₱35=₱180+₱105=₱285\n\\]"
    }
  ],
  "num-0128": [
    {
      "type": "correct_answer",
      "text": "B — 2 kWh"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Electrical energy is power multiplied by time. First find the total power of the 10 lamps:\n\n\\[\n10\\times40=400\n\\]\n\nThe total power is **400 W**. Convert watts to kilowatts:\n\n\\[\n400\\div1000=0.4\n\\]\n\nSo the total power is **0.4 kW**. The lamps run for 5 hours each day:\n\n\\[\n0.4\\times5=2\n\\]\n\nTherefore, the lamps consume **2 kWh per day**."
    }
  ],
  "num-0140": [
    {
      "type": "correct_answer",
      "text": "A — −6"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Translate the statement into an inequality:\n\n\\[\n-3n-8>7\n\\]\n\nAdd 8 to both sides:\n\n\\[\n-3n-8+8>7+8\n\\]\n\n\\[\n-3n>15\n\\]\n\nDivide both sides by \\(-3\\). Because we divide by a negative number, the inequality sign reverses:\n\n\\[\n\\frac{-3n}{-3}<\\frac{15}{-3}\n\\]\n\n\\[\nn<-5\n\\]\n\nNow check the choices. Only \\(-6\\) is less than \\(-5\\):\n\n\\[\n-6<-5\n\\]\n\nCheck in the original inequality:\n\n\\[\n(-3)(-6)-8=18-8=10\n\\]\n\n\\[\n10>7\n\\]\n\nTherefore, the number could be **−6**."
    }
  ],
  "num-0150": [
    {
      "type": "correct_answer",
      "text": "B — 25"
    },
    {
      "type": "paragraph",
      "label": "Rationale",
      "text": "Let \\(b\\) be the number of beetles collected by Ranger B. Ranger A has 5 more beetles, so Ranger A has \\(b+5\\) beetles.\n\nThe total number of spots is:\n\n\\[\n2(b+5)+7b=100\n\\]\n\nExpand:\n\n\\[\n2b+10+7b=100\n\\]\n\nCombine like terms:\n\n\\[\n9b+10=100\n\\]\n\nSubtract 10 from both sides:\n\n\\[\n9b+10-10=100-10\n\\]\n\n\\[\n9b=90\n\\]\n\nDivide both sides by 9:\n\n\\[\n\\frac{9b}{9}=\\frac{90}{9}\n\\]\n\n\\[\nb=10\n\\]\n\nSo Ranger B has 10 beetles and Ranger A has:\n\n\\[\n10+5=15\n\\]\n\nThe combined collection is:\n\n\\[\n10+15=25\n\\]\n\nTherefore, there are **25 beetles** in total.\n\nCheck:\n\n\\[\n2(15)+7(10)=30+70=100\n\\]"
    }
  ]
} as const;

const EXPECTED_AVERAGES_BLOCKS = {
  'num-0046': [
    { type: 'correct_answer', text: 'B — 80' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The average is the total of all scores divided by the number of scores.\n\nFirst, add the five scores:\n\n\\[\n82+75+91+68+84=400\n\\]\n\nThen divide by 5:\n\n\\[\n400\\div5=80\n\\]\n\nTherefore, the average score is **80**.',
    },
  ],
  'num-0047': [
    { type: 'correct_answer', text: 'C — 85.75' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The third exam has weight 2, so its score counts twice. Multiply each score by its weight:\n\n\\[\n78\\times1=78\n\\]\n\n\\[\n85\\times1=85\n\\]\n\n\\[\n90\\times2=180\n\\]\n\nAdd the weighted scores:\n\n\\[\n78+85+180=343\n\\]\n\nAdd the weights:\n\n\\[\n1+1+2=4\n\\]\n\nThen divide the weighted total by the total weight:\n\n\\[\n343\\div4=85.75\n\\]\n\nTherefore, the weighted average is **85.75**.',
    },
  ],
  'num-0049': [
    { type: 'correct_answer', text: 'D — 37' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'An average of 38 for 5 numbers means their total must be:\n\n\\[\n38\\times5=190\n\\]\n\nThe four known numbers total:\n\n\\[\n30+42+35+46=153\n\\]\n\nSo the fifth number is the difference:\n\n\\[\n190-153=37\n\\]\n\nTherefore, the missing number is **37**.',
    },
  ],
  'num-0145': [
    { type: 'correct_answer', text: 'C — 26' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'There are 5 numbers in the set, so the average is their sum divided by 5:\n\n\\[\nx=\\frac{2+4x+6+8+10}{5}\n\\]\n\nCombine the fixed numbers:\n\n\\[\nx=\\frac{26+4x}{5}\n\\]\n\nMultiply both sides by 5:\n\n\\[\n5x=26+4x\n\\]\n\nSubtract \\(4x\\) from both sides:\n\n\\[\n5x-4x=26+4x-4x\n\\]\n\n\\[\nx=26\n\\]\n\nTherefore, **x = 26**.\n\nCheck:\n\n\\[\n\\frac{2+104+6+8+10}{5}=\\frac{130}{5}=26\n\\]\n\nThe average is indeed **26**.',
    },
  ],
  'num-0146': [
    { type: 'correct_answer', text: 'C — 49' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The first 8 assessments have an average of 85, so their total is:\n\n\\[\n85\\times8=680\n\\]\n\nAfter the ninth assessment, the average is 81 for 9 assessments, so the new total is:\n\n\\[\n81\\times9=729\n\\]\n\nThe ninth score is the increase in total:\n\n\\[\n729-680=49\n\\]\n\nTherefore, the ninth assessment score is **49**.\n\nCheck:\n\n\\[\n680+49=729\n\\]\n\nand\n\n\\[\n729\\div9=81\n\\]',
    },
  ],
  'seed-num-005': [
    { type: 'correct_answer', text: 'C — 98' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'The first 4 department heads have an average of 88, so their total score is:\n\n\\[\n88\\times4=352\n\\]\n\nWith 5 department heads, the new average is 90, so the total score must be:\n\n\\[\n90\\times5=450\n\\]\n\nThe fifth score is the difference between the new total and the original total:\n\n\\[\n450-352=98\n\\]\n\nTherefore, the fifth department head scored **98**.\n\nCheck:\n\n\\[\n352+98=450\n\\]\n\nand\n\n\\[\n450\\div5=90\n\\]',
    },
  ],
} as const;

const EXPECTED_DECIMALS_BLOCKS = {
  'num-0002': [
    { type: 'correct_answer', text: 'A — 15.3' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'To multiply decimals, first multiply the numbers without the decimal points:\n\n\\[\n425\\times36=15300\n\\]\n\nThere are 3 decimal places altogether: 2 in 4.25 and 1 in 3.6. Place the decimal 3 places from the right:\n\n\\[\n15300=15.300=15.3\n\\]\n\nTherefore, **4.25 × 3.6 = 15.3**.',
    },
  ],
  'num-0005': [
    { type: 'correct_answer', text: 'B — 1,620' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Move the decimal point three places to the right in both numbers so the divisor becomes a whole number:\n\n\\[\n56.7\\times1000=56700\n\\]\n\n\\[\n0.035\\times1000=35\n\\]\n\nSo:\n\n\\[\n56.7\\div0.035=56700\\div35\n\\]\n\nNow divide:\n\n\\[\n56700\\div35=1620\n\\]\n\nTherefore, **56.7 ÷ 0.035 = 1,620**.',
    },
  ],
  'num-0066': [
    { type: 'correct_answer', text: 'C — 55.925' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Align the decimal places by adding trailing zeros:\n\n\\[\n48.750+16.800-9.625\n\\]\n\nAdd the first two numbers:\n\n\\[\n48.750+16.800=65.550\n\\]\n\nThen subtract:\n\n\\[\n65.550-9.625=55.925\n\\]\n\nTherefore, **48.75 + 16.8 − 9.625 = 55.925**.',
    },
  ],
  'num-0127': [
    { type: 'correct_answer', text: 'A — 13.653' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Factor out 123:\n\n\\[\n123(0.1+0.01+0.001)\n\\]\n\nAdd the decimal multipliers:\n\n\\[\n0.1+0.01+0.001=0.111\n\\]\n\nSo:\n\n\\[\n123\\times0.111=13.653\n\\]\n\nTherefore, **123 × 0.1 + 123 × 0.01 + 123 × 0.001 = 13.653**.',
    },
  ],
} as const;

const EXPECTED_FRACTIONS_BLOCKS = {
  'num-0001': [
    { type: 'correct_answer', text: 'E — 19/24' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Find a common denominator for 8 and 12. Their least common multiple is 24.\n\n\\[\n\\frac{3}{8}=\\frac{9}{24}\n\\]\n\n\\[\n\\frac{5}{12}=\\frac{10}{24}\n\\]\n\nNow add the numerators:\n\n\\[\n\\frac{9}{24}+\\frac{10}{24}=\\frac{19}{24}\n\\]\n\nTherefore, the answer is **19/24**.',
    },
  ],
  'num-0004': [
    { type: 'correct_answer', text: 'E — 4 1/8' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Convert both mixed numbers to eighths.\n\n\\[\n7\\frac{3}{4}=\\frac{31}{4}=\\frac{62}{8}\n\\]\n\n\\[\n3\\frac{5}{8}=\\frac{29}{8}\n\\]\n\nSubtract:\n\n\\[\n\\frac{62}{8}-\\frac{29}{8}=\\frac{33}{8}\n\\]\n\nConvert back to a mixed number:\n\n\\[\n\\frac{33}{8}=4\\frac{1}{8}\n\\]\n\nTherefore, the answer is **4 1/8**.',
    },
  ],
  'num-0006': [
    { type: 'correct_answer', text: 'C — 3/7' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Multiply the fractions:\n\n\\[\n\\frac{2}{3}\\times\\frac{9}{14}\n\\]\n\nDivide 2 and 14 by 2:\n\n\\[\n\\frac{1}{3}\\times\\frac{9}{7}\n\\]\n\nThen divide 9 and 3 by 3:\n\n\\[\n\\frac{1}{1}\\times\\frac{3}{7}\n\\]\n\nNow multiply:\n\n\\[\n\\frac{1\\times3}{1\\times7}=\\frac{3}{7}\n\\]\n\nTherefore, the answer is **3/7**.',
    },
  ],
  'num-0007': [
    { type: 'correct_answer', text: 'E — 2' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'First simplify each expression.\n\n\\[\n\\frac{5}{6}+\\frac{1}{4}=\\frac{10}{12}+\\frac{3}{12}=\\frac{13}{12}\n\\]\n\nFor the second expression:\n\n\\[\n\\frac{7}{8}-\\frac{1}{3}=\\frac{21}{24}-\\frac{8}{24}=\\frac{13}{24}\n\\]\n\nNow divide the two fractions by multiplying by the reciprocal:\n\n\\[\n\\frac{13}{12}\\div\\frac{13}{24}=\\frac{13}{12}\\times\\frac{24}{13}=2\n\\]\n\nTherefore, the answer is **2**.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'After simplifying the two expressions, we get:\n\n\\[\n\\frac{13}{12}\\times\\frac{24}{13}\n\\]\n\nThe 13 in the numerator and denominator are common factors. Divide both by 13:\n\n\\[\n\\frac{\\cancelto{1}{13}}{12}\\times\\frac{24}{\\cancelto{1}{13}}\n\\]\n\n\\[\n\\frac{1}{12}\\times\\frac{24}{1}\n\\]\n\nNow:\n\n\\[\n\\frac{24}{12}=2\n\\]\n\nThis avoids multiplying the larger numbers and is faster during an exam.',
    },
  ],
  'num-0008': [
    { type: 'correct_answer', text: 'D — 2 4/5' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Convert the mixed numbers:\n\n\\[\n2\\frac{2}{3}=\\frac{8}{3}\n\\]\n\n\\[\n1\\frac{1}{2}=\\frac{3}{2}\n\\]\n\nMultiply:\n\n\\[\n\\frac{8}{3}\\times\\frac{3}{2}=4\n\\]\n\nNow evaluate the division:\n\n\\[\n\\frac{4}{5}\\div\\frac{2}{3}=\\frac{4}{5}\\times\\frac{3}{2}=\\frac{6}{5}=1\\frac{1}{5}\n\\]\n\nSubtract:\n\n\\[\n4-1\\frac{1}{5}=2\\frac{4}{5}\n\\]\n\nTherefore, the answer is **2 4/5**.',
    },
  ],
  'num-0067': [
    { type: 'correct_answer', text: 'A — 135' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'If 5/8 of the folders were distributed, the fraction remaining is:\n\n\\[\n1-\\frac{5}{8}=\\frac{3}{8}\n\\]\n\nNow find 3/8 of 360:\n\n\\[\n360\\times\\frac{3}{8}=45\\times3=135\n\\]\n\nTherefore, **135 folders** remained.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Find the remaining fraction first:\n\n\\[\n1-\\frac{5}{8}=\\frac{3}{8}\n\\]\n\nThen split 360 into 8 equal parts:\n\n\\[\n360\\div8=45\n\\]\n\nTake 3 of those parts:\n\n\\[\n45\\times3=135\n\\]\n\nSo **135 folders** remained.',
    },
  ],
  'num-0070': [
    { type: 'correct_answer', text: 'A — 6/5' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'To divide by a fraction, multiply by its reciprocal:\n\n\\[\n\\frac{3}{4}\\div\\frac{5}{8}=\\frac{3}{4}\\times\\frac{8}{5}\n\\]\n\nSimplify 8 and 4:\n\n\\[\n\\frac{3\\times2}{5}=\\frac{6}{5}\n\\]\n\nTherefore, the answer is **6/5**.',
    },
  ],
  'num-0103': [
    { type: 'correct_answer', text: 'B — 90' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Convert the mixed numbers:\n\n\\[\n3\\frac{1}{3}=\\frac{10}{3}\n\\]\n\n\\[\n2\\frac{1}{4}=\\frac{9}{4}\n\\]\n\nMultiply:\n\n\\[\n\\frac{10}{3}\\times\\frac{9}{4}=\\frac{90}{12}=7.5\n\\]\n\nSo there are 7.5 dozen folders. Since one dozen is 12 folders:\n\n\\[\n7.5\\times12=90\n\\]\n\nTherefore, the officer has **90 folders**.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Convert the number of folders per box first.\n\nEach box holds 2¼ dozen, and 1 dozen is 12 folders, so:\n\n\\[\n2\\frac{1}{4}\\times12=27\n\\]\n\nEach box holds 27 folders.\n\nThen:\n\n\\[\n3\\frac{1}{3}\\times27=\\frac{10}{3}\\times27=90\n\\]\n\nSo the total is **90 folders**.',
    },
  ],
  'num-0115': [
    { type: 'correct_answer', text: 'A — 7/12' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Compare the four fractions:\n\n\\[\n\\frac{3}{8}=0.375\n\\]\n\n\\[\n\\frac{5}{9}≈0.556\n\\]\n\n\\[\n\\frac{7}{12}≈0.583\n\\]\n\n\\[\n\\frac{11}{18}≈0.611\n\\]\n\nFrom least to greatest:\n\n\\[\n\\frac{3}{8}<\\frac{5}{9}<\\frac{7}{12}<\\frac{11}{18}\n\\]\n\nTherefore, the second greatest fraction is **7/12**.',
    },
  ],
  'num-0119': [
    { type: 'correct_answer', text: 'E — 12/25' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Convert the values to decimals.\n\n\\[\n\\frac{3}{5}=0.6\n\\]\n\n\\[\n60%=0.6\n\\]\n\n\\[\n0.6=0.6\n\\]\n\n\\[\n\\frac{9}{15}=\\frac{3}{5}=0.6\n\\]\n\nBut:\n\n\\[\n\\frac{12}{25}=0.48\n\\]\n\nTherefore, **12/25** is the value that is not equivalent to the others.',
    },
    {
      type: 'collapsible',
      title: 'Mental Shortcut',
      content: 'Look for the outlier instead of converting every value in detail.\n\n\\[\n\\frac{12}{25}=\\frac{48}{100}=0.48\n\\]\n\nThe other listed values are all equal to 0.60, so **12/25** is the odd one out.',
    },
  ],
  'num-0138': [
    { type: 'correct_answer', text: 'D — 300 sacks' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: "If 80 sacks represent 1/5 of the silo's capacity, the full capacity is:\n\n\\[\n80\\div\\frac{1}{5}=80\\times5=400\n\\]\n\nNow find 3/4 of 400:\n\n\\[\n400\\times\\frac{3}{4}=300\n\\]\n\nTherefore, the silo will hold **300 sacks** when it is 3/4 full.",
    },
  ],
  'num-0139': [
    { type: 'correct_answer', text: 'A — 7 1/3' },
    {
      type: 'paragraph',
      label: 'Rationale',
      text: 'Let the other number be \\(x\\).\n\nSince the product is 8:\n\n\\[\n\\frac{4}{3}x=8\n\\]\n\nSolve for \\(x\\):\n\n\\[\nx=8\\times\\frac{3}{4}=6\n\\]\n\nNow add the two numbers:\n\n\\[\n6+\\frac{4}{3}=\\frac{18}{3}+\\frac{4}{3}=\\frac{22}{3}=7\\frac{1}{3}\n\\]\n\nTherefore, the answer is **7 1/3**.',
    },
  ],
} as const;

const EXPECTED_GRAMMAR_BLOCKS = {
  'verb-0059': [
    { type: 'correct_answer', text: 'C — The panel of judges has announced its decision.' },
    { type: 'paragraph', label: 'Rationale', text: 'The question treats **panel** as a single collective unit, so it takes the singular verb **has** and the singular pronoun **its**. Therefore, **The panel of judges has announced its decision** follows the stated formal American-English convention.' },
  ],
  'verb-0060': [
    { type: 'correct_answer', text: 'C — Because she arrived late, her application was disqualified.' },
    { type: 'paragraph', label: 'Rationale', text: '**Because** is a subordinating conjunction that correctly introduces the complete clause **she arrived late**. The other choices incorrectly combine a preposition with a finite clause or use the defective construction **since of**. Therefore, **Because she arrived late, her application was disqualified** is the correctly written sentence.' },
  ],
  'verb-0061': [
    { type: 'correct_answer', text: 'B — The reason the memorandum was delayed is that the signatory was absent.' },
    { type: 'paragraph', label: 'Rationale', text: "Under the question's stated formal-edited-English convention, use **the reason ... is that ...** rather than **the reason ... is because ...**. Choice B follows that construction directly. The other choices either use the disfavored **is because** pattern, combine **reason why** with **is because**, or are syntactically defective." },
  ],
  'verb-0062': [
    { type: 'correct_answer', text: 'B — The commission not only reviewed the budget but also scrutinized the disbursements.' },
    { type: 'paragraph', label: 'Rationale', text: 'The correlative pair **not only ... but also** should connect parallel grammatical elements. Here, **reviewed** and **scrutinized** are both past-tense verb phrases, so the sentence maintains proper parallel structure. The other choices break that parallelism or contain additional grammatical errors.' },
  ],
} as const;

describe('Grammar structured explanation final pilot', () => {
  it('contains exactly the approved blocks and no legacy learner fields for the four IDs', async () => {
    const catalog = await loadContentCatalog(['Verbal Ability']);
    for (const id of GRAMMAR_PILOT_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_GRAMMAR_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution'), id).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }
    const grammarStructuredIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Grammar & Usage' && question.structuredExplanation)
      .map((question) => question.id);
    expect(grammarStructuredIds.sort()).toEqual([...GRAMMAR_PILOT_IDS].sort());
  });
});

describe('Age Problems structured explanation', () => {
  it('contains the exact supplied payloads without legacy fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const rationaleOnlyIds = ['num-0030'] as const;
    const shortcutIds = ['num-0031', 'num-0142'] as const;

    for (const id of AGE_PROBLEMS_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question).toBeTruthy();
      expect(blocks).toEqual(EXPECTED_AGE_PROBLEMS_BLOCKS[id]);
      expect(blocks[0]?.type).toBe('correct_answer');
      expect(blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type))).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    for (const id of rationaleOnlyIds) {
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks).toHaveLength(2);
      expect(catalog.questions.get(id)?.structuredExplanation?.blocks.some((block) => block.type === 'collapsible')).toBe(false);
    }

    for (const id of shortcutIds) {
      const blocks = catalog.questions.get(id)?.structuredExplanation?.blocks ?? [];
      expect(blocks).toHaveLength(3);
      expect(blocks[2]).toMatchObject({ type: 'collapsible', title: 'Mental Shortcut' });
      expect((blocks[2]?.type === 'collapsible' ? blocks[2].content : '')).toContain('Therefore,');
    }
  });
});

describe('Averages structured explanation Batch 1', () => {
  it('contains the exact supplied Rationale-only payloads and no legacy explanation fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of AVERAGES_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question, id).toBeTruthy();
      expect(blocks, id).toEqual(EXPECTED_AVERAGES_BLOCKS[id]);
      expect(blocks, id).toHaveLength(2);
      expect(blocks[0], id).toMatchObject({ type: 'correct_answer' });
      expect(blocks[1], id).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution', 'collapsible'].includes(block.type)), id).toBe(false);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    const structuredAveragesIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Averages' && question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredAveragesIds.sort()).toEqual([...AVERAGES_BATCH1_IDS].sort());
  });
});

describe('Basic Algebra structured explanation Batch 1', () => {
  it('contains exactly the supplied blocks and no legacy learner fields for all nine IDs', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const shortcutIds = new Set(['num-0085', 'num-0094']);

    for (const id of BASIC_ALGEBRA_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question, id).toBeTruthy();
      expect(blocks, id).toEqual(EXPECTED_BASIC_ALGEBRA_BLOCKS[id]);
      expect(blocks, id).toHaveLength(shortcutIds.has(id) ? 3 : 2);
      expect(blocks[0], id).toMatchObject({ type: 'correct_answer' });
      expect(blocks[1], id).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type)), id).toBe(false);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      if (shortcutIds.has(id)) {
        expect(blocks[2], id).toMatchObject({ type: 'collapsible', title: 'Mental Shortcut' });
      } else {
        expect(blocks.some((block) => block.type === 'collapsible'), id).toBe(false);
      }
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    const structuredBasicAlgebraIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Basic Algebra' && question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredBasicAlgebraIds.sort()).toEqual([...BASIC_ALGEBRA_BATCH1_IDS].sort());
  });
});

describe('Decimals structured explanation Batch 1', () => {
  it('contains the exact supplied Rationale-only payloads and no legacy explanation fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of DECIMALS_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question, id).toBeTruthy();
      expect(blocks, id).toEqual(EXPECTED_DECIMALS_BLOCKS[id]);
      expect(blocks, id).toHaveLength(2);
      expect(blocks[0], id).toMatchObject({ type: 'correct_answer' });
      expect(blocks[1], id).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution', 'collapsible', 'distractor_section', 'common_trap'].includes(block.type)), id).toBe(false);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    const structuredDecimalsIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Decimals' && question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredDecimalsIds.sort()).toEqual([...DECIMALS_BATCH1_IDS].sort());
  });
});

describe('Fractions structured explanation Batch 1', () => {
  it('contains exactly the supplied blocks and no legacy learner fields for all twelve IDs', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const shortcutIds = new Set(['num-0007', 'num-0067', 'num-0103', 'num-0119']);

    for (const id of FRACTIONS_BATCH1_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(question, id).toBeTruthy();
      expect(blocks, id).toEqual(EXPECTED_FRACTIONS_BLOCKS[id]);
      expect(blocks, id).toHaveLength(shortcutIds.has(id) ? 3 : 2);
      expect(blocks[0], id).toMatchObject({ type: 'correct_answer' });
      expect(blocks[1], id).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution', 'distractor_section', 'common_trap'].includes(block.type)), id).toBe(false);
      expect(isValidStructuredExplanation(question?.structuredExplanation), id).toBe(true);
      if (shortcutIds.has(id)) {
        expect(blocks[2], id).toMatchObject({ type: 'collapsible', title: 'Mental Shortcut' });
      } else {
        expect(blocks.some((block) => block.type === 'collapsible'), id).toBe(false);
      }
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }

    const structuredFractionsIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Fractions' && question.structuredExplanation)
      .map((question) => question.id);
    expect(structuredFractionsIds.sort()).toEqual([...FRACTIONS_BATCH1_IDS].sort());
  });

  it('asks num-0115 for the second greatest value without pre-ordering the list', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const question = catalog.questions.get('num-0115');

    expect(question?.question).toBe('Which fraction has the SECOND GREATEST value among the following?\n\n3/8, 5/9, 7/12, 11/18');
    expect(question?.question).not.toContain('arranged from least to greatest');
  });
});

describe('Number Series structured explanation Batch 4', () => {
  it('contains exactly the approved semantic content for num-0025 and num-0026', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of BATCH3_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH3_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    }

    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.topic === 'Number Series' && question.structuredExplanation)
      .map((question) => question.id);
    expect([...structuredIds].sort()).toEqual([...ALL_NUMBER_SERIES_IDS].sort());
  });

  it('contains exactly the approved semantic content for num-0108, num-0137, and num-0147', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);

    for (const id of BATCH4_IDS) {
      const question = catalog.questions.get(id);
      expect(question).toBeTruthy();
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH4_BLOCKS[id]);
      expect(isValidStructuredExplanation(question?.structuredExplanation)).toBe(true);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'step')).toBe(false);
      expect(question?.structuredExplanation?.blocks.some((block) => block.type === 'alternative_solution')).toBe(false);
    }

    const num0147Text = JSON.stringify(catalog.questions.get('num-0147')?.structuredExplanation?.blocks);
    expect(num0147Text).not.toContain('f(n)');
    expect(num0147Text).toContain('−144');
  });

  it('contains the exact Rationale-first payloads for the first three frozen pilot questions', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of FROZEN_PILOT_IDS) {
      const question = catalog.questions.get(id);
      const blocks = question?.structuredExplanation?.blocks ?? [];
      expect(blocks).toEqual(EXPECTED_FROZEN_BLOCKS[id]);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]?.type).toBe('correct_answer');
      expect(blocks[1]).toMatchObject({ type: 'paragraph', label: 'Rationale' });
      expect(blocks.some((block) => ['heading', 'pattern', 'solution', 'answer', 'rule', 'step', 'alternative_solution'].includes(block.type))).toBe(false);
      for (const field of ['explanation', 'steps', 'distractorExplanations', 'tip']) {
        expect(Object.hasOwn(question ?? {}, field), `${id}:${field}`).toBe(false);
      }
    }
  });

  it('contains the exact Batch 2 Rationale-only payloads without legacy fields', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    for (const id of BATCH2_IDS) {
      const question = catalog.questions.get(id);
      expect(question?.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH2_BLOCKS[id]);
      expect(question?.explanation).toBeUndefined();
      expect(question?.steps).toBeUndefined();
      expect(question?.distractorExplanations).toBeUndefined();
      expect(question?.tip).toBeUndefined();
    }
  });

  it('preserves stems, choices, answer keys, and task metadata after the Batch 3 Rationale migration', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0025': {
        question: 'What is the missing number: 3, 7, 4, 10, 5, 13, 6, ___?',
        choices: ['7', '14', '16', '15', '17'],
        correctOptionId: 'C',
      },
      'num-0026': {
        question: 'Find the next term: 1, 3, 7, 13, 21, ___',
        choices: ['29', '31', '33', '34', '35'],
        correctOptionId: 'B',
      },
    } as const;

    for (const id of BATCH3_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH3_BLOCKS[id]);
      expect(question.explanation).toBeUndefined();
      expect(question.steps).toBeUndefined();
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeUndefined();
      expect(question.numberSeries).toBeTruthy();
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('preserves stems, choices, answer keys, and task metadata after the Batch 4 Rationale migration', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const expected = {
      'num-0108': {
        question: 'What is the next number in the series: 5, 6, 10, 19, 35, 60, ___?',
        choices: ['96', '86', '72', '98', '101'],
        correctOptionId: 'A',
        sequence: ['5', '6', '10', '19', '35', '60', null],
        missingPosition: 7,
      },
      'num-0137': {
        question: 'Identify the next term in the series: 2/4, 1/2, 2/6, 1/3, 2/8, 1/4, 2/10, ___',
        choices: ['1/5', '1/6', '2/5', '3/4', '4/5'],
        correctOptionId: 'A',
        sequence: ['2/4', '1/2', '2/6', '1/3', '2/8', '1/4', '2/10', null],
        missingPosition: 8,
      },
      'num-0147': {
        question: 'What is the next term in the series: 13, −21, 34, −55, 89, ___?',
        choices: ['−95', '104', '−130', '−144', '−109'],
        correctOptionId: 'D',
        sequence: ['13', '−21', '34', '−55', '89', null],
        missingPosition: 6,
      },
    } as const;

    for (const id of BATCH4_IDS) {
      const question = catalog.questions.get(id)!;
      expect(question.question).toBe(expected[id].question);
      expect(question.choices.map((choice) => choice.text)).toEqual(expected[id].choices);
      expect(question.correctOptionId).toBe(expected[id].correctOptionId);
      expect(question.structuredExplanation?.blocks).toEqual(EXPECTED_BATCH4_BLOCKS[id]);
      expect(question.explanation).toBeUndefined();
      expect(question.steps).toBeUndefined();
      expect(question.distractorExplanations).toBeUndefined();
      expect(question.tip).toBeUndefined();
      expect(question.numberSeries?.sequence).toEqual(expected[id].sequence);
      expect(question.numberSeries?.missingPosition).toBe(expected[id].missingPosition);
      expect(question.taskInstance).toBeTruthy();
    }
  });

  it('keeps later Number Series questions on the legacy path', async () => {
    const catalog = await loadContentCatalog(['Numerical Reasoning']);
    const structuredIdSet = new Set<string>(ALL_STRUCTURED_IDS);
    const laterNumberSeries = [...catalog.questions.values()].filter(
      (question) => question.topic === 'Number Series' && !structuredIdSet.has(question.id)
    );

    expect(laterNumberSeries.every((question) => question.topic === 'Number Series')).toBe(true);
    expect(laterNumberSeries.every((question) => question.structuredExplanation === undefined)).toBe(true);
    expect(laterNumberSeries.every((question) => question.explanation.length >= 100)).toBe(true);
    expect(catalog.questions.get('num-0027')?.structuredExplanation).toBeUndefined();
    expect(catalog.questions.get('num-0108')?.structuredExplanation).toBeTruthy();
    expect(catalog.questions.get('num-0137')?.structuredExplanation).toBeTruthy();
    expect(catalog.questions.get('num-0147')?.structuredExplanation).toBeTruthy();
  });

  it('contains no legacy Solution heading in any production structured explanation', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const offenders = [...catalog.questions.values()]
      .filter((question) => containsLegacySolutionHeading(question.structuredExplanation?.blocks))
      .map((question) => question.id);
    expect(offenders).toEqual([]);
  });

  it('does not add structured explanations outside the approved Number Series, Age Problems, Spelling, Filing, Grammar, and Clerical Operations sets', async () => {
    const catalog = await loadContentCatalog(ALL_SUBJECTS);
    const structuredIds = [...catalog.questions.values()]
      .filter((question) => question.structuredExplanation)
      .map((question) => question.id);

    expect([...structuredIds].sort()).toEqual([...ALL_STRUCTURED_IDS].sort());
    expect([...catalog.questions.values()].filter((question) => question.structuredExplanation && !ALL_STRUCTURED_IDS.some((id) => id === question.id)).length).toBe(0);
  });

  it('accepts grouped distractor sections and rejects labeled or empty children', () => {
    expect(isValidStructuredExplanation({
      blocks: [{
        type: 'distractor_section',
        title: 'Why the other choices fail',
        blocks: [
          { type: 'paragraph', text: 'A. Uses the wrong order.' },
          { type: 'paragraph', text: 'B and C. Use the wrong code.' },
        ],
      }],
    })).toBe(true);
    expect(isValidStructuredExplanation({
      blocks: [{
        type: 'distractor_section',
        title: 'Why the other choices fail',
        blocks: [{ type: 'paragraph', label: 'Repeated', text: 'A. Wrong.' }],
      }],
    })).toBe(false);
    expect(isValidStructuredExplanation({
      blocks: [{ type: 'distractor_section', title: 'Why the other choices fail', blocks: [] }],
    })).toBe(false);
  });

  it('rejects malformed or unsupported structured blocks so callers can fall back safely', () => {
    expect(isValidStructuredExplanation({ blocks: [{ type: 'pattern', expression: '' }] })).toBe(false);
    expect(isValidStructuredExplanation({ blocks: [{ type: 'alternative_solution', title: 'Alternative Method', blocks: [] }] })).toBe(false);
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Solution' }] })).toBeUndefined();
    expect(getStructuredExplanation({ blocks: [{ type: 'heading', text: 'Method Overview' }] })).toEqual({
      blocks: [{ type: 'heading', text: 'Method Overview' }],
    });
    expect(getStructuredExplanation({ blocks: [{ type: 'unsupported', text: 'bad' }] })).toBeUndefined();
  });
});
