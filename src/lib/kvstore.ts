import {
  redisConfigured,
  redisDel,
  redisGet,
  redisSAdd,
  redisSCard,
  redisSet,
  redisSMembers,
} from "./redis";

/**
 * 작은 키-값 저장소. Redis 가 있으면 Redis, 없으면(로컬 개발) 프로세스 메모리.
 * HoYoLAB 조회 캐시·하루 사용량·쿠키 상태 기록에 쓴다.
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  sadd(key: string, member: string, ttlSeconds: number): Promise<void>;
  scard(key: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
}

type Entry = { value: string; exp: number };
type SetEntry = { members: Set<string>; exp: number };

const memValues = new Map<string, Entry>();
const memSets = new Map<string, SetEntry>();

const memoryKV: KV = {
  async get(key) {
    const e = memValues.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) {
      memValues.delete(key);
      return null;
    }
    return e.value;
  },
  async set(key, value, ttlSeconds) {
    memValues.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
  },
  async del(key) {
    memValues.delete(key);
  },
  async sadd(key, member, ttlSeconds) {
    const e = memSets.get(key);
    if (!e || e.exp < Date.now()) {
      memSets.set(key, { members: new Set([member]), exp: Date.now() + ttlSeconds * 1000 });
    } else {
      e.members.add(member);
      e.exp = Date.now() + ttlSeconds * 1000;
    }
  },
  async scard(key) {
    const e = memSets.get(key);
    return e && e.exp >= Date.now() ? e.members.size : 0;
  },
  async smembers(key) {
    const e = memSets.get(key);
    return e && e.exp >= Date.now() ? [...e.members] : [];
  },
};

const redisKV: KV = {
  get: redisGet,
  set: redisSet,
  del: redisDel,
  sadd: redisSAdd,
  scard: redisSCard,
  smembers: redisSMembers,
};

export function getKV(): KV {
  return redisConfigured() ? redisKV : memoryKV;
}

export function kvBackend(): "redis" | "memory" {
  return redisConfigured() ? "redis" : "memory";
}
