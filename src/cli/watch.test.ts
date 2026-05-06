import { Command } from 'commander';
import { registerWatchCommand } from './watch';

describe('registerWatchCommand', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerWatchCommand(program);
  });

  it('registers the watch command', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch');
    expect(cmd).toBeDefined();
  });

  it('watch command has correct description', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch')!;
    expect(cmd.description()).toMatch(/re-run/i);
  });

  it('watch command accepts --debounce option', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch')!;
    const debounceOpt = cmd.options.find((o) => o.long === '--debounce');
    expect(debounceOpt).toBeDefined();
  });

  it('watch command accepts --watch-path option', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch')!;
    const pathOpt = cmd.options.find((o) => o.long === '--watch-path');
    expect(pathOpt).toBeDefined();
  });

  it('watch command accepts --ignore option', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch')!;
    const ignoreOpt = cmd.options.find((o) => o.long === '--ignore');
    expect(ignoreOpt).toBeDefined();
  });

  it('watch command accepts --verbose flag', () => {
    const cmd = program.commands.find((c) => c.name() === 'watch')!;
    const verboseOpt = cmd.options.find((o) => o.long === '--verbose');
    expect(verboseOpt).toBeDefined();
  });
});
