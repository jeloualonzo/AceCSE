import taxonomyJson from '../../content/taxonomy/taxonomy.json';
import classificationJson from '../../content/taxonomy/classification-manifest.json';
import type { ExamLevel, Subject } from '@/types';

export type StorageMode = 'pool' | 'fixed-set';
export type ClassificationConfidence = 'high' | 'medium' | 'low';

export interface ClassificationRecord {
  questionId: string;
  subject: Subject;
  examLevel: ExamLevel | 'Both';
  topic: string;
  subtopic?: string;
  questionType: string;
  questionFormat: string;
  taskFormat: string;
  storageMode: StorageMode;
  poolId: string | null;
  fixedGroupId: string | null;
  embeddedStimulus: boolean;
  sharedDirectionsRef?: string;
  sourceFile: string;
  confidence: ClassificationConfidence;
  notes?: string;
}

export interface PoolEntry {
  questionId: string;
  questionType: string;
  questionFormat: string;
  taskFormat: string;
}

export interface CanonicalPool {
  version: number;
  poolId: string;
  subject: Subject;
  topics: string[];
  questionFormats: string[];
  taskFormats: string[];
  selectionPolicy: 'without-replacement';
  entries: PoolEntry[];
}

export interface TaxonomyPoolDefinition {
  poolId: string;
  subject: Subject;
  topics: string[];
  questionFormats: string[];
  taskFormats: string[];
  selectionPolicy: 'without-replacement';
  contiguity: string;
  questionCount: number;
  indexPath: string;
}

export interface FixedSetDefinition {
  fixedGroupId: string;
  subject: Subject;
  topic: string;
  questionType?: string;
  questionIds: string[];
  selectionPolicy: 'atomic';
  orderPolicy: 'fixed';
  contentBlockIds: string[];
  sharedContextRequired: boolean;
}

export interface CanonicalTaxonomy {
  version: number;
  status: string;
  subjects: Subject[];
  topics: string[];
  questionTypes: string[];
  questionFormats: string[];
  taskFormats: string[];
  storageModes: StorageMode[];
  rules: Record<string, string>;
  sharedTaskDefinitions: Record<string, Record<string, unknown>>;
  poolCompatibilityRules: Array<{
    poolId: string;
    subject: Subject;
    allowedTopics: string[];
    allowedQuestionFormats: string[];
    allowedTaskFormats: string[];
  }>;
  pools: TaxonomyPoolDefinition[];
  fixedSets: FixedSetDefinition[];
}

export interface ClassificationManifest {
  version: number;
  taxonomyVersion: number;
  questionCount: number;
  questions: ClassificationRecord[];
}

export const CANONICAL_TAXONOMY = taxonomyJson as CanonicalTaxonomy;
export const CLASSIFICATION_MANIFEST = classificationJson as ClassificationManifest;

const classificationById = new Map(
  CLASSIFICATION_MANIFEST.questions.map((record) => [record.questionId, record])
);

const poolModules = import.meta.glob<{ default: CanonicalPool }>('../../content/taxonomy/pools/*.json', {
  eager: true,
});

const canonicalPools = new Map<string, CanonicalPool>();
for (const module of Object.values(poolModules)) {
  const pool = module.default;
  canonicalPools.set(pool.poolId, pool);
}

export function getClassification(questionId: string): ClassificationRecord | undefined {
  return classificationById.get(questionId);
}

export function getCanonicalPool(poolId: string): CanonicalPool | undefined {
  return canonicalPools.get(poolId);
}

export function getCanonicalPoolsForSubject(subject: Subject): CanonicalPool[] {
  return [...canonicalPools.values()].filter((pool) => pool.subject === subject);
}

export function getPoolEntriesForSubject(subject: Subject, level?: ExamLevel): PoolEntry[] {
  const records = CLASSIFICATION_MANIFEST.questions.filter(
    (record) =>
      record.subject === subject &&
      record.storageMode === 'pool' &&
      (!level || record.examLevel === 'Both' || record.examLevel === level)
  );
  return records.map((record) => ({
    questionId: record.questionId,
    questionType: record.questionType,
    questionFormat: record.questionFormat,
    taskFormat: record.taskFormat,
  }));
}

export function canonicalPoolCount(): number {
  return canonicalPools.size;
}

export function getSharedTaskDefinition(ref: string | undefined): Record<string, unknown> | undefined {
  return ref ? CANONICAL_TAXONOMY.sharedTaskDefinitions[ref] : undefined;
}

export function getSharedTaskDefinitionForTaskFormat(taskFormat: string): [string, Record<string, unknown>] | undefined {
  const entry = Object.entries(CANONICAL_TAXONOMY.sharedTaskDefinitions).find(
    ([, definition]) => definition.taskFormat === taskFormat
  );
  return entry as [string, Record<string, unknown>] | undefined;
}

export function taskFormatLabel(questionType: string, taskFormat: string): string {
  const labels: Record<string, string> = {
    shared_filing_task: 'Filing',
    shared_spelling_task: 'Spelling',
    number_sequence: 'Number Series',
    letter_sequence: 'Letter Series',
  };
  return labels[taskFormat] ?? questionType.replaceAll('_', ' ');
}

export function allClassifications(): readonly ClassificationRecord[] {
  return CLASSIFICATION_MANIFEST.questions;
}
