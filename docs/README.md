# Project Documentation

This folder holds durable project documentation for humans and coding agents.

Use `AGENTS.md` for operational instructions that should be followed during a task. Use `docs/adr` for architectural decisions that explain why the project is shaped the way it is and what future changes must preserve.

## Structure

- `adr/` - Architecture Decision Records for choices that should not be casually undone.
- `workflows/` - Task playbooks for recurring implementation and verification flows.

## Reading Order For Agents

Before changing code, read:

1. `AGENTS.md`
2. The ADRs relevant to the files being changed
3. Any matching workflow playbook
4. The relevant local Next.js docs under `node_modules/next/dist/docs/`

The local Next.js docs are the source of truth for framework behavior in this repository.

## ADR Status Values

- `Accepted` - Current project policy.
- `Proposed` - Under consideration, not yet binding.
- `Superseded` - Replaced by a newer ADR.
- `Deprecated` - Historical context only.
