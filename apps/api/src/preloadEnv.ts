import { config as loadDotenv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(srcDir, '..');
const repoRoot = resolve(apiDir, '../..');

loadDotenv({ path: resolve(apiDir, '.env') });
loadDotenv({ path: resolve(repoRoot, '.env'), override: true });
