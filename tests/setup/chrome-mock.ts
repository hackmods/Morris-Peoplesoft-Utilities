import { beforeEach, vi } from "vitest";
import { coordinateSettingsWrite, type SettingsWrite } from "../../src/storage/coordinator";

type Store = Record<string, unknown>;

const memory: Store = {};

export function resetChromeStorage(seed: Store = {}): void {
  for (const key of Object.keys(memory)) delete memory[key];
  Object.assign(memory, seed);
}

export function getChromeStorageSnapshot(): Store {
  return { ...memory };
}

const local = {
  get: vi.fn(async (keys: string | string[] | null | Record<string, unknown>) => {
    if (keys === null || keys === undefined) return { ...memory };
    if (typeof keys === "string") return { [keys]: memory[keys] };
    if (Array.isArray(keys)) {
      const out: Store = {};
      for (const k of keys) out[k] = memory[k];
      return out;
    }
    const out: Store = { ...keys };
    for (const k of Object.keys(keys)) {
      if (k in memory) out[k] = memory[k];
    }
    return out;
  }),
  set: vi.fn(async (items: Store) => {
    Object.assign(memory, items);
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) delete memory[k];
  }),
  clear: vi.fn(async () => {
    for (const key of Object.keys(memory)) delete memory[key];
  }),
};

vi.stubGlobal("chrome", {
  storage: { local, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://mpu-test/${path}`),
    id: "mpu-test",
    getManifest: vi.fn(() => ({ version: "1.0.29" })),
    sendMessage: vi.fn(async (message: SettingsWrite) => message?.type === "mpu-write-settings" ? coordinateSettingsWrite(message) : { ok: true }),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    openOptionsPage: vi.fn(),
  },
  tabs: {
    query: vi.fn(async () => []),
    sendMessage: vi.fn(async () => undefined),
  },
});

beforeEach(() => {
  resetChromeStorage();
  local.get.mockClear();
  local.set.mockClear();
});
