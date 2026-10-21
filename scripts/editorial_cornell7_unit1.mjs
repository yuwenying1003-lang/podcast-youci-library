import { readFile, writeFile } from 'node:fs/promises';

const courseUrl = new URL('../courses/8b77ac948ba43d5d084d03e194ce7ecb.json', import.meta.url);
const unresolvedUrl = new URL('../reports/cornell7-unresolved.json', import.meta.url);
const expansionUrl = new URL('../reports/cornell7-expansion-report.json', import.meta.url);
const coverageUrl = new URL('../reports/cornell7-coverage-index.json', import.meta.url);
const course = JSON.parse(await readFile(courseUrl, 'utf8'));
const unresolved = JSON.parse(await readFile(unresolvedUrl, 'utf8'));
const expansion = JSON.parse(await readFile(expansionUrl, 'utf8'));
const coverage = JSON.parse(await readFile(coverageUrl, 'utf8'));
const c = (text, meaning_zh) => ({ text, meaning_zh, source_kind: 'teaching' });
const edits = {
  accused: { ipa: '/əˈkjuzd/', definition: 'said or believed to have committed a crime or done something wrong', tip: 'accuse + -ed → accused. Keep the single e in accuse, then add d for the past-participle form.', memory_hook: 'Someone accuses; the person becomes the accused.', example: 'The employee was accused of sharing confidential files.', example_cn: '这名员工被指控泄露机密文件。' },
  backpack: { ipa: '/ˈbækˌpæk/', definition: 'a bag carried on the back with two shoulder straps', tip: 'back + pack → backpack: a pack carried on your back.', memory_hook: 'Pack it, zip it, carry it on your back.', example: 'I left my laptop in my backpack.', example_cn: '我把笔记本电脑落在背包里了。' },
  conclusion: { ipa: '/kənˈkluʒən/', definition: 'a judgment or decision reached after considering the facts', tip: 'conclude loses final -de and takes -sion → conclusion. The word family links the action to its result.', memory_hook: 'Conclude the discussion and state your conclusion.', example: 'We should hear both sides before reaching a conclusion.', example_cn: '我们应该听完双方的说法再下结论。' },
  filming: { ipa: '/ˈfɪlmɪŋ/', definition: 'recording people or events with a camera', tip: 'film + -ing → filming. Film keeps its final m before the vowel suffix.', memory_hook: 'The camera is rolling, so they are filming.', example: 'She was filming the concert on her phone.', example_cn: '她当时正用手机拍摄音乐会。' },
  'parking spot': { ipa: '/ˈpɑrkɪŋ spɑt/', definition: 'a marked space where a vehicle can be parked', collocations: [c('find a parking spot', '找到停车位'), c('pull into a parking spot', '驶入停车位')], tip: 'parking + spot: spot means a particular place, so this is the place assigned for parking.', memory_hook: 'Spot an empty space and pull into the parking spot.', mental_image_zh: '停车场里一个空格被绿色圆圈圈出，写着 parking spot。', example: 'It took us ten minutes to find a parking spot.', example_cn: '我们花了十分钟才找到一个停车位。' },
  pedestrian: { ipa: '/pəˈdɛstriən/', definition: 'a person who is walking, especially near traffic', tip: 'ped- relates to “foot,” as in pedal; a pedestrian travels on foot.', memory_hook: 'Pedal uses feet, and a pedestrian walks on foot.', example: 'Drivers must stop for pedestrians at the crosswalk.', example_cn: '司机必须在人行横道前停车让行人先过。' },
  recession: { ipa: '/rɪˈsɛʃən/', definition: 'a period when economic activity declines', tip: 'recede means “move back”; recede + -sion gives recession, when the economy moves backward.', memory_hook: 'When growth recedes, the economy enters a recession.', example: 'Many companies reduced hiring during the recession.', example_cn: '经济衰退期间，许多公司减少了招聘。' },
  scenario: { ipa: '/səˈnɛrioʊ/', definition: 'a possible situation or sequence of events', tip: 'Link scenario with scene: a scenario is a possible scene you can picture unfolding.', memory_hook: 'Picture the scene to understand the scenario.', example: 'Let’s prepare for the worst-case scenario.', example_cn: '我们来为最坏的情况做好准备。' },
  allegedly: { ipa: '/əˈlɛdʒɪdli/', definition: 'according to an unproven claim', tip: 'allege → alleged → allegedly. Build the adverb by adding -ly to alleged.', memory_hook: 'Allegedly reports a claim, not a proven fact.', example: 'The documents were allegedly removed from the office.', example_cn: '据称这些文件被人从办公室拿走了。' },
  anticlimactically: { ipa: '/ˌæntiklaɪˈmæktɪkli/', definition: 'in a disappointingly ordinary way after excitement or expectation', collocations: [c('end anticlimactically', '平淡收场'), c('finish anticlimactically', '以令人失望的方式结束')], tip: 'anti- “against” + climactic “at the dramatic peak” + -ally: the expected climax never arrives.', memory_hook: 'No climax arrives; the story ends anticlimactically.', mental_image_zh: '烟花倒计时结束却只冒出一缕烟，旁边写着 anticlimactically。', example: 'After weeks of hype, the event ended anticlimactically.', example_cn: '经过数周造势，这场活动最终却平淡收场。' },
  balance: { ipa: '/ˈbæləns/', definition: 'the ability to remain steady without falling', tip: 'balance → balanced. The unchanged base helps connect the noun with the adjective.', memory_hook: 'Stay balanced so you do not lose your balance.', example: 'She lost her balance on the icy step.', example_cn: '她在结冰的台阶上失去了平衡。' },
  banned: { ipa: '/bænd/', definition: 'officially forbidden or not allowed', collocations: [c('be banned from campus', '被禁止进入校园'), c('ban someone from an event', '禁止某人参加活动')], tip: 'ban doubles final n before -ed → banned. The double n keeps the short /æ/ sound.', memory_hook: 'One ban becomes two n’s in banned.', mental_image_zh: '校园门口的禁入牌把 ban 的 n 复制成 banned。', example: 'He was banned from attending the event.', example_cn: '他被禁止参加这项活动。' },
  fiasco: { ipa: '/fiˈæskoʊ/', definition: 'a complete and embarrassing failure', tip: 'Fix the unusual ending -asco in your mind through the phrase a complete fiasco.', memory_hook: 'Everything failed: it was a complete fiasco.', example: 'The poorly planned launch turned into a fiasco.', example_cn: '这次计划不周的发布活动变成了一场闹剧。' },
  aggressive: { ipa: '/əˈɡrɛsɪv/', definition: 'forceful, hostile, or ready to attack or argue', collocations: [c('aggressive behavior', '攻击性行为'), c('sound aggressive', '听起来咄咄逼人')], tip: 'aggression → aggressive: both keep the double g and double s; -ive makes the adjective.', memory_hook: 'Aggression describes the act; aggressive describes the behavior.', mental_image_zh: '一句话两边各站着 gg 和 ss，语气显得 aggressive。', example: 'His reply sounded more defensive than aggressive.', example_cn: '他的回答听起来更像是在防御，而不是咄咄逼人。' },
  bizarre: { ipa: '/bəˈzɑr/', definition: 'very strange or difficult to explain', tip: 'Remember the striking spelling: one z but double r in bizarre; anchor it in a bizarre situation.', memory_hook: 'If the situation is strangely hard to explain, call it bizarre.', example: 'That explanation sounds completely bizarre.', example_cn: '那个解释听起来十分离奇。' },
  investigation: { ipa: '/ɪnˌvɛstəˈɡeɪʃən/', definition: 'an official or careful examination of facts to discover what happened', tip: 'investigate drops final e and adds -ion → investigation.', memory_hook: 'Investigate the evidence during an investigation.', example: 'The university opened an investigation into the complaint.', example_cn: '大学针对这起投诉展开了调查。' },
  loitering: { ipa: '/ˈlɔɪtərɪŋ/', definition: 'remaining in a place without an obvious purpose', collocations: [c('loiter outside', '在外面闲逛逗留'), c('no loitering', '禁止逗留')], tip: 'loiter + -ing → loitering. Keep the /ɔɪ/ sound from loiter, like the sound in “boy.”', memory_hook: 'No clear destination—just loitering around.', mental_image_zh: '商店门口有人来回踱步，牌子上写着 No loitering。', example: 'A group of teenagers was loitering near the entrance.', example_cn: '一群青少年在入口附近闲逛。' },
  prestigious: { ipa: '/prɛˈstɪdʒəs/', definition: 'respected and admired because of high quality or importance', tip: 'prestige + -ous → prestigious. The /ʒ/ in prestige shifts to /dʒ/ before -ous.', memory_hook: 'Prestige gives a school its prestigious reputation.', example: 'She received a scholarship from a prestigious university.', example_cn: '她获得了一所知名大学的奖学金。' },
  vehicle: { ipa: '/ˈviəkəl/', definition: 'a machine such as a car or truck used to transport people or goods', tip: 'Hear vehicle as three light beats: ve-hi-cle /ˈvi.ə.kəl/; do not pronounce the written h strongly.', memory_hook: 'A vehicle carries people from one place to another.', example: 'Keep a safe distance from the moving vehicle.', example_cn: '请与行驶中的车辆保持安全距离。' },
  bonk: { ipa: '/bɑŋk/', definition: 'to hit or collide with something, making a dull sound', collocations: [c('bonk your head', '撞到头'), c('bonk into something', '砰地撞上某物')], tip: 'Bonk sounds like the dull impact it describes; the final -nk ends with /ŋk/.', memory_hook: 'Bonk—the sound of a light, dull bump.', mental_image_zh: '头轻轻撞到柜门，声音“bonk”正写在撞击点上。', example: 'I bonked my head on the open cabinet door.', example_cn: '我的头撞到了敞开的橱柜门上。' },
  screaming: { ipa: '/ˈskrimɪŋ/', definition: 'shouting or crying in a very loud, high voice', collocations: [c('start screaming', '开始尖叫'), c('hear someone screaming', '听见某人在尖叫')], tip: 'scream + -ing → screaming. The long /i/ sound matches the extended ee spelling.', memory_hook: 'The double e stretches the sound in screaming.', mental_image_zh: '画面中的 ee 被拉得很长，像一声持续的尖叫。', example: 'We heard someone screaming outside.', example_cn: '我们听见有人在外面尖叫。' },
  campus: { ipa: '/ˈkæmpəs/', definition: 'the buildings and grounds of a university or school', collocations: [c('on campus', '在校园内'), c('campus police', '校园警察')], tip: 'campus begins with camp: picture a group of university buildings gathered like a camp.', memory_hook: 'The whole university community gathers on campus.', mental_image_zh: '几栋教学楼像营地一样围在一起，中间写着 campus。', example: 'Visitors must register before entering the campus.', example_cn: '访客进入校园前必须登记。' },
  individual: { ipa: '/ˌɪndəˈvɪdʒuəl/', definition: 'one particular person considered separately from a group', collocations: [c('the individual involved', '涉事个人'), c('each individual', '每一个人')], tip: 'in- + dividual connects with divide: an individual is one person separated from the group.', memory_hook: 'Divide the group until one individual remains.', mental_image_zh: '人群分开后只剩一个人，头顶写着 individual。', example: 'Each individual is responsible for following the rules.', example_cn: '每个人都有责任遵守这些规定。' },
  alleged: { ipa: '/əˈlɛdʒd/', definition: 'claimed to be true but not yet proved', collocations: [c('alleged assault', '被指称的袭击'), c('alleged misconduct', '被指称的不当行为')], tip: 'allege + -d → alleged. Because allege already ends in e, add only d.', memory_hook: 'An alleged event is claimed, not confirmed.', mental_image_zh: '报道上的 alleged 旁边盖着“尚未证实”的印章。', example: 'Police are investigating the alleged assault.', example_cn: '警方正在调查这起据称发生的袭击。' },
  potentially: { ipa: '/pəˈtɛnʃəli/', definition: 'possibly, if circumstances develop in a particular way', collocations: [c('potentially dangerous', '可能有危险的'), c('potentially useful', '可能有用的')], tip: 'potential + -ly → potentially. The -ial ending becomes -ially in the adverb.', memory_hook: 'Potential means possibility; potentially means possibly.', mental_image_zh: '两条可能的道路从 potential 延伸到 potentially。', example: 'The loose cable is potentially dangerous.', example_cn: '这根松动的电缆可能有危险。' },
  frat: { ipa: '/fræt/', definition: 'an informal shortened form of fraternity, especially a college fraternity', collocations: [c('frat house', '兄弟会会所'), c('frat brother', '兄弟会成员')], tip: 'frat is the clipped spoken form of fraternity: keep the opening frat- and drop the rest.', memory_hook: 'Fraternity gets shortened to frat in casual speech.', mental_image_zh: '长单词 fraternity 被剪短，只留下口语形式 frat。', example: 'He met his friends at the frat house.', example_cn: '他在兄弟会会所见到了朋友们。' },
};

