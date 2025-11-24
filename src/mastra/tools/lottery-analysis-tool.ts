import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { lotteryHistory, LotteryDraw } from '../data/lottery-history';

type Strategy = 'hot' | 'balanced' | 'cold';

type ScoreRow = {
  number: number;
  frequency: number;
  lastSeenDistance: number;
  hotScore: number;
  coldScore: number;
  balancedScore: number;
};

const RED_RANGE = 33;
const BLUE_RANGE = 16;

export const lotteryAnalysisTool = createTool({
  id: 'lottery-analysis',
  description:
    '基于历史双色球开奖号码做频率/遗漏分析，给出下一期推荐号码组合。',
  inputSchema: z.object({
    drawsToConsider: z
      .number()
      .int()
      .min(6)
      .max(lotteryHistory.length)
      .default(20)
      .describe('分析最近多少期，默认 20 期'),
    strategy: z
      .enum(['hot', 'balanced', 'cold'])
      .default('balanced')
      .describe('选号偏好：hot 热门，balanced 均衡，cold 冷门/回补'),
    numRecommendations: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(3)
      .describe('返回几组方案，默认 3 组'),
  }),
  outputSchema: z.object({
    recommendations: z.array(
      z.object({
        label: z.string(),
        reds: z.array(z.number()),
        blue: z.number(),
        rationale: z.string(),
      }),
    ),
    analytics: z.object({
      hotReds: z.array(z.number()),
      coldReds: z.array(z.number()),
      hotBlues: z.array(z.number()),
      coldBlues: z.array(z.number()),
      consideredIssues: z.array(z.string()),
    }),
    note: z.string(),
  }),
  execute: async ({ context }) => {
    const { drawsToConsider, strategy, numRecommendations } = context;

    const draws = lotteryHistory.slice(-drawsToConsider);
    const redScores = buildScores(draws, 'red');
    const blueScores = buildScores(draws, 'blue');

    const recommendations = buildRecommendations({
      redScores,
      blueScores,
      strategy,
      numRecommendations,
    });

    return {
      recommendations,
      analytics: {
        hotReds: topNumbers(redScores, 'hot', 8),
        coldReds: topNumbers(redScores, 'cold', 8),
        hotBlues: topNumbers(blueScores, 'hot', 6),
        coldBlues: topNumbers(blueScores, 'cold', 6),
        consideredIssues: draws.map((d) => d.issue),
      },
      note:
        '数据为示例历史开奖，分析仅供娱乐参考，不构成购彩建议。建议结合个人预算、风险偏好并理性购彩。',
    };
  },
});

function buildScores(draws: LotteryDraw[], type: 'red' | 'blue'): ScoreRow[] {
  const upper = type === 'red' ? RED_RANGE : BLUE_RANGE;
  const counts: Record<number, number> = {};
  const lastSeenIndex: Record<number, number> = {};

  draws.forEach((draw, idx) => {
    const arr = type === 'red' ? draw.reds : [draw.blue];
    arr.forEach((num) => {
      counts[num] = (counts[num] || 0) + 1;
      lastSeenIndex[num] = idx; // smaller idx = 越早出现，越接近 draws[0]
    });
  });

  const maxCount = Math.max(...Array.from({ length: upper }, (_, i) => counts[i + 1] || 0), 1);
  const maxDistance = draws.length;
  const maxIndex = Math.max(draws.length - 1, 1);

  const rows: ScoreRow[] = Array.from({ length: upper }, (_, i) => {
    const number = i + 1;
    const frequency = counts[number] || 0;
    const distance = lastSeenIndex[number] === undefined ? maxDistance : draws.length - lastSeenIndex[number]; // 越大越近期出现
    const freqNorm = frequency / maxCount; // 0-1 频率占比
    const recentNorm = lastSeenIndex[number] === undefined ? 0 : 1 - lastSeenIndex[number] / maxIndex; // 1 表示最新一期出现

    const hotScore = freqNorm * 0.65 + recentNorm * 0.35;
    const coldScore = (1 - freqNorm) * 0.55 + (1 - recentNorm) * 0.45;
    const balancedScore = hotScore * 0.5 + coldScore * 0.5;

    return {
      number,
      frequency,
      lastSeenDistance: distance,
      hotScore,
      coldScore,
      balancedScore,
    };
  });

  return rows.sort((a, b) => b.hotScore - a.hotScore); // default hot ordering for consistency
}

function buildRecommendations({
  redScores,
  blueScores,
  strategy,
  numRecommendations,
}: {
  redScores: ScoreRow[];
  blueScores: ScoreRow[];
  strategy: Strategy;
  numRecommendations: number;
}) {
  const strategyKey =
    strategy === 'hot' ? 'hotScore' : strategy === 'cold' ? 'coldScore' : 'balancedScore';

  const sortedReds = sortByStrategy(redScores, strategyKey);
  const sortedBlues = sortByStrategy(blueScores, strategyKey);

  const results = Array.from({ length: numRecommendations }, (_, idx) => {
    const reds = pickNumbers(sortedReds, 6, idx * 2);
    const blue = pickNumbers(sortedBlues, 1, idx).at(0) || sortedBlues[0].number;

    return {
      label: `方案 ${idx + 1}`,
      reds,
      blue,
      rationale: buildRationale({ reds, blue, strategy }),
    };
  });

  return results;
}

function sortByStrategy(rows: ScoreRow[], key: keyof ScoreRow) {
  return [...rows].sort((a, b) => (b[key] as number) - (a[key] as number));
}

function pickNumbers(rows: ScoreRow[], count: number, offset: number) {
  if (!rows.length) return [] as number[];
  const rotated = rotate(rows, offset);
  return rotated
    .slice(0, count)
    .map((r) => r.number)
    .sort((a, b) => a - b);
}

function rotate<T>(arr: T[], offset: number) {
  const len = arr.length;
  const start = ((offset % len) + len) % len;
  return [...arr.slice(start), ...arr.slice(0, start)];
}

function topNumbers(rows: ScoreRow[], type: keyof ScoreRow, count: number) {
  return [...rows]
    .sort((a, b) => (b[type] as number) - (a[type] as number))
    .slice(0, count)
    .map((r) => r.number);
}

function buildRationale({
  reds,
  blue,
  strategy,
}: {
  reds: number[];
  blue: number;
  strategy: Strategy;
}) {
  const style =
    strategy === 'hot'
      ? '偏热，主打近期高频 + 低遗漏'
      : strategy === 'cold'
        ? '偏冷，主打长遗漏 + 低频回补'
        : '均衡，冷热搭配并控制连号';

  const pairs = reds
    .map((r, idx) => `${r}${idx < reds.length - 1 ? '-' : ''}`)
    .join('');

  return `${style}。红球 ${pairs}，蓝球 ${blue}。`;
}
