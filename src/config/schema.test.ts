import { describe, it, expect } from 'vitest';
import { parsePipelineConfig, PipelineSchema } from './schema';

const validConfig = {
  version: '1',
  name: 'build-pipeline',
  steps: [
    {
      name: 'install',
      command: 'npm install',
    },
    {
      name: 'test',
      command: 'npm test',
      retry: { attempts: 3, delay: 500 },
      continueOnError: false,
    },
  ],
};

describe('parsePipelineConfig', () => {
  it('parses a valid pipeline config', () => {
    const pipeline = parsePipelineConfig(validConfig);
    expect(pipeline.name).toBe('build-pipeline');
    expect(pipeline.steps).toHaveLength(2);
  });

  it('applies default version when omitted', () => {
    const { version: _, ...noVersion } = validConfig;
    const pipeline = parsePipelineConfig(noVersion);
    expect(pipeline.version).toBe('1');
  });

  it('applies default continueOnError = false', () => {
    const pipeline = parsePipelineConfig(validConfig);
    expect(pipeline.steps[0].continueOnError).toBe(false);
  });

  it('applies default retry attempts and delay', () => {
    const config = {
      ...validConfig,
      steps: [{ name: 'lint', command: 'npm run lint', retry: {} }],
    };
    const pipeline = parsePipelineConfig(config);
    expect(pipeline.steps[0].retry?.attempts).toBe(1);
    expect(pipeline.steps[0].retry?.delay).toBe(1000);
  });

  it('throws on missing name', () => {
    expect(() => parsePipelineConfig({ ...validConfig, name: '' })).toThrow(
      'Invalid pipeline configuration'
    );
  });

  it('throws on empty steps array', () => {
    expect(() => parsePipelineConfig({ ...validConfig, steps: [] })).toThrow(
      'Invalid pipeline configuration'
    );
  });

  it('throws on invalid retry attempts', () => {
    const config = {
      ...validConfig,
      steps: [{ name: 'bad', command: 'echo hi', retry: { attempts: 99 } }],
    };
    expect(() => parsePipelineConfig(config)).toThrow('Invalid pipeline configuration');
  });
});
