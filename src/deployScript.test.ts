import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('deployment scripts', () => {
  it('uses the stable temp-directory GitHub Pages deploy script instead of git subtree', () => {
    expect(packageJson.scripts['deploy:pages']).toBe('bash scripts/deploy-pages.sh');
  });
});
