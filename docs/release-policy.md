# Release policy

## Caller pinning policy

The security-first recommendation is to pin reusable workflows and composite actions by commit SHA:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<commit-sha>
```

This makes caller updates explicit and reviewable.

To let Dependabot update caller repositories, publish immutable version tags and have callers keep the
version tag on the same line as documentation:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<full-commit-sha> # v1.0.1
```

Caller repositories must enable the GitHub Actions ecosystem in `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

Major tags such as `v1` are still supported as the official convenience reference when automatic backward-compatible updates are desired:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@v1
```

Using `@v1` does not create caller-side commit SHA update pull requests, because the workflow text does not change when the tag moves.

## Tags

Use moving major tags for caller-friendly references:

- `v1`: latest backward-compatible v1 release
- `v2`: first release that contains breaking changes from v1

Create immutable release tags for Dependabot-friendly SHA updates:

- `v1.0.0`: first v1 release
- `v1.0.1`: next backward-compatible v1 release

Do not move immutable release tags after they are published.

## Automated release flow

Releases are automated with Release Please.

After each push to `main`, `GHA static checks` calls the repository-local
`repo-release-please.yml` workflow only after both lockfile verification and all
static-check jobs succeed. PR runs and manual static-check runs do not release.
Main runs are not cancelled during release processing.

When unreleased conventional commits exist, it creates or updates a Release PR.

The workflow finds the Release PR by its exact branch
(`release-please--branches--main--components--github-actions-common`),
base branch, GitHub App author, and `autorelease: pending` label. The separate
`github-actions[bot]` identity approves it, then the app enables GitHub auto-merge
with squash merging and an expected head SHA. GitHub waits for the repository's
required checks and reviews; no branch protection bypass is used.

PR discovery uses the pull request list REST API instead of search, whose index can
lag immediately after PR creation. If Release Please reports creating a PR but the
workflow cannot find it, the job fails instead of silently skipping approval.

When the Release PR merges, its main CI run calls Release Please again. It then:

1. creates the GitHub Release
2. creates the immutable release tag, such as `v1.0.1`
3. force-updates the moving major tag, such as `v1`

Release Please maintains `CHANGELOG.md` and `.release-please-manifest.json`.

Use conventional commit prefixes to control version bumps:

- `fix:` creates a patch release
- `feat:` creates a minor release
- `feat!:` or a `BREAKING CHANGE:` footer creates a major release
- `perf:`, `deps:`, and `chore:` create a patch release

Dependabot uses `fix(deps):`, and Renovate is explicitly configured to use the same
format. Their merged dependency updates therefore trigger releases too. The official
`changelog-sections` setting includes `chore` so existing `chore(deps):` and
`chore(deps-dev):` PRs also trigger patch releases. This includes other `chore:`
maintenance commits; it is not limited to bot authors or dependency scopes.
An upstream dependency's major version bump alone does not imply a major release here.
With squash merges, keep the conventional prefix in the resulting commit title.
`docs:` and `ci:` changes alone do not normally create a release.

The existing version history, currently starting from `v1.0.0`, is preserved.

### Authentication and repository settings

The release job reuses the existing `renovate` environment's `RENOVATE_APP_ID` and
`RENOVATE_PRIVATE_KEY` secrets. The calling workflow explicitly passes both secret
names, and the reusable workflow declares them as required. Keep this mapping even
when the secrets exist only in the environment; the job's `environment: renovate`
selects their values. It requests an app token limited to this repository
with Contents, Workflows, Pull requests, and Issues write permissions. Workflows write
is needed when creating a release whose target commit has workflow files that differ
from the current default branch, including retries of older pending releases. The app
installation must have these permissions approved. Using the app for PR creation
and merging allows Release PR checks and the post-merge main workflow to run; the default
`GITHUB_TOKEN` would suppress those follow-up workflows.

The separate default `GITHUB_TOKEN` is used only to read contents and approve the app's
Release PR. Keep "Allow GitHub Actions to create and approve pull requests" enabled,
along with "Allow auto-merge" and squash merging. Keep required checks configured on
`main`; if code owner approval is required for these files, that requirement must also
be satisfied by an eligible reviewer. The environment must permit deployments from `main`
without manual approval to keep the flow unattended. Tag rules must permit the app to
create immutable version tags and update moving major tags.

## Manual fallback

Only move `v1` after checks pass on `main`:

```powershell
git switch main
git pull
git tag -a v1.0.1 -m "Release v1.0.1"
git tag -f v1
git push origin v1.0.1
git push -f origin v1
```

Use this only for backward-compatible changes, such as:

- adding optional `workflow_call` inputs with defaults
- fixing bugs without changing caller contracts
- updating pinned third-party actions after validation
- improving documentation

## Breaking changes

Do not move `v1` to a breaking change.

Create a new major tag when a caller must edit its workflow to keep the same behavior. Examples:

- removing or renaming an input
- changing a default in a behaviorally significant way
- requiring new permissions or secrets
- changing job names used as required status checks

## Caller pinning guidance

Security-first recommendation:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<commit-sha>
```

Convenience reference:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@v1
```

Keep third-party actions inside this repository pinned by SHA.
