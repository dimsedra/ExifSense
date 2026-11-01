import { runCli } from './runner';

const result = await runCli(process.argv.slice(2));
process.exit(result.exitCode);
