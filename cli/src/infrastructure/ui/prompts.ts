import {
  type Choice,
  confirm,
  input,
  password,
  select,
} from "@inquirer/prompts";

export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function promptConfirm(options: {
  message: string;
  defaultValue?: boolean;
}): Promise<boolean> {
  return confirm({
    message: options.message,
    default: options.defaultValue,
  });
}

export async function promptText(options: {
  message: string;
  defaultValue?: string;
  validate?: (value: string) => boolean | string;
}): Promise<string> {
  return input({
    message: options.message,
    default: options.defaultValue,
    validate: options.validate,
  });
}

export async function promptPassword(options: {
  message: string;
  mask?: string;
  validate?: (value: string) => boolean | string;
}): Promise<string> {
  return password({
    message: options.message,
    mask: options.mask ?? "*",
    validate: options.validate,
  });
}

export async function promptSelect<T>(options: {
  message: string;
  choices: ReadonlyArray<Choice<T>>;
}): Promise<T> {
  return select({
    message: options.message,
    choices: [...options.choices],
    pageSize: Math.min(Math.max(options.choices.length, 6), 10),
  });
}
