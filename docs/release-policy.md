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

The `Release Please` workflow runs on each push to `main`.

When unreleased conventional commits exist, it creates or updates a Release PR.

Merge the Release PR to publish a release. The workflow then:

1. creates the GitHub Release
2. creates the immutable release tag, such as `v1.0.1`
3. force-updates the moving major tag, such as `v1`

Use conventional commit prefixes to control version bumps:

- `fix:` creates a patch release
- `feat:` creates a minor release
- `feat!:` or a `BREAKING CHANGE:` footer creates a major release

The first release is configured to start at `v1.0.0`.

By default, the workflow can use `GITHUB_TOKEN`. If Release PRs must trigger the normal pull request checks, create a
`RELEASE_PLEASE_TOKEN` secret with a suitable PAT and allow GitHub Actions to create pull requests in repository settings.

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
