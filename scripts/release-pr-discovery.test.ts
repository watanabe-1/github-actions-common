import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workflow = Bun.YAML.parse(
  readFileSync(new URL("../.github/workflows/repo-release-please.yml", import.meta.url), "utf8"),
) as any;
const script = workflow.jobs["release-please"].steps.find(
  (step: any) => step.id === "release-pr",
).run;
const bash = process.platform === "win32"
  ? join(process.env.ProgramFiles ?? "C:/Program Files", "Git/bin/bash.exe")
  : "bash";

function discover(candidates: string, created = "", status = "0") {
  const directory = mkdtempSync(join(tmpdir(), "release-pr-"));
  const output = join(directory, "output");
  try {
    const result = Bun.spawnSync([bash, "-c", `
      gh() {
        if [[ "$1" != api ]]; then return 99; fi
        printf '%s' "$MOCK_CANDIDATES"
        return "$MOCK_STATUS"
      }
      ${script}
    `], {
      env: {
        ...process.env,
        GH_REPO: "owner/repo",
        APP_BOT: "release-app[bot]",
        PRS_CREATED: created,
        MOCK_CANDIDATES: candidates,
        MOCK_STATUS: status,
        GITHUB_OUTPUT: output,
      },
    });
    return {
      code: result.exitCode,
      log: result.stdout.toString(),
      output: result.exitCode === 0 ? readFileSync(output, "utf8") : "",
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("a new PR reaches approval without querying search", () => {
  expect(discover("29\tabc123\trelease-app[bot]\ttrue", "true")).toMatchObject({
    code: 0, output: "number=29\nsha=abc123\n",
  });
});

test("an unchanged PR is rediscovered on retry", () => {
  expect(discover("29\tabc123\trelease-app[bot]\ttrue").output)
    .toBe("number=29\nsha=abc123\n");
});

test("other authors and PRs without the pending label are excluded", () => {
  expect(discover("28\tbad\tother[bot]\ttrue\n29\tbad\trelease-app[bot]\tfalse").output)
    .toBe("number=\nsha=\n");
});

test("no unreleased commits can leave no PR", () => {
  expect(discover("")).toMatchObject({ code: 0, output: "number=\nsha=\n" });
});

test("a missing newly created PR fails visibly", () => {
  const result = discover("", "true");
  expect(result.code).not.toBe(0);
  expect(result.log).toContain("::error::Release Please created a PR");
});

test("API errors fail instead of skipping approval", () => {
  expect(discover("", "true", "1").code).not.toBe(0);
});

test("ambiguous candidates fail instead of approving one arbitrarily", () => {
  expect(discover("29\ta\trelease-app[bot]\ttrue\n30\tb\trelease-app[bot]\ttrue").code)
    .not.toBe(0);
});
