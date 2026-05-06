import type { Argv } from 'yargs';
import {
  listSnapshots,
  readSnapshot,
  deleteSnapshot,
} from '../runner/snapshot';

export function registerSnapshotCommand(yargs: Argv): Argv {
  return yargs.command(
    'snapshot <action> [id]',
    'Manage pipeline run snapshots',
    (y) =>
      y
        .positional('action', {
          describe: 'Action to perform: list | show | delete',
          choices: ['list', 'show', 'delete'] as const,
          demandOption: true,
        })
        .positional('id', {
          describe: 'Snapshot ID (required for show and delete)',
          type: 'string',
        }),
    (argv) => {
      const action = argv.action as 'list' | 'show' | 'delete';
      const id = argv.id as string | undefined;

      if (action === 'list') {
        const ids = listSnapshots();
        if (ids.length === 0) {
          console.log('No snapshots found.');
        } else {
          console.log(`Found ${ids.length} snapshot(s):`);
          ids.forEach((s) => console.log(`  ${s}`));
        }
        return;
      }

      if (!id) {
        console.error(`Error: snapshot id is required for '${action}'`);
        process.exit(1);
      }

      if (action === 'show') {
        const snapshot = readSnapshot(id);
        if (!snapshot) {
          console.error(`Snapshot '${id}' not found.`);
          process.exit(1);
        }
        console.log(JSON.stringify(snapshot, null, 2));
        return;
      }

      if (action === 'delete') {
        const removed = deleteSnapshot(id);
        if (!removed) {
          console.error(`Snapshot '${id}' not found.`);
          process.exit(1);
        }
        console.log(`Snapshot '${id}' deleted.`);
      }
    }
  );
}
