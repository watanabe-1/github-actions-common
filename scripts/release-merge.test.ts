import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workflow = Bun.YAML.parse(
  readFileSync(new URL("../.github/workflows/repo-release-merge.yml", import.meta.url), "utf8"),
) as any;
const script = workflow.jobs.merge.steps.find((step: any) => step.name === "Merge ready release PR").run;
const bash = process.platform === "win32"
  ? join(process.env.ProgramFiles ?? "C:/Program Files", "Git/bin/bash.exe")
  : "bash";
const ready = {
  state: "OPEN", headRefOid: "abc123", reviewDecision: "APPROVED", mergeStateStatus: "CLEAN",
  statusCheckRollup: [
    { name: "gha-static-check / GHA static checks status check", status: "COMPLETED", conclusion: "SUCCESS" },
    { name: "autofix / Autofix", status: "COMPLETED", conclusion: "SUCCESS" },
  ],
};

function run(pr: unknown, author = "release-app[bot]", mergeStatus = "0") {
  const directory = mkdtempSync(join(tmpdir(), "release-merge-"));
  const marker = join(directory, "merged");
  try {
    const result = Bun.spawnSync([bash, "-c", `
      gh() {
        case "$1 $2" in
          "api --method") printf '%s' "$MOCK_CANDIDATES" ;;
          "pr view") printf '%s' "$MOCK_PR" ;;
          "pr merge") printf '%s' "$*" > "$MOCK_MARKER"; return "$MOCK_MERGE_STATUS" ;;
          *) return 99 ;;
        esac
      }
      sleep() { :; }
      ${script}
    `], { env: {
      ...process.env, GH_REPO: "owner/repo", APP_BOT: "release-app[bot]",
      MOCK_CANDIDATES: JSON.stringify([{ number: 29, user: { login: author }, labels: [{ name: "autorelease: pending" }] }]),
      MOCK_PR: JSON.stringify(pr), MOCK_MARKER: marker, MOCK_MERGE_STATUS: mergeStatus,
    } });
    let merged = "";
    try { merged = readFileSync(marker, "utf8"); } catch { /* no merge attempted */ }
    return { code: result.exitCode, merged, log: result.stdout.toString(), error: result.stderr.toString() };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("merges an approved PR only after both checks succeed, with its current SHA", () => {
  expect(run(ready)).toMatchObject({ code: 0, merged: "pr merge 29 --squash --match-head-commit abc123" });
});

test("does not merge pending or failed checks, missing approval, or an unmergeable PR", () => {
  for (const pr of [
    { ...ready, statusCheckRollup: ready.statusCheckRollup.slice(0, 1) },
    { ...ready, statusCheckRollup: [ready.statusCheckRollup[0], { ...ready.statusCheckRollup[1], conclusion: "FAILURE" }] },
    { ...ready, reviewDecision: "REVIEW_REQUIRED" },
    { ...ready, mergeStateStatus: "BLOCKED" },
  ]) expect(run(pr)).toMatchObject({ code: 0, merged: "" });
});

test("does not merge a PR authored by another account", () => {
  expect(run(ready, "other[bot]")).toMatchObject({ code: 0, merged: "" });
});

test("reports a merge rejection after bounded retries", () => {
  expect(run(ready, "release-app[bot]", "1")).toMatchObject({ code: 1 });
});
