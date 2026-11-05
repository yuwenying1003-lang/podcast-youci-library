#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';

const coursesDir = new URL('../courses/', import.meta.url);
const seconds = value => String(value).split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
export const normalizeWord = value => String(value ?? '')
  .normalize('NFKC')
  .trim()
  .toLocaleLowerCase('en-US')
  .replace(/[‘’]/g, "'")
  .replace(/[‐‑‒–—]/g, '-')
  .replace(/\s+/g, ' ');

export function unitFor(course, item) {
  if (Number.isInteger(item.unit)) return item.unit;
  const time = seconds(item.time);
  return course.units.findIndex(unit => time >= seconds(unit.start) && time < seconds(unit.end));
}

export function auditCourse(course) {
  const groups = new Map();
  const missing = { cn: 0, definition: 0, example: 0, example_cn: 0, tip: 0, ipa: 0 };
  let technicalTips = 0;
  for (const [index, item] of course.vocab.entries()) {
    const key = `${unitFor(course, item)}\u0000${normalizeWord(item.word)}`;
    const group = groups.get(key) ?? [];
    group.push(index);
    groups.set(key, group);
    for (const field of Object.keys(missing)) if (!String(item[field] ?? '').trim()) missing[field]++;
    if (/timestamp|timecode|verified sentence clip|transcript status|not verified/i.test(item.tip ?? '')) technicalTips++;
  }
  const duplicates = [...groups.entries()].filter(([, indexes]) => indexes.length > 1);
  return {
    vocab: course.vocab.length,
    duplicateGroups: duplicates.length,
    duplicateRows: duplicates.reduce((sum, [, indexes]) => sum + indexes.length - 1, 0),
    duplicates,
    missing,
    technicalTips,
  };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  for (const name of (await readdir(coursesDir)).filter(name => name.endsWith('.json')).sort()) {
    const course = JSON.parse(await readFile(new URL(name, coursesDir), 'utf8'));
    const audit = auditCourse(course);
    console.log(JSON.stringify({ file: name, title: course.meta?.title, units: course.units?.length, ...audit }, null, 2));
    if (process.argv.includes('--details')) {
      console.log(JSON.stringify(course.vocab.map((item, index) => ({ index, unit: unitFor(course, item), ...item })), null, 2));
    }
  }
}
