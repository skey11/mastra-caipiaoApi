// Minimal Cloudflare Worker implementing the lottery analysis tool without Mastra runtime.
// API: POST /chat or /analyze with JSON body:
// {
//   "strategy": "hot" | "balanced" | "cold",
//   "drawsToConsider": number,
//   "numRecommendations": number
// }
// Returns JSON with recommendations and analytics.

const lotteryHistory = [
  { issue: '202401', date: '2024-01-02', reds: [2, 7, 11, 18, 24, 30], blue: 9 },
  { issue: '202402', date: '2024-01-05', reds: [3, 12, 15, 22, 27, 31], blue: 4 },
  { issue: '202403', date: '2024-01-09', reds: [6, 9, 14, 20, 25, 33], blue: 13 },
  { issue: '202404', date: '2024-01-12', reds: [1, 5, 10, 19, 21, 29], blue: 6 },
  { issue: '202405', date: '2024-01-16', reds: [4, 8, 17, 23, 26, 32], blue: 2 },
  { issue: '202406', date: '2024-01-19', reds: [7, 11, 13, 16, 24, 28], blue: 15 },
  { issue: '202407', date: '2024-01-23', reds: [2, 9, 18, 20, 25, 33], blue: 1 },
  { issue: '202408', date: '2024-01-26', reds: [6, 12, 15, 22, 27, 30], blue: 14 },
  { issue: '202409', date: '2024-01-30', reds: [3, 5, 10, 19, 21, 29], blue: 7 },
  { issue: '202410', date: '2024-02-02', reds: [4, 8, 14, 17, 23, 26], blue: 10 },
  { issue: '202411', date: '2024-02-06', reds: [1, 7, 13, 16, 24, 32], blue: 5 },
  { issue: '202412', date: '2024-02-09', reds: [2, 9, 11, 20, 25, 33], blue: 12 },
  { issue: '202413', date: '2024-02-13', reds: [6, 10, 15, 22, 27, 31], blue: 3 },
  { issue: '202414', date: '2024-02-16', reds: [3, 5, 12, 19, 21, 30], blue: 8 },
  { issue: '202415', date: '2024-02-20', reds: [4, 8, 14, 17, 23, 26], blue: 11 },
  { issue: '202416', date: '2024-02-23', reds: [1, 7, 13, 16, 24, 28], blue: 6 },
  { issue: '202417', date: '2024-02-27', reds: [2, 9, 18, 20, 25, 29], blue: 16 },
  { issue: '202418', date: '2024-03-01', reds: [6, 10, 15, 22, 27, 32], blue: 2 },
  { issue: '202419', date: '2024-03-05', reds: [3, 5, 12, 19, 21, 33], blue: 9 },
  { issue: '202420', date: '2024-03-08', reds: [4, 8, 14, 17, 23, 30], blue: 15 },
  { issue: '202421', date: '2024-03-12', reds: [1, 7, 11, 16, 24, 28], blue: 4 },
  { issue: '202422', date: '2024-03-15', reds: [2, 9, 18, 20, 25, 31], blue: 13 },
  { issue: '202423', date: '2024-03-19', reds: [6, 10, 15, 22, 27, 29], blue: 5 },
  { issue: '202424', date: '2024-03-22', reds: [3, 5, 12, 19, 21, 26], blue: 14 },
  { issue: '202425', date: '2024-03-26', reds: [4, 8, 14, 17, 23, 30], blue: 7 },
];

const RED_RANGE = 33;
const BLUE_RANGE = 16;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=utf-8' },
  });

const parseBody = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

