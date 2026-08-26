import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  DesignSystemDetail,
  DesignSystemSummary,
  SkillDetail,
  SkillSummary,
} from '@open-design/contracts';
import { parseFrontmatter } from '../../../../daemon/src/design-systems/frontmatter';

type JsonRecord = Record<string, unknown>;
type CatalogSkill = SkillSummary & { body: string };

const SKILL_MODES = new Set<SkillSummary['mode']>([
  'prototype',
  'deck',
  'template',
  'design-system',
  'image',
  'video',
  'audio',
]);
const SKILL_SURFACES = new Set<NonNullable<SkillSummary['surface']>>([
  'web',
  'image',
  'video',
  'audio',
]);

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function safeCatalogId(id: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id);
}

function workspaceRoot(): string {
  const configured = process.env.OD_WORKSPACE_ROOT?.trim();
  const candidates = [
    configured
      ? path.resolve(process.cwd(), configured)
      : null,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(path.join(candidate, 'pnpm-workspace.yaml')))
    ?? candidates[0]
    ?? process.cwd();
}

function rootPath(name: 'skills' | 'design-templates' | 'design-systems'): string {
  return path.join(workspaceRoot(), name);
}

async function catalogDirectories(root: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function markdownSummary(body: string): string {
  const withoutHeadings = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('```'));
  return withoutHeadings[0] ?? '';
}

function skillFromSource(id: string, raw: string): CatalogSkill {
  const { data: parsed, body } = parseFrontmatter(raw);
  const frontmatter = record(parsed);
  const od = record(frontmatter.od);
  const preview = record(od.preview);
  const designSystem = record(od.design_system);
  const craft = record(od.craft);
  const modeValue = stringValue(od.mode);
  const mode = modeValue && SKILL_MODES.has(modeValue as SkillSummary['mode'])
    ? modeValue as SkillSummary['mode']
    : 'prototype';
  const surfaceValue = stringValue(od.surface);
  const surface = surfaceValue && SKILL_SURFACES.has(surfaceValue as NonNullable<SkillSummary['surface']>)
    ? surfaceValue as NonNullable<SkillSummary['surface']>
    : mode === 'image' || mode === 'video' || mode === 'audio' ? mode : 'web';
  const platformValue = stringValue(od.platform);
  const platform = platformValue === 'desktop' || platformValue === 'mobile' ? platformValue : null;
  const displayName: Record<string, string> = {};
  const enName = stringValue(frontmatter.en_name);
  const zhName = stringValue(frontmatter.zh_name);
  if (enName) displayName.en = enName;
  if (zhName) displayName.zh = zhName;
  const descriptionI18n: Record<string, string> = {};
  const enDescription = stringValue(frontmatter.en_description);
  const zhDescription = stringValue(frontmatter.zh_description);
  if (enDescription) descriptionI18n.en = enDescription;
  if (zhDescription) descriptionI18n.zh = zhDescription;
  const description = stringValue(frontmatter.description) ?? markdownSummary(body);
  const examplePrompt = stringValue(od.example_prompt) ?? description;
  const featured = numberValue(od.featured);
  const fidelityValue = stringValue(od.fidelity);
  const fidelity = fidelityValue === 'wireframe' || fidelityValue === 'high-fidelity'
    ? fidelityValue
    : null;
  const result: CatalogSkill = {
    id,
    name: id,
    ...(Object.keys(displayName).length ? { displayName } : {}),
    description,
    ...(Object.keys(descriptionI18n).length ? { descriptionI18n } : {}),
    triggers: stringArray(frontmatter.triggers),
    mode,
    surface,
    platform,
    scenario: stringValue(od.scenario) ?? null,
    category: stringValue(od.category) ?? null,
    previewType: stringValue(preview.type) ?? 'html',
    designSystemRequired: booleanValue(designSystem.requires) ?? true,
    defaultFor: stringArray(od.default_for),
    upstream: stringValue(od.upstream) ?? null,
    featured,
    fidelity,
    speakerNotes: booleanValue(od.speaker_notes) ?? null,
    animations: booleanValue(od.animations) ?? null,
    craftRequires: stringArray(craft.requires),
    hasBody: body.trim().length > 0,
    examplePrompt,
    aggregatesExamples: false,
    source: 'built-in',
    body,
  };
  return result;
}

