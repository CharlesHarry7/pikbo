import { isAbsolute, resolve, sep } from "node:path";

export const T6_OWNED_STORAGE_ADAPTER_IMPLEMENTED = true;

export function t6OwnedStorageRoot() {
  const configured = (process.env.PIKBO_T6_OWNED_STORAGE_DIR || "").trim();
  if (!configured || !isAbsolute(configured)) return null;
  const root = resolve(configured);
  if (root === resolve(sep) || root.length < 8) return null;
  return root;
}

export function t6OwnedStorageConfigured() {
  return t6OwnedStorageRoot() !== null;
}
