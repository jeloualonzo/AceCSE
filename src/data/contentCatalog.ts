import type {
  ContentBlock,
  ExamLevel,
  NormalizedQuestionGroup,
  Question,
  QuestionGroup,
  Subject,
} from '@/types';
import { normalizeContent, type ContentCatalog } from '@/data/contentNormalization';

export interface NormalizedContentCatalog extends ContentCatalog {
  getQuestion(questionId: string): Question | undefined;
  getGroup(groupId: string): NormalizedQuestionGroup | undefined;
  getGroupsForSubject(subject: Subject, level?: ExamLevel): NormalizedQuestionGroup[];
  getQuestionsForSubject(subject: Subject, level?: ExamLevel): Question[];
  getSharedContent(contentId: string): ContentBlock | undefined;
}

function matchesLevel(value: Question['examLevel'], level?: ExamLevel): boolean {
  return !level || value === 'Both' || value === level;
}

function withApi(catalog: ContentCatalog): NormalizedContentCatalog {
  return {
    ...catalog,
    getQuestion: (questionId) => catalog.questions.get(questionId),
    getGroup: (groupId) => catalog.groups.get(groupId),
    getGroupsForSubject: (subject, level) =>
      [...catalog.groups.values()].filter(
        (group) => group.subject === subject && matchesLevel(group.examLevel, level)
      ),
    getQuestionsForSubject: (subject, level) =>
      [...catalog.questions.values()].filter(
        (question) => question.subject === subject && matchesLevel(question.examLevel, level)
      ),
    getSharedContent: (contentId) =>
      [...catalog.groups.values()]
        .flatMap((group) => group.contentBlocks ?? [])
        .find((block) => block.id === contentId),
  };
}

export function createNormalizedCatalog(
  questions: readonly Question[],
  groups: readonly QuestionGroup[] = []
): NormalizedContentCatalog {
  return withApi(normalizeContent(questions, groups));
}

export function mergeNormalizedCatalogs(
  ...catalogs: readonly NormalizedContentCatalog[]
): NormalizedContentCatalog {
  const questions = new Map<string, Question>();
  const groups = new Map<string, NormalizedQuestionGroup>();
  for (const catalog of catalogs) {
    for (const [id, question] of catalog.questions) questions.set(id, question);
    for (const [id, group] of catalog.groups) groups.set(id, group);
  }
  return withApi({ questions, groups });
}

export type { ContentCatalog };
