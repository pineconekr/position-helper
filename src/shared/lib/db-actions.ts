'use server';

import { getSql } from './db';
import type { AppData, MembersEntry, WeekData } from '@/shared/types';
import fs from 'fs';
import path from 'path';

export async function initSchema() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      name TEXT PRIMARY KEY,
      active BOOLEAN DEFAULT true,
      notes TEXT
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS weeks (
      week_date DATE PRIMARY KEY,
      data JSONB NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      type TEXT,
      title TEXT,
      description TEXT,
      meta JSONB
    );
  `;
}

export async function seedFromLocalJson() {
  const sql = getSql();

  // Check if already seeded
  const membersCount = await sql`SELECT count(*) FROM members`;
  if (parseInt(membersCount[0].count) > 0) {
    return { success: true, message: 'Already seeded' };
  }

  // Read JSON
  const jsonPath = path.join(process.cwd(), 'positiondatalog', '260104_Position_data (1).json');
  if (!fs.existsSync(jsonPath)) {
    return { success: false, message: 'JSON file not found' };
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: AppData = JSON.parse(raw);

  // Seed members
  for (const member of data.members) {
    await sql`
      INSERT INTO members (name, active, notes)
      VALUES (${member.name}, ${member.active}, ${member.notes || ''})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  // Seed weeks
  for (const [date, weekData] of Object.entries(data.weeks)) {
    await sql`
      INSERT INTO weeks (week_date, data)
      VALUES (${date}, ${JSON.stringify(weekData)})
      ON CONFLICT (week_date) DO UPDATE SET data = EXCLUDED.data
    `;
  }

  return { success: true, message: 'Seed successful' };
}

export async function getAllData(): Promise<AppData> {
  const sql = getSql();

  const members = await sql`SELECT * FROM members ORDER BY name`;
  // week_date를 TEXT로 캐스팅하여 타임존 변환 방지
  const weeks = await sql`SELECT week_date::text as week_date, data FROM weeks ORDER BY week_date`;

  const appData: AppData = {
    members: members.map(m => ({
      name: m.name,
      active: m.active,
      notes: m.notes
    })),
    weeks: {}
  };

  weeks.forEach(w => {
    // week_date는 이제 TEXT로 반환되므로 그대로 사용
    const dateStr = String(w.week_date);
    appData.weeks[dateStr] = w.data as WeekData;
  });

  return appData;
}


export async function saveWeekAssignment(date: string, weekData: WeekData) {
  const sql = getSql();
  await sql`
    INSERT INTO weeks (week_date, data)
    VALUES (${date}, ${JSON.stringify(weekData)})
    ON CONFLICT (week_date) DO UPDATE SET data = EXCLUDED.data
  `;
}

export async function updateMember(member: MembersEntry) {
  const sql = getSql();
  await sql`
    INSERT INTO members (name, active, notes)
    VALUES (${member.name}, ${member.active}, ${member.notes || ''})
    ON CONFLICT (name) DO UPDATE SET active = EXCLUDED.active, notes = EXCLUDED.notes
  `;
}
