import { Question, ExamSessionItem } from '../types';
import { LOCAL_QUESTION_BANK } from '../data/mockQuestions';

/**
 * Generates an immutable exam session array for a specific exam level.
 * Filters active questions by level, distributes subjects appropriately,
 * and assigns 1-based item numbers.
 */
export function generateExamSession(
  examLevel: 'Professional' | 'Subprofessional',
  overrideBank?: Question[]
): ExamSessionItem[] {
  const bank = overrideBank || LOCAL_QUESTION_BANK;
  
  // 1. Filter bank by level eligibility
  const eligibleQuestions = bank.filter(
    (q) => (q.active ?? true) && (q.examLevel === 'Both' || q.examLevel === examLevel)
  );

  const totalItems = examLevel === 'Professional' ? 170 : 165;
  const sessionItems: ExamSessionItem[] = [];

  for (let itemNumber = 1; itemNumber <= totalItems; itemNumber++) {
    // Select base question matching target subject pool or modulo fallbacks
    const selectedQ = selectQuestionForItem(itemNumber, examLevel, eligibleQuestions);
    
    // Create cloned question instance for this specific item number
    const sessionQuestion: Question = {
      ...selectedQ,
      id: `${selectedQ.id}_item_${itemNumber}`,
      // Dynamic subject derivation if using modulo fallbacks
      subject: deriveSubjectForNumber(itemNumber, examLevel, selectedQ.subject),
    };

    sessionItems.push({
      itemNumber,
      question: sessionQuestion,
    });
  }

  return sessionItems;
}

/**
 * Helper to select or synthesize a question for a given item number.
 */
function selectQuestionForItem(
  itemNumber: number,
  examLevel: 'Professional' | 'Subprofessional',
  pool: Question[]
): Question {
  const targetSubject = deriveSubjectForNumber(itemNumber, examLevel);
  const matchingSubject = pool.filter((q) => q.subject === targetSubject);

  if (matchingSubject.length > 0) {
    const index = (itemNumber - 1) % matchingSubject.length;
    return matchingSubject[index];
  }

  // Fallback to any pool question
  const fallbackIndex = (itemNumber - 1) % pool.length;
  return pool[fallbackIndex];
}

/**
 * Derives official CSC subject distribution based on item range.
 */
function deriveSubjectForNumber(
  itemNumber: number,
  examLevel: 'Professional' | 'Subprofessional',
  existingSubject?: string
): string {
  if (existingSubject && existingSubject !== 'General Info') {
    return existingSubject;
  }

  if (examLevel === 'Professional') {
    if (itemNumber <= 40) return 'Numerical Reasoning';
    if (itemNumber <= 80) return 'Analytical Reasoning';
    if (itemNumber <= 130) return 'Verbal Ability';
    return 'General Information';
  } else {
    if (itemNumber <= 40) return 'Numerical Reasoning';
    if (itemNumber <= 75) return 'Clerical Ability';
    if (itemNumber <= 125) return 'Verbal Ability';
    return 'General Information';
  }
}
