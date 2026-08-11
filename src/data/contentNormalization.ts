import type {
  NormalizedQuestionGroup,
  Question,
  QuestionGroup,
  Subject,
} from '@/types';

export interface ContentCatalog {
  questions: Map<string, Question>;
  groups: Map<string, NormalizedQuestionGroup>;
}

/** Stable group identity for a legacy question. */
export function singletonGroupId(questionId: string): string {
  return `singleton:${questionId}`;
}

export function normalizeLegacyQuestion(question: Question): NormalizedQuestionGroup {
  return {
    id: singletonGroupId(question.id),
    examLevel: question.examLevel,
    subject: question.subject,
    topic: question.topic,
    questionType: question.questionType,
    questionIds: [question.id],
    selectionPolicy: 'atomic',
    orderPolicy: 'fixed',
    tags: [...question.tags],
    status: question.status,
    contentVersion: question.contentVersion,
    questions: [question],
    isImplicitSingleton: true,
  };
}

function normalizeExplicitGroup(
  group: QuestionGroup,
  questions: Map<string, Question>
): NormalizedQuestionGroup | null {
  const resolved = group.questionIds
    .map((questionId) => questions.get(questionId))
    .filter((question): question is Question => Boolean(question));

  if (resolved.length !== group.questionIds.length || resolved.length === 0) return null;

  return {
    ...group,
    questionIds: [...group.questionIds],
    contentBlocks: group.contentBlocks ? [...group.contentBlocks] : undefined,
    tags: [...group.tags],
    questions: resolved,
    isImplicitSingleton: false,
  };
}

/**
 * Normalizes legacy questions and explicit groups without copying question data.
 * Explicit groups take precedence over their questions' implicit singleton groups.
 */
export function normalizeContent(
  questions: readonly Question[],
  explicitGroups: readonly QuestionGroup[] = []
): ContentCatalog {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const groups = new Map<string, NormalizedQuestionGroup>();

  for (const question of questions) groups.set(singletonGroupId(question.id), normalizeLegacyQuestion(question));
  for (const group of explicitGroups) {
    const normalized = normalizeExplicitGroup(group, questionMap);
    if (normalized) {
      groups.set(normalized.id, normalized);
      for (const questionId of normalized.questionIds) groups.delete(singletonGroupId(questionId));
    }
  }

  return { questions: questionMap, groups };
}

export function groupsForSubject(
  catalog: ContentCatalog,
  subject: Subject
): NormalizedQuestionGroup[] {
  return [...catalog.groups.values()].filter((group) => group.subject === subject);
}
