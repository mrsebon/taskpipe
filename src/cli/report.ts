import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { formatOutput, PipelineOutput, OutputFormat } from '../runner/output';

export function registerReportCommand(program: Command): void {
  program
    .command('report <file>')
    .description('Display a formatted report from a saved pipeline output JSON file')
    .option('-f, --format <format>', 'Output format: text or json', 'text')
    .action((file: string, options: { format: string }) => {
      const resolvedPath = path.resolve(file);

      if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: File not found: ${resolvedPath}`);
        process.exit(1);
      }

      let raw: string;
      try {
        raw = fs.readFileSync(resolvedPath, 'utf-8');
      } catch (err) {
        console.error(`Error: Could not read file: ${resolvedPath}`);
        process.exit(1);
      }

      let output: PipelineOutput;
      try {
        output = JSON.parse(raw) as PipelineOutput;
      } catch {
        console.error('Error: File does not contain valid JSON pipeline output.');
        process.exit(1);
      }

      const format = options.format as OutputFormat;
      if (format !== 'text' && format !== 'json') {
        console.error(`Error: Unsupported format "${format}". Use "text" or "json".`);
        process.exit(1);
      }

      const formatted = formatOutput(output, format);
      console.log(formatted);

      if (!output.success) {
        process.exit(1);
      }
    });
}
