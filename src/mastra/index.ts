
import { Mastra } from '@mastra/core/mastra';
import { chatRoute } from '@mastra/ai-sdk';
import { PinoLogger } from '@mastra/loggers';
import { lotteryAgent } from './agents/lottery-agent';

export const mastra = new Mastra({
  agents: { lotteryAgent },
  server: {
    apiRoutes: [
      chatRoute({
        // Cloudflare Workers / Mastra CLI 保留 /api，改用根路径前缀避免冲突
        path: '/chat',
        agent: 'lotteryAgent',
      }),
    ],
  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
