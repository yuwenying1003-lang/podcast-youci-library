import { readFile, writeFile } from 'node:fs/promises';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Pass one or more course JSON files.');

const topicSets = {
  daily: ['去超市购物时临时换了选择', '做饭时发现结果和预想不同', '周末出行时改变了原计划', '乘坐公共交通时遇到一个问题', '安排家务时需要解释自己的决定'],
  social: ['和朋友商量见面时间', '聊一部电影带来的不同感受', '分享一次旅行中的意外经历', '回应朋友对周末计划的看法', '向朋友澄清一件容易误会的事'],
  work: ['在会议上汇报项目进度', '向同事解释一个具体问题', '讨论截止时间和备选方案', '说明一个决定可能带来的风险', '更新团队目前已经确认的信息'],
};

function keywords(example) {
  const stop = new Set(['about', 'after', 'again', 'although', 'because', 'being', 'could', 'every', 'from', 'have', 'into', 'rather', 'should', 'still', 'that', 'their', 'there', 'these', 'they', 'this', 'through', 'under', 'very', 'what', 'when', 'where', 'which', 'while', 'with', 'would']);
  const words = (example.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []).filter(word => word.length > 3 && !stop.has(word));
  return [...new Set(words)].slice(0, 4);
}

function starter(pattern) {
  const literal = pattern.text.split(/…|\.\.\./)[0].replace(/\s+$/, '').trim();
  if (literal.length >= 3 && literal.length <= 60) return literal;
  return pattern.example.split(/\s+/).slice(0, 5).join(' ');
}

for (const file of files) {
  const course = JSON.parse(await readFile(file, 'utf8'));
  let ordinal = 0;
  for (const unit of course.patterns) {
    for (const pattern of unit) {
      const categories = [['daily', 'Daily life · 日常生活'], ['social', 'Social conversation · 朋友聊天'], ['work', 'Work communication · 工作交流']];
      pattern.scenarios = categories.map(([type, label], categoryIndex) => ({
        type,
        label,
        scene_zh: `${topicSets[type][(ordinal + categoryIndex) % topicSets[type].length]}：请用“${pattern.cn}”组织一句完整英语。`,
        goal_en: pattern.prompt,
        keywords: keywords(pattern.example),
        starter: starter(pattern),
        reference_answer: pattern.example,
      }));
      ordinal += 1;
    }
  }
  await writeFile(file, `${JSON.stringify(course, null, 2)}\n`);
}
