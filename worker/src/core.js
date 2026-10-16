export const MAX_SENTENCE_LENGTH = 500;
export const MAX_CONTEXT_LENGTH = 800;
export const FEEDBACK_STATUSES = new Set(['correct', 'needs_improvement', 'incorrect']);
export const REQUIRED_FEEDBACK_FIELDS = [
  'status',
  'grammar_feedback_zh',
  'pattern_usage_feedback_zh',
  'corrected_sentence',
  'natural_alternative',
  'brief_explanation_zh',
];

export function validateFeedbackInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求格式无效。');
  const clean = {};
  for (const field of ['sentence', 'target_pattern', 'scenario_zh', 'reference_answer']) {
    if (typeof value[field] !== 'string') throw new Error(`缺少 ${field}。`);
    clean[field] = value[field].trim();
  }
  if (!clean.sentence) throw new Error('请先填写英文句子。');
  if (clean.sentence.length > MAX_SENTENCE_LENGTH) throw new Error(`英文句子不能超过 ${MAX_SENTENCE_LENGTH} 个字符。`);
  for (const field of ['target_pattern', 'scenario_zh', 'reference_answer']) {
    if (!clean[field] || clean[field].length > MAX_CONTEXT_LENGTH) throw new Error(`${field} 内容无效。`);
  }
  return clean;
}

export function validateGeminiFeedback(value) {
  if (!value || typeof value !== 'object' || !FEEDBACK_STATUSES.has(value.status)) throw new Error('AI 返回了无效的评价状态。');
  const clean = { status: value.status };
  for (const field of REQUIRED_FEEDBACK_FIELDS.slice(1)) {
    if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`AI 返回缺少 ${field}。`);
    clean[field] = value[field].trim().slice(0, 1200);
  }
  return clean;
}

export function feedbackSchema() {
  const stringField = { type: 'string' };
  return {
    type: 'object',
    properties: {
      status: { type: 'string', enum: [...FEEDBACK_STATUSES] },
      grammar_feedback_zh: stringField,
      pattern_usage_feedback_zh: stringField,
      corrected_sentence: stringField,
      natural_alternative: stringField,
      brief_explanation_zh: stringField,
    },
    required: REQUIRED_FEEDBACK_FIELDS,
    additionalProperties: false,
  };
}

export function buildPrompt(input) {
  return `你是一位克制、友善的英语教师。请根据目标句式和中文场景评价学习者的英文造句，而不是与参考答案做字符串匹配。\n
规则：\n
1. 句子自然正确且符合场景时判定 correct，不要为了展示能力而过度纠正。\n
2. 小问题判定 needs_improvement；明显语法错误、含义不成立或没有使用目标句式才判定 incorrect。\n
3. corrected_sentence 保留学习者原意；如果原句正确，可以原样返回。\n
4. natural_alternative 提供一个自然但不是唯一标准答案的表达。\n
5. 所有解释使用简洁中文；英文句子字段只放英文。\n
目标句式：${input.target_pattern}\n
中文场景：${input.scenario_zh}\n
学习者句子：${input.sentence}\n
参考答案（仅供理解场景，不是唯一答案）：${input.reference_answer}`;
}

export function corsHeaders(origin, allowedOrigin) {
  if (origin !== allowedOrigin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
