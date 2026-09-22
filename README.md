# github-actions-common

Shared GitHub Actions workflows, composite actions, and configuration presets.

## Contents

- Reusable workflows under `.github/workflows/`
- This repository's own workflow entrypoints under `.github/workflows/repo-*.yml`
- Composite actions under `actions/`
- Shared Renovate presets under `renovate/`
- Migration notes under `docs/`

## Workflow Layout

GitHub requires both reusable workflows and repository workflows to live directly under `.github/workflows/`.
This repository uses filenames to keep the two roles separate:

- `repo-*.yml` files are entrypoints used by this repository.
- Other workflow files are reusable workflows intended to be called by other repositories.

For example, `repo-autofix.yml` runs in this repository and calls the reusable `autofix.yml` workflow.

## Pinning and Versioning

For security-sensitive workflows, callers should pin reusable workflows and composite actions to a reviewed commit SHA:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<commit-sha>
```

The stable major tag remains available as the official convenience reference:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@v1
```

`v1` is a moving major tag. It points to the latest backward-compatible v1 release. Breaking changes must use a new major tag such as `v2`.

Use `@v1` when automatic backward-compatible updates are preferred. Use a commit SHA when reviewability and reproducibility are more important than automatic updates.

## GHA Static Checks

Caller workflow example:

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
    uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<commit-sha>
    permissions:
      contents: read
      checks: write
      pull-requests: write
      actions: read
    with:
      actionlint-self-action-path: "$/.github/actions/setup-toolchain"
```

If a caller repository still has self-repository reusable workflow calls, pass one representative workflow path to the actionlint compatibility probe:

```yaml
    with:
      actionlint-self-action-path: "$/.github/actions/setup-toolchain"
      actionlint-self-reusable-workflow-path: "$/.github/workflows/add-version-to-pr-title.yml"
```

Use `actionlint-self-action-path: "$/.github/actions/setup-toolchain"` while the caller workflow still references the caller repository's local composite action.
After the caller workflow migrates to this repository's shared composite action, use the default `actionlint-self-action-path: "$/actions/setup-toolchain"`.

## Setup Toolchain

Composite action example:

```yaml
- name: Setup toolchain
  uses: watanabe-1/github-actions-common/actions/setup-toolchain@<commit-sha>
  with:
    setup-aqua: "true"
    node-version: aqua
    bun-version: aqua
    bun-cache: "true"
```

The action resolves `node-version: aqua` and `bun-version: aqua` from the caller repository's `aqua/aqua.yaml`.

## Shared PR Automation

Caller workflows keep their own triggers and permissions, then call the shared workflow from a single job.

```yaml
name: autofix.ci

on:
  pull_request:

permissions: {}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  autofix:
    uses: watanabe-1/github-actions-common/.github/workflows/autofix.yml@<commit-sha>
    permissions:
      contents: write
      pull-requests: write
```

```yaml
name: Auto Approve

on:
  pull_request:
    types:
      - opened
      - reopened
      - synchronize
      - ready_for_review

permissions: {}

jobs:
  approve:
    uses: watanabe-1/github-actions-common/.github/workflows/pr-auto-approve.yml@<commit-sha>
    permissions:
      pull-requests: write
```

Use the same thin-caller pattern for `pr-labeler.yml`, `renovate-auto-approve.yml`, and `dependabot-auto-merge.yml`.
For `pull_request_target` callers, keep the trigger and dangerous-trigger rationale comment in the caller repository.

## Renovate Preset

Shared default preset:

```json
{
  "extends": ["github>watanabe-1/github-actions-common//renovate/default.json#v1"]
}
```

Renovate presets may use `#v1` when callers intentionally want shared preset updates. Use an immutable tag or commit SHA if Renovate configuration must be fixed for audit purposes.

If this repository is private, Renovate may need credentials that can read it.

## Local Checks

```powershell
actionlint
zizmor --no-config .
ghalint run
bun run diff2prompt --lines=20 --exclude=node_modules --exclude=generated-prompt.txt
```

The tools are managed by `aqua/aqua.yaml`. `diff2prompt` is installed with Bun for review prep.
