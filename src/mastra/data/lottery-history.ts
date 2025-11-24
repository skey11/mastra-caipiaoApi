export type LotteryDraw = {
  issue: string;
  date: string;
  reds: number[];
  blue: number;
};

// Sample historical draws for "双色球" style lottery (6 red balls 1-33, 1 blue ball 1-16).
// Data kept short and deterministic; replace with production feed for real analysis.
export const lotteryHistory: LotteryDraw[] = [
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
