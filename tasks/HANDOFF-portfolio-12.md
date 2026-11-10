# HANDOFF portfolio-12 — Record ComposePermit and MCP-only next-project rule

Agent: Codex (deep)
Status: DONE
Date: 2026-11-10

## Scope

Card said: Record the completed public project and keep selecting daily-use, worldwide-useful open-source MCPs.
I changed: portfolio-state.json, tasks/HANDOFF-portfolio-12.md

## What I did

- Recorded ComposePermit as completed iteration 12 with the public MIT repository, final commit, user/job/value model, evidence, assumptions, attempts, verification, analytics, and remaining risks — the ledger now matches the shipped repository.
- Recorded GitHub Actions run 42746175195 as the final remote gate — frozen install, full verification, signature, and the live high-severity production audit passed for commit `d5c1877619465eb2d87e34820d1f177bafa536f4`.
- Set the iteration-13 selection rule to daily-use, worldwide productivity MCPs that are useful as open source — novelty projects and narrow vertical tools are excluded.
- Preserved revenue and customer counts as `[UNVERIFIED]` — no payment or customer evidence was supplied.

## Verification

Command: `jq -e '.status == "completed" and .iteration == 12 and .completed_project_count == 12 and (.projects | length) == 12 and .projects[-1].id == 12 and .projects[-1].repository_url == "https://github.com/uvindev/compose-permit" and .projects[-1].commit_sha == "d5c1877619465eb2d87e34820d1f177bafa536f4" and .active_node == null and .active_project == null' portfolio-state.json && bash ./scripts/verify-signature.sh`
Output:

```
STATE_SCHEMA_OK status=completed iteration=12 completed=12 projects=12
IAMUVIN SIGNATURE GATE
  PASS  attribution line
  PASS  hub URL
  PASS  runtime badge
  PASS  accent token
  PASS  head metadata
  PASS  build artifacts
  PASS  no anti-patterns
SIGNED
```

Result: PASS

## Assumptions I made

- The MCP-only rule applies from iteration 13 onward rather than retroactively changing the already public ComposePermit repository — Claude: confirm or correct.
- “Worldwide useful” means avoiding country-specific workflows and choosing an MCP job that recurs across common developer or knowledge-work stacks — Claude: confirm or correct.

## What I did not do

- I did not begin iteration 13 or select its MCP product before comparing at least three current jobs.
- I did not deploy ComposePermit, connect checkout, contact users, collect payment, or execute Docker.

## Risk

The iteration-13 rule is qualitative; research must still reject crowded MCP wrappers and demonstrate a distinct recurring job before implementation.

## Open question

none
