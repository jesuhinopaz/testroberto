import { DEFAULT_APP_STATE, STORAGE_KEYS } from './constants.js';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function loadSeedData() {
  const savedBank = readJson(STORAGE_KEYS.QUESTION_BANK, null);
  if (savedBank?.questions?.length) return savedBank;

  const response = await fetch('./data/seed.json', { cache: 'no-store' });
  const seed = await response.json();
  writeJson(STORAGE_KEYS.QUESTION_BANK, seed);
  return seed;
}

export function saveQuestionBank(bank) {
  writeJson(STORAGE_KEYS.QUESTION_BANK, bank);
}

export function loadAppState() {
  const saved = readJson(STORAGE_KEYS.APP_STATE, null);
  if (!saved) return structuredClone(DEFAULT_APP_STATE);
  return deepMerge(structuredClone(DEFAULT_APP_STATE), saved);
}

export function saveAppState(state) {
  writeJson(STORAGE_KEYS.APP_STATE, state);
}

export function exportBackupPayload(state, bank) {
  return {
    exportedAt: new Date().toISOString(),
    state,
    bank
  };
}

export function importBackupPayload(payload) {
  if (!payload?.state || !payload?.bank) {
    throw new Error('Invalid backup payload');
  }
  writeJson(STORAGE_KEYS.APP_STATE, payload.state);
  writeJson(STORAGE_KEYS.QUESTION_BANK, payload.bank);
  return true;
}

export function resetProgressState() {
  const clean = structuredClone(DEFAULT_APP_STATE);
  writeJson(STORAGE_KEYS.APP_STATE, clean);
  return clean;
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) {
    return patch ?? base;
  }
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return patch ?? base;
  }

  const result = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return result;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}
