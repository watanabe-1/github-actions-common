# Repository Instructions

## Required Checks

After changing GitHub Actions workflows, composite actions, or release automation, run these checks before finishing:

```sh
actionlint
zizmor --no-config .
ghalint run
```

If a check cannot be run locally, state which check was skipped and why.
