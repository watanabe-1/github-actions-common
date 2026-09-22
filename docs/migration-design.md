# GitHub Actions commonization design

## Scope

Compared repositories:

- `C:\projects\ts\rpc4next`
- `C:\projects\ts\diff2prompt`

Target common repository:

- local: `C:\projects\actions\github-actions-common`
- remote placeholder: `yourname/github-actions-common`

## Classification

Reusable workflow candidates:

- `gha-static-check.yml`: nearly identical. Differences are the actionlint self-repository probe and the pinned `zizmorcore/zizmor-action` SHA. Implemented here as `.github/workflows/gha-static-check.yml`.
- `autofix.yml`: identical in both repositories. Good next candidate, but it writes to PR branches, so migrate after read-only checks are proven.
- `pr-auto-approve.yml` / `.yaml`: identical except filename extension. Good candidate after `gha-static-check`.
- `pr-labeler.yml`: same action and trigger, but `rpc4next` has stricter top-level `permissions` and concurrency/name metadata. Can be commonized with no or minimal inputs.
- `dependabot-auto-merge.yml`: identical and security-conscious, but uses `pull_request_target` and write permissions. Migrate later with extra care.
- `renovate.yml`: identical except renovate action SHA. Commonizable, but it needs app secrets and an environment, so migrate after low-risk workflows.
- `bun-test.yml` / `node-test.yml`: structurally similar but differ by package layout, Next.js matrix, Windows matrix, coverage conditions, smoke tests, and extra rpc4next client bundle test. Commonize later only after inputs are stable.

Composite action candidates:

- `setup-toolchain`: shared shape in both repos. Implemented here as `actions/setup-toolchain/action.yml`, using the newer action pins from `diff2prompt` and the Bun cache rationale from `rpc4next`.
- Small release helpers could be extracted later, but release flows should stay repo-local for now.

Shared config candidates:

- `.github/renovate.json`: identical. Implemented here as `renovate/default.json`.
- `.github/actionlint.yaml`: mostly identical, but `diff2prompt` has one extra ignore for self-repository reusable workflow syntax. Keep repo-local until actionlint supports the new syntax, or ship a documented preset copy.
- `.github/dependabot.yml`: repo-specific package directories. Keep repo-local.
- `.github/labeler.yml`, `.github/release.yml`, release-please config: keep repo-local.

Repo-local workflows for now:

- `rpc4next` `publish.yml`, `e2e-test.yml`
- `diff2prompt` `create-release-pr.yml`, `release-on-merge.yml`, `add-version-to-pr-title.yml`

## First migration

Start with `gha-static-check` and `setup-toolchain`.

Reasons:

- The workflow is read/check oriented.
- Existing security checks remain intact: pinned actions, `permissions: {}`, job-level least privilege, `persist-credentials: false`, zizmor, actionlint, ghalint.
- Differences are naturally modeled as inputs.

Caller workflow shape:

```yaml
name: GHA static checks

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions: {}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  gha-static-check:
    uses: yourname/github-actions-common/.github/workflows/gha-static-check.yml@v1
    permissions:
      contents: read
      checks: write
      pull-requests: write
      actions: read
```

`diff2prompt` needs one extra input while it still contains a self-repository reusable workflow:

```yaml
    with:
      actionlint-self-action-path: "$/.github/actions/setup-toolchain"
      actionlint-self-reusable-workflow-path: "$/.github/workflows/add-version-to-pr-title.yml"
```

`rpc4next` can use:

```yaml
    with:
      actionlint-self-action-path: "$/.github/actions/setup-toolchain"
```

After `setup-toolchain` is migrated in caller workflows, change `actionlint-self-action-path` to `$/actions/setup-toolchain` if the probe should cover the common repository action path instead of the old local one.

## Migration order

1. Add this common repo with `setup-toolchain`, `gha-static-check`, and `renovate/default.json`.
2. Tag the common repo as `v1`.
3. Replace each repo's `gha-static-check.yml` with a thin caller workflow.
4. Keep each repo's local `.github/actions/setup-toolchain` until all local workflows that reference it have moved.
5. Migrate `autofix.yml` next, because it is identical but write-enabled.
6. Migrate `pr-auto-approve` and `pr-labeler`.
7. Migrate `renovate.yml` and `dependabot-auto-merge.yml` after checking app secrets, environments, and branch protection.
8. Consider common `bun-test` / `node-test` only after the common workflow inputs are written down from real caller examples.
9. Leave release workflows repo-local unless a repeated helper becomes obvious.

## Remaining risks and manual work

- `$/...` self-repository syntax is newer than actionlint v1.7.12. The existing compatibility probe and `.github/actionlint.yaml` ignores should remain until actionlint supports it.
- Reusable workflow job permissions are bounded by caller permissions. The caller must explicitly grant `contents: read`, `checks: write`, `pull-requests: write`, and `actions: read`.
- The common workflow assumes each caller repo keeps `aqua/aqua.yaml` and `aqua/aqua-policy.yaml`.
- If the common repo is private, callers need access to reusable workflows and actions from that private repo.
- Renovate preset consumption from a private repo may need token/config changes.
