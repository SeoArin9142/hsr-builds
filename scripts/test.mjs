import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * tests/ 의 *.test.ts 를 node 내장 테스트 러너로 돌린다.
 * (Node 20 은 --test 에 glob 를 못 받고 .ts 도 직접 못 읽어서 여기서 파일을 모아 tsx 로 넘긴다)
 * 실행: npm test
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "tests");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.ts"))
  .sort()
  .map((f) => path.join("tests", f));

if (files.length === 0) {
  console.error("tests/ 에 *.test.ts 가 없습니다");
  process.exit(1);
}

const extra = process.argv.slice(2);
const reporter = extra.some((a) => a.startsWith("--test-reporter")) ? [] : ["--test-reporter=spec"];
const args = ["--import", "tsx", "--test", ...reporter, ...extra, ...files];
const res = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
process.exit(res.status ?? 1);
