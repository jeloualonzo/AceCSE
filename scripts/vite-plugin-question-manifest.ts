/**
 * Vite plugin: `virtual:question-manifest`
 *
 * Scans `content/questions/` at build/dev time and exposes a tiny manifest
 * (per-subject supply counts by exam level) as a virtual module. This is what
 * lets the app answer "how many Clerical questions exist for Subprofessional?"
 * synchronously — without shipping a single question to the browser.
 *
 * The actual question content is code-split per file by the non-eager
 * `import.meta.glob` in `src/data/questionBank.ts` and fetched on demand.
 *
 * Adding a new AI-generated batch file under `content/questions/<subject>/`
 * requires no code change: the manifest and the glob both pick it up
 * automatically (with a dev-server reload handled below).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import {
  isValidQuestion,
  SUBJECT_BY_DIR,
  type QuestionManifest,
  type SubjectSupply,
} from '../src/data/questionShape';

const VIRTUAL_ID = 'virtual:question-manifest';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function* jsonFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (entry.endsWith('.json')) yield path;
  }
}

function buildGroupsMeta(groupsDir: string): QuestionManifest['groups'] {
  const meta: QuestionManifest['groups'] = [];
  if (!existsSync(groupsDir)) return meta;
  for (const path of jsonFiles(groupsDir)) {
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
    if (!Array.isArray(parsed)) continue;
    for (const g of parsed) {
      if (!g?.id || !Array.isArray(g.questionIds)) continue;
      meta.push({
        id: g.id, title: g.title ?? g.questionType ?? g.topic ?? g.id,
        subject: g.subject, examLevel: g.examLevel,
        topic: g.topic, questionType: g.questionType,
        selectionPolicy: g.selectionPolicy, orderPolicy: g.orderPolicy,
        tags: Array.isArray(g.tags) ? g.tags : undefined,
        size: g.questionIds.length,
      });
    }
  }
  return meta;
}

function buildManifest(questionsDir: string): QuestionManifest {
  const subjects: QuestionManifest['subjects'] = {};
  let totalQuestions = 0;
  const seenIds = new Set<string>();

  if (!existsSync(questionsDir)) return { subjects, totalQuestions, groups: [] };

  for (const path of jsonFiles(questionsDir)) {
    const topDir = relative(questionsDir, path).split(sep)[0];
    const subjectForDir = SUBJECT_BY_DIR[topDir];
    if (!subjectForDir) continue; // stray file outside the subject convention

    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      continue; // validator reports this loudly; manifest just skips it
    }
    if (!Array.isArray(parsed)) continue;

    for (const raw of parsed) {
      // Mirror the runtime loader exactly: invalid or duplicate items are
      // dropped there too, so the manifest never over-promises supply.
      if (!isValidQuestion(raw) || raw.subject !== subjectForDir) continue;
      if (seenIds.has(raw.id)) continue;
      seenIds.add(raw.id);

      const bucket: SubjectSupply = (subjects[raw.subject] ??= {
        professional: 0,
        subprofessional: 0,
        both: 0,
      });
      if (raw.examLevel === 'Professional') bucket.professional += 1;
      else if (raw.examLevel === 'Subprofessional') bucket.subprofessional += 1;
      else bucket.both += 1;
      totalQuestions += 1;
    }
  }

  return { subjects, totalQuestions, groups: [] };
}

export function questionManifestPlugin(): Plugin {
  let questionsDir = '';

  return {
    name: 'acecse:question-manifest',

    configResolved(config) {
      questionsDir = join(config.root, 'content', 'questions');
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const manifest = buildManifest(questionsDir);
      manifest.groups = buildGroupsMeta(join(questionsDir, '..', 'groups'));
      return `export default ${JSON.stringify(manifest)};`;
    },

    configureServer(server) {
      // Recompute the manifest when content changes during dev.
      const groupsDir = join(questionsDir, '..', 'groups');
      server.watcher.add(questionsDir);
      server.watcher.add(groupsDir);
      const invalidate = (file: string) => {
        if ((!file.startsWith(questionsDir) && !file.startsWith(groupsDir)) || !file.endsWith('.json')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('change', invalidate);
      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}
