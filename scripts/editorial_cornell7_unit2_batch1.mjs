import { readFile, writeFile } from 'node:fs/promises';

const courseUrl = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const course = JSON.parse(await readFile(courseUrl, 'utf8'));
const c = (text, meaning_zh) => ({ text, meaning_zh, source_kind: 'teaching' });
const edits = {
  administration: { ipa: '/ədˌmɪnəˈstreɪʃən/', definition: 'the people who manage a university or other institution', collocations: [c('university administration', '大学行政部门'), c('administration and staff', '行政部门与工作人员')], tip: 'administer → administration: drop final -er and add -ation for the managing body or process.', memory_hook: 'People who administer the university form its administration.', mental_image_zh: '一群负责 administer 校务的人站在 administration 办公室里。', example: 'The university administration released a public statement.', example_cn: '大学行政部门发布了一份公开声明。' },
  deemed: { ipa: '/dimd/', definition: 'formally judged or considered to be something', collocations: [c('be deemed responsible', '被认定负有责任'), c('be deemed unsafe', '被认定不安全')], tip: 'deem + -ed → deemed. Deem already ends in m, so the past form keeps one m and adds -ed.', memory_hook: 'Officials deem it unsafe; it is deemed unsafe.', mental_image_zh: '文件上盖章写着 deemed responsible，表示已经作出认定。', example: 'The building was deemed unsafe after the inspection.', example_cn: '检查后，这栋楼被认定为不安全。' },
  president: { ipa: '/ˈprɛzɪdənt/', definition: 'the person in charge of a university or organization', collocations: [c('university president', '大学校长'), c('company president', '公司总裁')], tip: 'preside means “lead a meeting”; the person who presides is the president.', memory_hook: 'The president presides over the institution.', mental_image_zh: '校长站在会议桌首位主持会议，preside 与 president 连在一起。', example: 'The university president addressed the students.', example_cn: '大学校长向学生发表了讲话。' },
  apparently: { ipa: '/əˈpɛrəntli/', definition: 'according to what seems true or what has been reported, though it may not be certain', collocations: [c('apparently true', '看起来是真的'), c('apparently unaware', '似乎并不知情')], tip: 'apparent + -ly → apparently. Drop no letters: keep apparent, then add -ly.', memory_hook: 'If something is only apparent, say apparently rather than certainly.', mental_image_zh: '事实前蒙着一层薄雾，只能写 apparently，不能写 certainly。', example: 'Apparently, the meeting was moved to Friday.', example_cn: '听说会议改到星期五了。' },
  conduct: { ipa: '/ˈkɑndʌkt/', definition: 'the way a person behaves, especially in an official or public setting', collocations: [c('past conduct', '以往行为'), c('code of conduct', '行为准则')], tip: 'The noun CONduct stresses the first syllable; the verb conDUCT stresses the second.', memory_hook: 'A code of conduct guides how people conduct themselves.', mental_image_zh: '行为准则上把名词 CONduct 的重音标在第一个音节。', example: 'The complaint described a pattern of inappropriate conduct.', example_cn: '投诉描述了一系列不当行为。' },
};
let count = 0;
for (const item of course.vocab.filter(item => item.unit === 1)) {
  const edit = edits[item.word];
  if (!edit) continue;
  Object.assign(item, edit, { definition_status: 'context_reviewed', ipa_status: 'american_ipa_reviewed', mnemonic_status: 'editorially_curated_complete_card', editorial_status: 'reviewed_complete', example_source: 'adapted', review_date: '2026-10-22' });
  count += 1;
}
if (count !== Object.keys(edits).length) throw new Error(`Expected ${Object.keys(edits).length} edits, applied ${count}`);
await writeFile(courseUrl, `${JSON.stringify(course, null, 2)}\n`);
console.log(JSON.stringify({ unit: 2, reviewed_in_batch: count }, null, 2));
