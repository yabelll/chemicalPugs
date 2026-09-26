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

const columns = database.prepare('PRAGMA table_info(players)').all() as { name: string }[];
for (const column of ['first_name', 'last_name', 'username']) {
  if (columns.some((item) => item.name === column)) {
    database.exec(`ALTER TABLE players DROP COLUMN ${column}`);
  }
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

export function registerUser(userId: number): void {
  userUpsert.run(String(userId));
}

export function saveHero(userId: number, hero: Hero): void {
  heroUpsert.run(
    String(userId),
    hero.gender,
    hero.hairColor,
    hero.skinTone,
    hero.imagePath
  );
}

export function getHero(userId: number): Partial<Hero> | undefined {
  return heroByUserId.get(String(userId)) as Partial<Hero> | undefined;
}
