# Release policy

## Caller pinning policy

The security-first recommendation is to pin reusable workflows and composite actions by commit SHA:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@<commit-sha>
```

This makes caller updates explicit and reviewable.

Major tags such as `v1` are still supported as the official convenience reference when automatic backward-compatible updates are desired:

```yaml
uses: watanabe-1/github-actions-common/.github/workflows/gha-static-check.yml@v1
```

## Tags

Use moving major tags for caller-friendly references:

- `v1`: latest backward-compatible v1 release
- `v2`: first release that contains breaking changes from v1

Optional immutable tags such as `v1.0.0` may be created for auditability.

## Updating `v1`

Only move `v1` after checks pass on `main`:

```powershell
git switch main
git pull
git tag -f v1
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
