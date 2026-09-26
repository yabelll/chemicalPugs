import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const databasePath = resolve(process.env.DATABASE_PATH ?? 'data/bot.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id TEXT PRIMARY KEY,
    gender TEXT,
    hair_color TEXT,
    skin_tone TEXT,
    image_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    user_id TEXT PRIMARY KEY,
    advisor_active INTEGER NOT NULL DEFAULT 0,
    chapter1_answers TEXT,
    chapter1_stage TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const removePersonalFieldsMigration = 'remove_personal_fields';
const appliedMigration = database
  .prepare('SELECT name FROM schema_migrations WHERE name = ?')
  .get(removePersonalFieldsMigration);

if (!appliedMigration) {
  const columns = database.prepare('PRAGMA table_info(players)').all() as { name: string }[];
  for (const column of ['first_name', 'last_name', 'username']) {
    if (columns.some((item) => item.name === column)) {
      database.exec(`ALTER TABLE players DROP COLUMN ${column}`);
    }
  }

  database
    .prepare('INSERT INTO schema_migrations (name) VALUES (?)')
    .run(removePersonalFieldsMigration);
}

export type HeroGender = 'male' | 'female';
export type HairColor = 'light' | 'dark' | 'red';
export type SkinTone = 'veryLight' | 'light' | 'dark';

export interface Hero {
  gender: HeroGender;
  hairColor: HairColor;
  skinTone: SkinTone;
  imagePath: string;
}

const userUpsert = database.prepare(`
  INSERT INTO players (user_id)
  VALUES (?)
  ON CONFLICT(user_id) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP
`);

const heroUpsert = database.prepare(`
  INSERT INTO players (user_id, gender, hair_color, skin_tone, image_path)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    gender = excluded.gender,
    hair_color = excluded.hair_color,
    skin_tone = excluded.skin_tone,
    image_path = excluded.image_path,
    updated_at = CURRENT_TIMESTAMP
`);

const heroByUserId = database.prepare(`
  SELECT gender, hair_color AS hairColor, skin_tone AS skinTone, image_path AS imagePath
  FROM players
  WHERE user_id = ?
`);

const activateAdvisor = database.prepare(`
  INSERT INTO user_sessions (user_id, advisor_active)
  VALUES (?, 1)
  ON CONFLICT(user_id) DO UPDATE SET advisor_active = 1, updated_at = CURRENT_TIMESTAMP
`);

const deactivateAdvisor = database.prepare(`
  UPDATE user_sessions
  SET advisor_active = 0, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = ?
`);

const advisorSessionByUserId = database.prepare(`
  SELECT advisor_active AS advisorActive FROM user_sessions WHERE user_id = ?
`);

const startChapter1 = database.prepare(`
  INSERT INTO user_sessions (user_id, chapter1_answers, chapter1_stage)
  VALUES (?, '', 'choice1')
  ON CONFLICT(user_id) DO UPDATE SET
    chapter1_answers = '', chapter1_stage = 'choice1', updated_at = CURRENT_TIMESTAMP
`);

const addChapter1Choice = database.prepare(`
  UPDATE user_sessions
  SET chapter1_answers = chapter1_answers || ?, chapter1_stage = ?, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = ? AND chapter1_stage = ?
`);

const chapter1ProgressByUserId = database.prepare(`
  SELECT chapter1_answers AS answers, chapter1_stage AS stage
  FROM user_sessions
  WHERE user_id = ?
`);

const clearChapter1 = database.prepare(`
  UPDATE user_sessions
  SET chapter1_answers = NULL, chapter1_stage = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = ?
`);

export function registerUser(userId: number): void {
  userUpsert.run(String(userId));
}

export function saveHero(userId: number, hero: Hero): void {
  heroUpsert.run(String(userId), hero.gender, hero.hairColor, hero.skinTone, hero.imagePath);
}

export function getHero(userId: number): Partial<Hero> | undefined {
  return heroByUserId.get(String(userId)) as Partial<Hero> | undefined;
}

export function activateAdvisorForUser(userId: number): void {
  activateAdvisor.run(String(userId));
}

export function deactivateAdvisorForUser(userId: number): void {
  deactivateAdvisor.run(String(userId));
}

export function isAdvisorActiveForUser(userId: number): boolean {
  const session = advisorSessionByUserId.get(String(userId)) as
    { advisorActive: number } | undefined;
  return session?.advisorActive === 1;
}

export function startChapter1ForUser(userId: number): void {
  startChapter1.run(String(userId));
}

export function addChapter1ChoiceForUser(
  userId: number,
  expectedStage: string,
  nextStage: string,
  answer: 'A' | 'B' | 'C'
): boolean {
  const result = addChapter1Choice.run(answer, nextStage, String(userId), expectedStage);
  return Number(result.changes) === 1;
}

export function getChapter1AnswersForUser(userId: number): string | undefined {
  const progress = chapter1ProgressByUserId.get(String(userId)) as
    { answers: string | null; stage: string | null } | undefined;
  return progress?.answers ?? undefined;
}

export function clearChapter1ForUser(userId: number): void {
  clearChapter1.run(String(userId));
}