async function readSkillCatalog(root: string): Promise<CatalogSkill[]> {
  const entries = await catalogDirectories(root);
  const skills: CatalogSkill[] = [];
  for (const id of entries) {
    try {
      const raw = await readFile(path.join(root, id, 'SKILL.md'), 'utf8');
      const skill = skillFromSource(id, raw);
      skills.push(skill);
    } catch {
      // Catalog discovery is best-effort; one malformed entry should not blank
      // the rest of the hosted picker.
    }
  }
  return skills.sort((a, b) => (b.featured ?? -1) - (a.featured ?? -1) || a.name.localeCompare(b.name));
}

export async function listStaticSkills(): Promise<CatalogSkill[]> {
  return readSkillCatalog(rootPath('skills'));
}

export async function listStaticDesignTemplates(): Promise<CatalogSkill[]> {
  return readSkillCatalog(rootPath('design-templates'));
}

export async function getStaticSkill(id: string, templates = false): Promise<SkillDetail | null> {
  if (!safeCatalogId(id)) return null;
  const root = rootPath(templates ? 'design-templates' : 'skills');
  try {
    const raw = await readFile(path.join(root, id, 'SKILL.md'), 'utf8');
    return skillFromSource(id, raw) as SkillDetail;
  } catch {
    return null;
  }
}

function designSystemFromSource(id: string, raw: string, manifest: JsonRecord): DesignSystemDetail {
  const { data: parsed, body } = parseFrontmatter(raw);
  const frontmatter = record(parsed);
  const title = stringValue(manifest.name)
    ?? stringValue(frontmatter.name)
    ?? /^#\s+(.+?)\s*$/m.exec(body)?.[1]?.trim()
    ?? id;
  const category = stringValue(manifest.category)
    ?? stringValue(frontmatter.category)
    ?? 'Uncategorized';
  const summary = stringValue(manifest.description)
    ?? stringValue(frontmatter.description)
    ?? markdownSummary(body);
  const surfaceValue = stringValue(manifest.surface) ?? stringValue(frontmatter.surface);
  const surface = surfaceValue === 'image' || surfaceValue === 'video' || surfaceValue === 'audio'
    ? surfaceValue
    : 'web';
  const swatches = Array.from(new Set(body.match(/#[0-9a-fA-F]{6}\b/g) ?? [])).slice(0, 8);
  return {
    id,
    title,
    category,
    summary,
    swatches,
    surface,
    source: 'built-in',
    status: 'published',
    isEditable: false,
    body: raw,
  };
}

async function readDesignSystem(root: string, id: string): Promise<DesignSystemDetail | null> {
  try {
    const manifestPath = path.join(root, id, 'manifest.json');
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, 'utf8')) as JsonRecord
      : {};
    const designPath = stringValue(record(manifest.files).design) ?? 'DESIGN.md';
    const raw = await readFile(path.join(root, id, designPath), 'utf8');
    return designSystemFromSource(id, raw, manifest);
  } catch {
    return null;
  }
}

export async function listStaticDesignSystems(): Promise<DesignSystemSummary[]> {
  const root = rootPath('design-systems');
  const ids = await catalogDirectories(root);
  const systems: DesignSystemSummary[] = [];
  for (const id of ids) {
    const system = await readDesignSystem(root, id);
    if (!system) continue;
    const { body: _body, ...summary } = system;
    systems.push(summary);
  }
  return systems;
}

export async function getStaticDesignSystem(id: string): Promise<DesignSystemDetail | null> {
  if (!safeCatalogId(id)) return null;
  return readDesignSystem(rootPath('design-systems'), id);
}
