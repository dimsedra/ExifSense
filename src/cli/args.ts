import { parseArgs } from 'node:util';

export class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliArgumentError';
  }
}

export type SupportedFormat = 'plain' | 'markdown';
export type SupportedLocale = 'en' | 'id' | 'ar';

export interface CliOptions {
  locale: SupportedLocale;
  format: SupportedFormat;
  out?: string;
}

export type CliParsedCommand =
  | { command: 'single'; targetPath: string; options: CliOptions }
  | { command: 'batch'; targetPaths: string[]; options: CliOptions }
  | { command: 'scenario'; scenarioName: string; options: CliOptions }
  | { command: 'extract'; sourcePath: string; outputPath?: string }
  | { command: 'help' }
  | { command: 'version' };

export function parseCliArgs(rawArgs: string[]): CliParsedCommand {
  if (!rawArgs || rawArgs.length === 0) {
    return { command: 'help' };
  }

  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: rawArgs,
      options: {
        locale: { type: 'string', default: 'en' },
        format: { type: 'string', default: 'plain' },
        out: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliArgumentError(message);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    return { command: 'help' };
  }

  if (values.version) {
    return { command: 'version' };
  }

  if (positionals.length === 0) {
    return { command: 'help' };
  }

  const [command, ...rest] = positionals;

  if (command === 'help' || command === '--help' || command === '-h') {
    return { command: 'help' };
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    return { command: 'version' };
  }

  const locale = values.locale as string;
  if (locale !== 'en' && locale !== 'id' && locale !== 'ar') {
    throw new CliArgumentError(`Unsupported locale '${locale}'. Supported: en, id, ar.`);
  }

  const format = values.format as string;
  if (format !== 'plain' && format !== 'markdown') {
    throw new CliArgumentError(`Unsupported format '${format}'. Supported: plain, markdown.`);
  }

  const options: CliOptions = {
    locale,
    format,
    out: typeof values.out === 'string' ? values.out : undefined,
  };

  if (command === 'single') {
    if (rest.length === 0 || !rest[0]) {
      throw new CliArgumentError("Command 'single' requires a target path (image or JSON file).");
    }
    return { command: 'single', targetPath: rest[0], options };
  }

  if (command === 'batch') {
    if (rest.length === 0) {
      throw new CliArgumentError("Command 'batch' requires at least one target path.");
    }
    return { command: 'batch', targetPaths: rest, options };
  }

  if (command === 'scenario') {
    if (rest.length === 0 || !rest[0]) {
      throw new CliArgumentError("Command 'scenario' requires a scenario name (e.g. 'missing-gps').");
    }
    return { command: 'scenario', scenarioName: rest[0], options };
  }

  if (command === 'extract') {
    if (rest.length === 0 || !rest[0]) {
      throw new CliArgumentError("Command 'extract' requires a source image path.");
    }
    return { command: 'extract', sourcePath: rest[0], outputPath: rest[1] };
  }

  throw new CliArgumentError(`Unknown command '${command}'. Use '--help' to see available commands.`);
}
