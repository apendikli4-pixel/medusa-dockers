---
name: evidence-first-engineering
description: "Use when implementing backend or storefront changes with a strict evidence-based workflow: scope-risk-assumption-validation planning, staged delivery, reproducible checks, mandatory quality gates, and regression-aware verification. Triggers: plan before edit, prove with data, isolate change set, verify before merge, avoid speculative edits."
argument-hint: "Task goal, scope, constraints, and acceptance criteria"
user-invocable: true
disable-model-invocation: false
---

# Evidence-First Engineering

## What This Skill Produces
- A verified implementation path before code edits
- A constrained change set with explicit risk controls
- Reproducible validation evidence tied to acceptance criteria
- A detailed technical report with evidence table, assumptions, findings, and residual risk

## When to Use
- Medusa v2 backend changes where regressions are costly
- Storefront changes needing behavioral verification
- Security-sensitive API edits requiring strict validation
- Any task where correctness must be demonstrated, not assumed

## Inputs Required
- Task goal and expected business outcome
- In-scope files or modules
- Out-of-scope boundaries
- Acceptance criteria and test expectations
- Operational constraints (time, environment, external dependencies)

## Procedure
1. Define scope and constraints.
2. Capture explicit assumptions and identify unknowns.
3. Gather baseline evidence from code, config, logs, and tests.
4. Map risk by severity and blast radius.
5. Draft a staged delivery plan with stop/go checks per stage.
6. Implement the smallest viable change set for Stage 1.
7. Validate with reproducible checks tied to acceptance criteria.
8. If checks fail, perform root-cause analysis, adjust minimally, and re-run checks.
9. Continue stage-by-stage until all criteria are satisfied.
10. Produce a completion summary: evidence, risks, and follow-up actions.

## Decision Points And Branching
- If baseline evidence is incomplete: stop implementation and collect missing context first.
- If assumptions are unverified but high-impact: replace assumption with a measurement task.
- If risk is high and test coverage is weak: add focused tests before broad refactors.
- If unrelated local changes are detected: isolate and avoid reverting unless explicitly requested.
- If verification fails 3 iterations for same issue: stop and escalate with blocker details.

## Quality Gates
- Scope is explicit and out-of-scope is documented (mandatory)
- Every behavioral claim is backed by observed evidence (mandatory)
- Validation steps are reproducible by another engineer (mandatory)
- No hidden API contract changes (mandatory)
- No security regression in auth, validation, or error exposure (mandatory)
- Residual risks are documented with owners or next actions (mandatory)

## Output Format (Default)
Produce a detailed technical report with the following sections:
1. Scope, constraints, and acceptance criteria
2. Assumptions and validation status
3. Risk matrix (severity, likelihood, blast radius)
4. Implemented change set summary
5. Evidence table (check, command/test, result, pass/fail)
6. Regressions checked and outcomes
7. Residual risks and follow-up owners
8. Final go/no-go decision with rationale

## Completion Checklist
- Scope, risks, assumptions, and criteria are documented
- Changes are minimal and targeted
- Relevant tests/checks pass or failures are explicitly justified
- Evidence log is included in handoff
- Remaining risks and monitoring points are listed

## Prompt Starters
- Apply evidence-first engineering to harden this Medusa route with Zod validation and safe error handling.
- Use staged delivery to refactor this workflow with minimal regression risk.
- Run scope-risk-assumption-validation planning for this storefront feature before editing files.
