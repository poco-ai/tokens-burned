// @vitest-environment jsdom

import type * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyManager } from "./key-manager";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    ({
      pageTitle: "CLI API Keys",
      dialogTitle: "API Keys",
      empty: "No API keys available.",
      createKey: "Create key",
      newKey: "New key",
      copyShownOnce: "Copy it now.",
      copyKey: "Copy key",
      copyFailed: "Copy failed.",
      requestFailed: "Request failed.",
      updateFailed: "Unable to update the key.",
      deleteFailed: "Unable to delete the key.",
      createFailed: "Unable to create the key.",
      renameFailed: "Unable to rename the key.",
      "status.active": "active",
      "status.disabled": "disabled",
      "table.name": "Name",
      "table.prefix": "Prefix",
      "table.status": "Status",
      "table.lastUsed": "Last Used",
      "table.created": "Created",
      "table.actions": "Actions",
      "table.never": "Never",
      "actions.rename": "Rename key",
      "actions.disable": "Disable key",
      "actions.enable": "Enable key",
      "actions.delete": "Delete key",
      "dialog.createTitle": "Create CLI key",
      "dialog.renameTitle": "Rename CLI key",
      "dialog.createDescription": "Description",
      "dialog.renameDescription": "Description",
      "dialog.name": "Name",
      "dialog.placeholder": "My MacBook / Work",
      "dialog.saving": "Saving...",
      "dialog.createKey": "Create key",
      "dialog.saveChanges": "Save changes",
      "deleteDialog.title": "Delete key?",
      "deleteDialog.description": `This can't be undone, and ${values?.name ?? ""} will stop working immediately.`,
      "deleteDialog.cancel": "Cancel",
      "deleteDialog.confirm": "Delete key",
      "deleteDialog.deleting": "Deleting...",
    })[key] ?? key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/settings/cli-keys",
  useRouter: () => ({
    replace: mocks.replace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button"> & { children?: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({
    children,
    ...props
  }: React.ComponentProps<"td"> & { children?: React.ReactNode }) => (
    <td {...props}>{children}</td>
  ),
  TableHead: ({
    children,
    ...props
  }: React.ComponentProps<"th"> & { children?: React.ReactNode }) => (
    <th {...props}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({
    children,
    ...props
  }: React.ComponentProps<"tr"> & { children?: React.ReactNode }) => (
    <tr {...props}>{children}</tr>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => (open ? <div data-slot="dialog">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./key-dialog", () => ({
  KeyDialog: () => null,
}));

describe("KeyManager", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
        fetch: typeof fetch;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.fetch = fetchMock;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    delete (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT;
    container.remove();
  });

  it("opens a confirmation dialog before deleting a key", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await act(async () => {
      root.render(
        <KeyManager
          initialKeys={[
            {
              id: "key_123",
              name: "test",
              prefix: "ta_5de06989",
              status: "active",
              lastUsedAt: "2026-03-26T09:05:35.000Z",
              createdAt: "2026-03-26T08:44:25.000Z",
            },
          ]}
        />,
      );
    });

    const deleteTrigger = Array.from(container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Delete key",
    );

    expect(deleteTrigger).not.toBeUndefined();

    await act(async () => {
      deleteTrigger?.click();
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Delete key?");
    expect(container.textContent).toContain(
      "This can't be undone, and test will stop working immediately.",
    );

    const dialog = container.querySelector('[data-slot="dialog"]');
    const confirmButton = Array.from(
      dialog?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent === "Delete key");

    expect(confirmButton).not.toBeUndefined();

    await act(async () => {
      confirmButton?.click();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/usage/keys/key_123",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      }),
    );
  });
});
