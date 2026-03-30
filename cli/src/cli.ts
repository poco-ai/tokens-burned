import { Command, Option } from "commander";
import { handleConfig } from "./commands/config";
import { runDaemon } from "./commands/daemon";
import { runInit } from "./commands/init";
import { runStatus } from "./commands/status";
import { runSyncCommand } from "./commands/sync";
import { runUninstall } from "./commands/uninstall";
import { getCliVersion } from "./infrastructure/runtime/cli-version";

const CLI_VERSION = getCliVersion();

export function createCli(): Command {
  const program = new Command();

  program
    .name("tokenarena")
    .description("Track token burn across AI coding tools")
    .version(CLI_VERSION)
    .showHelpAfterError()
    .showSuggestionAfterError();

  // Default action: show help or error for unknown commands
  program.action(() => {
    const userArgs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
    if (userArgs.length > 0) {
      program.error(`unknown command '${userArgs[0]}'`);
    }
    program.help();
  });

  // init command
  program
    .command("init")
    .description("Initialize configuration with API key")
    .option("--api-url <url>", "Custom API server URL")
    .action(async (opts) => {
      await runInit(opts);
    });

  // sync command
  program
    .command("sync")
    .description("Manually sync usage data to server")
    .addOption(new Option("--quiet").hideHelp())
    .action(async (opts) => {
      await runSyncCommand(opts);
    });

  // daemon command
  program
    .command("daemon")
    .description("Run continuous sync (every 5 minutes by default)")
    .option("--interval <ms>", "Sync interval in milliseconds", parseInt)
    .action(async (opts) => {
      await runDaemon(opts);
    });

  // status command
  program
    .command("status")
    .description("Show configuration and detected tools")
    .action(async () => {
      await runStatus();
    });

  // config command (with subcommands)
  program
    .command("config")
    .description("Manage configuration")
    .argument("<subcommand>", "get|set|show")
    .argument("[key]", "Config key")
    .argument("[value]", "Config value")
    .allowUnknownOption(true)
    .action((_subcommand, _key, _value, cmd) => {
      // Get all args after "config"
      const args = cmd.args.slice(1);
      handleConfig(args);
    });

  // uninstall command
  program
    .command("uninstall")
    .description("Remove all local configuration and data")
    .action(async () => {
      await runUninstall();
    });

  return program;
}
