# Welcome to OTBL

## How We Use Claude

Based on usage over the last 30 days (38 sessions):

Work Type Breakdown:
  Build Feature     ████████████████████  35%
  Plan & Design     ██████████████░░░░░░  24%
  Debug Fix         █████████████░░░░░░░  23%
  Improve Quality   ██████████░░░░░░░░░░  18%

Top Skills & Commands:
  /exit             ████████████████████  18x/month
  /model            ████████░░░░░░░░░░░░  7x/month
  /mcp              ███████░░░░░░░░░░░░░  6x/month
  /login            ███░░░░░░░░░░░░░░░░░  3x/month
  /effort           █░░░░░░░░░░░░░░░░░░░  1x/month
  /plugin           █░░░░░░░░░░░░░░░░░░░  1x/month

Top MCP Servers:
  code-review-graph ████████████████████  62 calls
  ide               ███░░░░░░░░░░░░░░░░░  8 calls

## Your Setup Checklist

### Codebases
- [ ] otbl — https://github.com/sudorishabh/otbl

### MCP Servers to Activate
- [ ] code-review-graph — Persistent knowledge graph of the codebase (callers, dependents, impact radius, test coverage) for token-efficient code review and exploration. This is the team's primary tool — use it before Grep/Glob/Read. Ask the team lead for the server config/setup steps, then add it via `/mcp`.
- [ ] ide — IDE integration (diagnostics, file context) for VS Code / JetBrains. Activates automatically when you run Claude Code from inside the editor with the extension installed.

### Skills to Know About
- [ ] /review-changes — Structured code review using change detection + impact analysis.
- [ ] /explore-codebase — Navigate and understand structure via the knowledge graph.
- [ ] /debug-issue — Systematic debugging with graph-powered navigation.
- [ ] /refactor-safely — Plan and execute refactors using dependency analysis.

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