function buildScores(draws, type) {
  const upper = type === 'red' ? RED_RANGE : BLUE_RANGE;
  const counts = {};
  const lastSeenIndex = {};

  draws.forEach((draw, idx) => {
    const arr = type === 'red' ? draw.reds : [draw.blue];
    arr.forEach((num) => {
      counts[num] = (counts[num] || 0) + 1;
      lastSeenIndex[num] = idx;
    });
  });

  const maxCount = Math.max(...Array.from({ length: upper }, (_, i) => counts[i + 1] || 0), 1);
  const maxDistance = draws.length;
  const maxIndex = Math.max(draws.length - 1, 1);

  return Array.from({ length: upper }, (_, i) => {
    const number = i + 1;
    const frequency = counts[number] || 0;
    const distance = lastSeenIndex[number] === undefined ? maxDistance : draws.length - lastSeenIndex[number];
    const freqNorm = frequency / maxCount;
    const recentNorm = lastSeenIndex[number] === undefined ? 0 : 1 - lastSeenIndex[number] / maxIndex;

    const hotScore = freqNorm * 0.65 + recentNorm * 0.35;
    const coldScore = (1 - freqNorm) * 0.55 + (1 - recentNorm) * 0.45;
    const balancedScore = hotScore * 0.5 + coldScore * 0.5;

    return { number, frequency, lastSeenDistance: distance, hotScore, coldScore, balancedScore };
  }).sort((a, b) => b.hotScore - a.hotScore);
}

const sortByStrategy = (rows, key) => [...rows].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
const rotate = (arr, offset) => {
  const len = arr.length;
  if (!len) return [];
  const start = ((offset % len) + len) % len;
  return [...arr.slice(start), ...arr.slice(0, start)];
};
const pickNumbers = (rows, count, offset) =>
  rotate(rows, offset)
    .slice(0, count)
    .map((r) => r.number)
    .sort((a, b) => a - b);
const topNumbers = (rows, key, count) => sortByStrategy(rows, key).slice(0, count).map((r) => r.number);

function buildRationale({ reds, blue, strategy }) {
  const style =
    strategy === 'hot'
      ? '偏热，主打近期高频 + 低遗漏'
      : strategy === 'cold'
        ? '冷门回补，博反弹'
        : '均衡，冷热搭配';
  return `${style}。红球 ${reds.join(' ')}；蓝球 ${blue}。`;
}

function buildRecommendations({ redScores, blueScores, strategy, numRecommendations }) {
  const key = strategy === 'hot' ? 'hotScore' : strategy === 'cold' ? 'coldScore' : 'balancedScore';
  const sortedReds = sortByStrategy(redScores, key);
  const sortedBlues = sortByStrategy(blueScores, key);

  return Array.from({ length: numRecommendations }, (_, idx) => {
    const reds = pickNumbers(sortedReds, 6, idx * 2);
    const blue = pickNumbers(sortedBlues, 1, idx).at(0) ?? sortedBlues[0].number;
    return { label: `方案 ${idx + 1}`, reds, blue, rationale: buildRationale({ reds, blue, strategy }) };
  });
}

async function handleAnalyze(req) {
  const body = await parseBody(req);
  const drawsToConsider = clamp(Number(body.drawsToConsider) || 20, 6, lotteryHistory.length);
  const strategy = ['hot', 'cold', 'balanced'].includes(body.strategy) ? body.strategy : 'balanced';
  const numRecommendations = clamp(Number(body.numRecommendations) || 3, 1, 5);

  const draws = lotteryHistory.slice(-drawsToConsider);
  const redScores = buildScores(draws, 'red');
  const blueScores = buildScores(draws, 'blue');
  const recommendations = buildRecommendations({ redScores, blueScores, strategy, numRecommendations });

  return json({
    recommendations,
    analytics: {
      hotReds: topNumbers(redScores, 'hotScore', 8),
      coldReds: topNumbers(redScores, 'coldScore', 8),
      hotBlues: topNumbers(blueScores, 'hotScore', 6),
      coldBlues: topNumbers(blueScores, 'coldScore', 6),
      consideredIssues: draws.map((d) => d.issue),
    },
    note: '示例历史开奖数据，分析仅供娱乐参考，请理性购彩。',
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && (url.pathname === '/chat' || url.pathname === '/analyze')) {
      return handleAnalyze(request);
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }
    return json(
      {
        message: 'POST /chat (strategy: hot|balanced|cold, drawsToConsider, numRecommendations)',
        example: { strategy: 'balanced', drawsToConsider: 20, numRecommendations: 3 },
      },
      404,
    );
  },
};
