// src/storage.tsx
import type { OwnedMap } from "./types";

const KEY = "gt7-car-checklist:owned:v1";

export function loadOwned(): OwnedMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    return obj as OwnedMap;
  } catch {
    return {};
  }
}

export function saveOwned(map: OwnedMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignora
  }
}

export function toggleOwned(prev: OwnedMap, carId: string): OwnedMap {
  const next = { ...prev };
  next[carId] = !Boolean(next[carId]);
  return next;
}

export function setAllOwned(carsIds: string[], value: boolean): OwnedMap {
  const next: OwnedMap = {};
  for (const id of carsIds) next[id] = value;
  return next;
}
