import { CONFIG } from "./config.js";
import { normalizeState } from "./state.js";

export function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.save.key);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch (error) {
    console.error("Save load failed", error);
    return null;
  }
}

export function saveGame(state) {
  state.updatedAt = Date.now();
  localStorage.setItem(CONFIG.save.key, JSON.stringify(state));
}

export function clearSave() {
  localStorage.removeItem(CONFIG.save.key);
}

export function exportSave(state) {
  return JSON.stringify(state, null, 2);
}

export function importSave(text) {
  const parsed = JSON.parse(text);
  if (parsed.version !== CONFIG.save.version) {
    throw new Error(`지원하지 않는 세이브 버전입니다. 현재 버전: ${CONFIG.save.version}`);
  }
  return normalizeState(parsed);
}
