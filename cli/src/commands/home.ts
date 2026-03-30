import type { Command } from "commander";
import { loadConfig } from "../infrastructure/config/manager";
import {
  formatBullet,
  formatHeader,
  formatKeyValue,
  formatStatusBadge,
  maskSecret,
} from "../infrastructure/ui/format";
import { promptConfirm, promptSelect } from "../infrastructure/ui/prompts";
import { logger } from "../utils/logger";
import { handleConfig } from "./config";
import { runDaemon } from "./daemon";
import { runInit } from "./init";
import { runStatus } from "./status";
import { runSyncCommand } from "./sync";
import { runUninstall } from "./uninstall";

type HomeAction =
  | "init"
  | "status"
  | "sync"
  | "config"
  | "daemon"
  | "uninstall"
  | "help"
  | "exit";

function logHomeSummary(): void {
  const config = loadConfig();
  const configured = Boolean(config?.apiKey);

  logger.info(
    formatHeader(
      "TokenArena CLI",
      "通过更友好的交互完成初始化、同步、配置与清理。",
    ),
  );
  logger.info(
    formatKeyValue(
      "配置状态",
      configured
        ? formatStatusBadge("已配置", "success")
        : formatStatusBadge("未配置", "warning"),
    ),
  );

  if (configured && config) {
    logger.info(formatKeyValue("API Key", maskSecret(config.apiKey)));
    logger.info(
      formatKeyValue("API 地址", config.apiUrl || "https://token.poco-ai.com"),
    );
  } else {
    logger.info(formatBullet("建议先运行初始化流程绑定 API Key。", "warning"));
  }
}

async function pickHomeAction(): Promise<HomeAction> {
  return promptSelect<HomeAction>({
    message: "请选择要执行的操作",
    choices: [
      {
        name: "初始化 TokenArena",
        value: "init",
        description: "配置 API Key、检测工具并执行首次同步",
      },
      {
        name: "查看当前状态",
        value: "status",
        description: "查看配置、工具检测结果与最近同步状态",
      },
      {
        name: "立即同步",
        value: "sync",
        description: "手动上传本地最新 token 使用数据",
      },
      {
        name: "管理配置",
        value: "config",
        description: "查看或修改 API Key、API 地址、同步间隔等配置",
      },
      {
        name: "启动守护同步",
        value: "daemon",
        description: "持续后台同步，适合长期运行",
      },
      {
        name: "卸载本地配置",
        value: "uninstall",
        description: "删除本地配置、状态与运行时文件",
      },
      {
        name: "查看帮助",
        value: "help",
        description: "展示完整命令帮助",
      },
      {
        name: "退出",
        value: "exit",
        description: "结束当前交互",
      },
    ],
  });
}

export async function runHome(program: Command): Promise<void> {
  while (true) {
    logHomeSummary();

    const action = await pickHomeAction();
    logger.info("");

    switch (action) {
      case "init":
        await runInit();
        break;
      case "status":
        await runStatus();
        break;
      case "sync":
        await runSyncCommand();
        break;
      case "config":
        await handleConfig([]);
        break;
      case "daemon":
        await runDaemon();
        return;
      case "uninstall":
        await runUninstall();
        break;
      case "help":
        program.outputHelp();
        break;
      case "exit":
        logger.info(formatBullet("已退出交互式主页。", "neutral"));
        return;
    }

    const continueAnswer = await promptConfirm({
      message: "是否继续执行其他操作？",
      defaultValue: true,
    });

    if (!continueAnswer) {
      logger.info(formatBullet("下次可直接运行 tokenarena 继续。", "neutral"));
      return;
    }
  }
}
