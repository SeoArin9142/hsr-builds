import type { CardModel } from "./cards";
import { getKV } from "./kvstore";

/**
 * "지난주 대비 무엇이 달라졌나".
 *
 * 조회할 때마다 현재 상태를 아주 작게 줄여 기준점(baseline) 하나만 저장해 두고,
 * 지금 상태와 견줘 달라진 점을 보여 준다. 기준점이 7일보다 오래되면 지금 상태로 갈아 끼운다
 * (그래서 갈아 끼운 직후에는 잠시 "달라진 점 없음" 이 된다).
 * 기록은 UID 당 하나뿐이라 저장 공간이 늘어나지 않는다.
 */

const KEY = (uid: string) => `hist:base:${uid}`;
const TTL = 120 * 86400;
const ROTATE_MS = 7 * 86400 * 1000;
const MEMO_MS = 5 * 60 * 1000; // 같은 UID 를 연달아 볼 때 Redis 를 다시 읽지 않는다

interface SnapChar {
  lv: number;
  e: number; // 성혼
  lc?: string; // 광추 이름
  lr?: number; // 중첩
  b?: number; // 빌드 점수
}

export interface Snapshot {
  at: number;
  c: Record<string, SnapChar>;
}

export interface Change {
  id: string;
  name: string;
  icon: string;
  isNew: boolean;
  level?: [number, number];
  eidolon?: [number, number];
  lightCone?: string; // 바뀐 광추 이름
  lcRank?: [number, number];
  score?: [number, number];
}

export interface History {
  baseAt: number | null; // 기준점 시각 (없으면 이번이 첫 기록)
  changes: Change[];
}

export function snapshotOf(cards: CardModel[]): Snapshot {
  const c: Record<string, SnapChar> = {};
  for (const card of cards) {
    c[card.id] = {
      lv: card.level,
      e: card.eidolon,
      ...(card.lightCone ? { lc: card.lightCone.name, lr: card.lightCone.rank } : {}),
      ...(card.score !== null ? { b: card.score } : {}),
    };
  }
  return { at: Date.now(), c };
}

/** 빌드 점수는 유물 강화·교체로 조금씩 흔들리므로 3점 넘게 움직였을 때만 알린다 */
const SCORE_NOISE = 3;

export function changesSince(base: Snapshot, cards: CardModel[]): Change[] {
  const out: Change[] = [];
  for (const card of cards) {
    const was = base.c[card.id];
    const item: Change = { id: card.id, name: card.name, icon: card.icon, isNew: !was };
    if (!was) {
      out.push(item);
      continue;
    }
    if (card.level !== was.lv) item.level = [was.lv, card.level];
    if (card.eidolon !== was.e) item.eidolon = [was.e, card.eidolon];
    if (card.lightCone && card.lightCone.name !== was.lc) item.lightCone = card.lightCone.name;
    else if (card.lightCone && was.lr !== undefined && card.lightCone.rank !== was.lr) {
      item.lcRank = [was.lr, card.lightCone.rank];
    }
    if (
      card.score !== null &&
      was.b !== undefined &&
      Math.abs(card.score - was.b) >= SCORE_NOISE
    ) {
      item.score = [was.b, card.score];
    }
    if (item.level || item.eidolon || item.lightCone || item.lcRank || item.score) out.push(item);
  }
  // 새 캐릭터 → 성혼 → 레벨 → 점수 순으로 보여 준다
  return out.sort(
    (a, b) =>
      Number(b.isNew) - Number(a.isNew) ||
      Number(!!b.eidolon) - Number(!!a.eidolon) ||
      Number(!!b.level) - Number(!!a.level) ||
      a.name.localeCompare(b.name),
  );
}

const memo = new Map<string, { at: number; snap: Snapshot | null }>();

async function readBase(uid: string): Promise<Snapshot | null> {
  const m = memo.get(uid);
  if (m && Date.now() - m.at < MEMO_MS) return m.snap;
  let snap: Snapshot | null = null;
  try {
    const raw = await getKV().get(KEY(uid));
    if (raw) snap = JSON.parse(raw) as Snapshot;
  } catch {
    snap = null; // 저장소가 죽어도 화면은 뜨게 한다
  }
  memo.set(uid, { at: Date.now(), snap });
  if (memo.size > 500) memo.clear();
  return snap;
}

async function writeBase(uid: string, snap: Snapshot): Promise<void> {
  memo.set(uid, { at: Date.now(), snap });
  try {
    await getKV().set(KEY(uid), JSON.stringify(snap), TTL);
  } catch {
    // 못 써도 그냥 넘어간다
  }
}

/**
 * 기준점과 견준 변화. full 이 false 면(전적을 못 받아 전시 8명뿐인 경우)
 * 기록을 건드리지 않는다 — 안 그러면 다음에 전적이 붙었을 때 60명이 "새로 추가" 로 뜬다.
 */
export async function getHistory(uid: string, cards: CardModel[], full: boolean): Promise<History> {
  if (!full || cards.length === 0) return { baseAt: null, changes: [] };
  const base = await readBase(uid);
  if (!base) {
    await writeBase(uid, snapshotOf(cards));
    return { baseAt: null, changes: [] };
  }
  const changes = changesSince(base, cards);
  if (Date.now() - base.at > ROTATE_MS) {
    await writeBase(uid, snapshotOf(cards)); // 기준점을 지금으로 옮긴다
  }
  return { baseAt: base.at, changes };
}
