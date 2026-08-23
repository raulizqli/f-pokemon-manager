import { z } from 'zod';

export const aiInsightsResponseSchema = z.object({
  enabled: z.boolean(),
  insights: z.string().nullable(),
  recommendations: z.array(z.string()),
});

export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>;