let reviewed = 0;
for (const item of course.vocab.filter(item => item.unit === 0)) {
  const edit = edits[item.word];
  if (!edit) throw new Error(`Missing Unit 1 editorial record for ${item.word}`);
  Object.assign(item, edit, {
    definition_status: 'context_reviewed',
    ipa_status: 'american_ipa_reviewed',
    mnemonic_status: 'editorially_curated_complete_card',
    editorial_status: 'reviewed_complete',
    example_source: 'adapted',
    review_date: '2026-10-22',
  });
  reviewed += 1;
}
if (reviewed !== 26) throw new Error(`Expected 26 Unit 1 cards, reviewed ${reviewed}`);
if (!course.expressions.some(item => item.unit === 0 && item.text === 'back up')) course.expressions.push({
  text: 'back up', definition: 'to move backward, especially in a vehicle', cn: '倒车；向后移动', difficulty: 'Essential', unit: 0,
  source_page: 3, source_segment: 'segment-47', source_excerpt: 'It just starts slowly backing up.', source_kind: 'original', source_verification: 'verified_transcript_match', extraction_confidence: 'high',
  grammatical_pattern: 'back up / back the car up', connected_speech_note: 'The two words link naturally in speech.', daily_usefulness: 'High',
  example: 'Could you back up a little?', example_cn: '你能稍微往后退一点吗？', example_source: 'adapted', editorial_status: 'reviewed_complete',
});
const newChunks = [
  { text: 'Is that what it is?', cn: '原来是这样吗？／是这个意思吗？', example: 'Oh, is that what it is? I thought the noise came from outside.', prompt: 'Use “Is that what it is?” when you have just understood an explanation.', source_page: 3, source_segment: 'segment-40', source_excerpt: 'Is that what it is?', communicative_function: 'checking a newly understood explanation', scenarios: [
    { type: 'daily', label: 'Daily life', scene_zh: '家人解释以后，你终于明白冰箱为什么一直响。', goal_en: 'Check whether that explanation is correct.', keywords: ['fridge', 'noise'], starter: 'Oh, is that what it is?', reference_answer: 'Oh, is that what it is? I thought something was broken.' },
    { type: 'social', label: 'Friends', scene_zh: '朋友解释以后，你终于听懂了刚才那个玩笑。', goal_en: 'Confirm that you now understand the joke.', keywords: ['joke', 'meaning'], starter: 'Is that what it is?', reference_answer: 'Is that what it is? Now the joke makes sense.' },
    { type: 'work', label: 'Work', scene_zh: '同事说明情况后，你明白了报表数字变化的原因。', goal_en: 'Confirm your understanding of the cause.', keywords: ['report', 'change'], starter: 'Is that what it is?', reference_answer: 'Is that what it is? I thought the change came from the new pricing.' },
  ] },
  { text: 'prevent ... from ...', cn: '阻止……做……', example: 'The delay prevented us from finishing on time.', prompt: 'Use “prevent ... from ...” to explain what stopped an action.', source_page: 3, source_segment: 'segment-42', source_excerpt: 'Okay, so prevent it from leaving.', communicative_function: 'explaining what stops an action', scenarios: [
    { type: 'daily', label: 'Daily life', scene_zh: '今天雨下得很大，导致你没有办法按计划出门。', goal_en: 'Explain what stopped you from going out.', keywords: ['rain', 'go out'], starter: 'The rain prevented me from', reference_answer: 'The heavy rain prevented me from going out.' },
    { type: 'social', label: 'Friends', scene_zh: '路上交通严重堵塞，导致朋友没有按时赶到聚会。', goal_en: 'Explain why your friend was late.', keywords: ['traffic', 'arrive'], starter: 'Traffic prevented her from', reference_answer: 'Traffic prevented her from arriving on time.' },
    { type: 'work', label: 'Work', scene_zh: '公司系统突然出现故障，团队因此无法提交报告。', goal_en: 'Explain what blocked the submission.', keywords: ['system issue', 'submit'], starter: 'The system issue prevented us from', reference_answer: 'The system issue prevented us from submitting the report.' },
  ] },
];
for (const item of newChunks) {
  const complete = { ...item, source_kind: 'original', source_verification: 'verified_transcript_match', extraction_confidence: 'high', editorial_status: 'reviewed_complete', original_en: item.source_excerpt, everyday_example: item.example };
  const index = course.patterns[0].findIndex(existing => existing.text === item.text);
  if (index >= 0) course.patterns[0][index] = complete;
  else course.patterns[0].push(complete);
}
const dispositions = {
  6: ['no_identified_barrier', [], 'Date reference; no additional learning barrier.'],
  13: ['covered', ['phrase:0:back into'], 'Covered by the phrasal verb “back into.”'],
  15: ['covered', ['word:0:bonk'], 'Covered by the informal impact word “bonk.”'],
  23: ['covered', ['phrase:0:run over'], 'Covered by “run over”; profanity adds emotion but not a separate target.'],
  28: ['no_identified_barrier', [], 'Simple quantity statement; nonstandard agreement is spontaneous speech, not a target model.'],
  30: ['covered', ['word:0:allegedly', 'phrase:0:run over'], 'Claim-status adverb and phrasal verb are both covered.'],
  36: ['covered', ['phrase:0:at fault', 'phrase:0:run over'], 'Responsibility and collision expressions are covered; “bumped/boomed” is contextual sound play.'],
  40: ['covered', ['chunk:0:is that what it is'], 'Added a reusable clarification/reaction chunk.'],
  42: ['covered', ['chunk:0:prevent from'], 'Added the reusable prevent + object + from + -ing pattern.'],
  46: ['no_identified_barrier', [], 'Incomplete spontaneous false start; meaning continues in the next segment.'],
  47: ['covered', ['phrase:0:back up'], 'Added the everyday phrasal verb “back up.”'],
};
for (const item of coverage.segments) if (dispositions[item.segment]) {
  const [status, ids, reason] = dispositions[item.segment];
  Object.assign(item, { status, learning_item_ids: ids, review_reason: reason, review_status: 'manually_reviewed', review_date: '2026-10-22' });
}
coverage.report.totals = { words: course.vocab.length, phrases: course.expressions.length, chunks: course.patterns.flat().length };
coverage.report.coverage_status = Object.fromEntries(['covered', 'no_identified_barrier', 'requires_review'].map(status => [status, coverage.segments.filter(item => item.status === status).length]));
expansion.totals = coverage.report.totals;
expansion.coverage_status = coverage.report.coverage_status;
unresolved.transcript_segments_requiring_review = coverage.segments.filter(item => item.status === 'requires_review').map(item => ({ page: item.page, segment: item.segment }));
unresolved.missing_example_translation = course.vocab.filter(item => !item.example_cn).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolved.generated_spelling_context_memory = course.vocab.filter(item => item.tip?.startsWith('Spelling anchor:')).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolved.requires_human_review = course.vocab.filter(item => item.editorial_status !== 'reviewed_complete').map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word }));
unresolved.externally_sourced_ipa_requiring_review = course.vocab.filter(item => item.ipa_status?.includes('unreviewed')).map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, ipa: item.ipa, source: item.ipa_source, status: item.ipa_status }));
unresolved.externally_sourced_definition_requiring_review = course.vocab.filter(item => item.definition_status === 'external_dictionary_unreviewed').map(item => ({ unit: item.unit + 1, page: item.source_page, word: item.word, definition: item.definition, source: item.definition_source }));
for (const [key, values] of Object.entries(unresolved)) if (Array.isArray(values)) expansion.unresolved_counts[key] = values.length;
expansion.reviewed_word_cards = course.vocab.filter(item => item.editorial_status === 'reviewed_complete').length;
expansion.translated_word_examples = course.vocab.filter(item => item.example_cn).length;
expansion.upgraded_memory_tips = course.vocab.filter(item => item.mnemonic_status === 'editorially_curated_complete_card').length;
await Promise.all([
  writeFile(courseUrl, `${JSON.stringify(course, null, 2)}\n`),
  writeFile(unresolvedUrl, `${JSON.stringify(unresolved, null, 2)}\n`),
  writeFile(expansionUrl, `${JSON.stringify(expansion, null, 2)}\n`),
  writeFile(coverageUrl, `${JSON.stringify(coverage, null, 2)}\n`),
]);
console.log(JSON.stringify({ unit: 1, reviewed }, null, 2));
