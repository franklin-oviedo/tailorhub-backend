# Branch Protection Policy

Use these settings in GitHub for the main branch.

## Required status checks

- Require status checks to pass before merging.
- Select required checks:
  - Test and Coverage
- Require branches to be up to date before merging.

## Pull request requirements

- Require a pull request before merging.
- Require at least 1 approval.
- Dismiss stale approvals when new commits are pushed.

## Additional protections

- Include administrators.
- Restrict force pushes.
- Restrict branch deletion.

## Why this matters

The CI workflow runs `npm run test:ci`, which enforces 100% global coverage for statements, branches, functions, and lines. If coverage drops below 100%, merge is blocked.
