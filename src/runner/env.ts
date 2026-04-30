import * as fs from 'fs';
import * as path from 'path';

export interface EnvContext {
  vars: Record<string, string>;
}

/**
 * Merges process.env with pipeline-defined variables.
 * Pipeline variables take precedence over process.env.
 */
export function buildEnvContext(
  pipelineVars: Record<string, string> = {},
  inheritEnv = true
): EnvContext {
  const base: Record<string, string> = inheritEnv
    ? (Object.fromEntries(
        Object.entries(process.env).filter(([, v]) => v !== undefined)
      ) as Record<string, string>)
    : {};

  return {
    vars: { ...base, ...pipelineVars },
  };
}

/**
 * Loads a .env file (KEY=VALUE format) and returns parsed key-value pairs.
 * Lines starting with '#' and empty lines are ignored.
 */
export function loadDotEnvFile(filePath: string): Record<string, string> {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return {};
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Interpolates ${VAR} placeholders in a string using the provided env context.
 */
export function interpolateEnv(template: string, ctx: EnvContext): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    return ctx.vars[key] ?? '';
  });
}
