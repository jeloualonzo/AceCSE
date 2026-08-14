import type {
  ContentBlock,
  ExamLevel,
  NormalizedQuestionGroup,
  Question,
  QuestionGroup,
  Subject,
} from '@/types';
import type { CanonicalPool, ClassificationRecord } from '@/data/taxonomy';
import { normalizeContent, type ContentCatalog } from '@/data/contentNormalization';

export interface NormalizedContentCatalog extends ContentCatalog {
  classifications: Map<string, ClassificationRecord>;
  pools: Map<string, CanonicalPool>;
  getQuestion(questionId: string): Question | undefined;
  getGroup(groupId: string): NormalizedQuestionGroup | undefined;
  getGroupsForSubject(subject: Subject, level?: ExamLevel): NormalizedQuestionGroup[];
  getQuestionsForSubject(subject: Subject, level?: ExamLevel): Question[];
  getClassification(questionId: string): ClassificationRecord | undefined;
  getPoolsForSubject(subject: Subject): CanonicalPool[];
  getSharedContent(contentId: string): ContentBlock | undefined;
}

function matchesLevel(value: Question['examLevel'], level?: ExamLevel): boolean {
  return !level || value === 'Both' || value === level;
}

function withApi(catalog: ContentCatalog & Pick<NormalizedContentCatalog, 'classifications' | 'pools'>): NormalizedContentCatalog {
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
    getClassification: (questionId) => catalog.classifications.get(questionId),
    getPoolsForSubject: (subject) => [...catalog.pools.values()].filter((pool) => pool.subject === subject),
    getSharedContent: (contentId) =>
      [...catalog.groups.values()]
        .flatMap((group) => group.contentBlocks ?? [])
        .find((block) => block.id === contentId),
  };
}

export function createNormalizedCatalog(
  questions: readonly Question[],
  groups: readonly QuestionGroup[] = [],
  classifications: readonly ClassificationRecord[] = [],
  pools: readonly CanonicalPool[] = []
): NormalizedContentCatalog {
  return withApi({
    ...normalizeContent(questions, groups),
    classifications: new Map(classifications.map((record) => [record.questionId, record])),
    pools: new Map(pools.map((pool) => [pool.poolId, pool])),
  });
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
  const classifications = new Map<string, ClassificationRecord>();
  const pools = new Map<string, CanonicalPool>();
  for (const catalog of catalogs) {
    for (const [id, record] of catalog.classifications) classifications.set(id, record);
    for (const [id, pool] of catalog.pools) pools.set(id, pool);
  }
  return withApi({ questions, groups, classifications, pools });
}

export type { ContentCatalog };
