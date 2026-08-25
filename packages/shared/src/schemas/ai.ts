import { z } from 'zod';

export const aiProviderSchema = z.enum(['openai', 'gemini']);

export const aiWarningSchema = z.object({
  code: z.literal('QUOTA_EXCEEDED'),
  provider: aiProviderSchema,
});

export const aiInsightsResponseSchema = z.object({
  enabled: z.boolean(),
  insights: z.string().nullable(),
  recommendations: z.array(z.string()),
  provider: aiProviderSchema.nullable(),
  model: z.string().nullable(),
  warnings: z.array(aiWarningSchema).optional(),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type AiWarning = z.infer<typeof aiWarningSchema>;
export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>;
