import './preloadEnv.js';
import { createApp } from './app.js';
import { loadEnv, type Env } from './config/env.js';

const env = loadEnv();
const app = createApp(env);

function aiInsightsLabel(config: Env): string {
  const openai = Boolean(config.OPENAI_API_KEY);
  const gemini = Boolean(config.GEMINI_API_KEY);
  if (openai && gemini) return 'enabled (OpenAI, Gemini fallback)';
  if (openai) return 'enabled (OpenAI)';
  if (gemini) return 'enabled (Gemini)';
  return 'disabled';
}

app.listen(env.PORT, () => {
  console.log(`PokéDex API listening on http://localhost:${env.PORT}`);
  console.log(`AI insights: ${aiInsightsLabel(env)}`);
});
