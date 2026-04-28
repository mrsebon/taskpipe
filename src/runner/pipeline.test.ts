import { runPipeline } from './pipeline';
import * as executor from './executor';

const mockRunOnce = jest.spyOn(executor, 'runOnce');

const makeStep = (overrides = {}) => ({
  name: 'test-step',
  command: 'echo hello',
  ...overrides,
});

const successRun = { exitCode: 0, stdout: 'ok', stderr: '' };
const failRun = { exitCode: 1, stdout: '', stderr: 'error' };

beforeEach(() => {
  mockRunOnce.mockReset();
});

describe('runPipeline', () => {
  it('runs all steps and returns success', async () => {
    mockRunOnce.mockResolvedValue(successRun);

    const result = await runPipeline({
      steps: [makeStep({ name: 'step1' }), makeStep({ name: 'step2' })],
    });

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].skipped).toBe(false);
  });

  it('stops pipeline on step failure', async () => {
    mockRunOnce
      .mockResolvedValueOnce(failRun)
      .mockResolvedValue(successRun);

    const result = await runPipeline({
      steps: [makeStep({ name: 'step1' }), makeStep({ name: 'step2' })],
    });

    expect(result.success).toBe(false);
    expect(result.steps).toHaveLength(1);
  });

  it('continues on error when continueOnError is true', async () => {
    mockRunOnce.mockResolvedValue(failRun);

    const result = await runPipeline({
      steps: [
        makeStep({ name: 'step1', continueOnError: true }),
        makeStep({ name: 'step2', continueOnError: true }),
      ],
    });

    expect(result.steps).toHaveLength(2);
  });

  it('skips step with on_success condition when previous step failed', async () => {
    mockRunOnce.mockResolvedValue(failRun);

    const result = await runPipeline({
      steps: [
        makeStep({ name: 'step1', continueOnError: true }),
        makeStep({ name: 'step2', condition: 'on_success' }),
      ],
    });

    const skippedStep = result.steps.find((s) => s.stepName === 'step2');
    expect(skippedStep?.skipped).toBe(true);
  });
});
