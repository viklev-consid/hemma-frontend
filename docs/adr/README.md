# Architecture Decision Records

ADRs capture decisions that future humans and agents should preserve unless there is a deliberate replacement decision.

## Index

- [0001 - Use A Next.js BFF Proxy As The Backend Boundary](./0001-bff-proxy-and-session-boundary.md)
- [0002 - Treat OpenAPI As The Frontend Contract Source](./0002-openapi-contract-and-generated-client.md)
- [0003 - Split Authentication, Onboarding, And Permissions By Runtime Layer](./0003-auth-permission-and-onboarding-model.md)
- [0004 - Standardize On ProblemDetails For Error Handling](./0004-problemdetails-error-handling.md)
- [0005 - Standardize The Frontend Application Stack](./0005-frontend-stack-decisions.md)
- [0006 - Verify Changes By Risk And Boundary](./0006-verification-and-agent-workflow.md)
- [0007 - Use App Router Route Groups And Next Proxy Deliberately](./0007-app-router-route-groups-and-next-proxy.md)
- [0008 - Track Documentation Drift As A First-Class Maintenance Concern](./0008-documentation-drift.md)
- [0009 - Prefer Server Defaults With React Query Hydration](./0009-server-default-query-hydration.md)
- [0010 - Org-Scoped Permissions And PlatformOverride](./0010-org-scoped-permissions-and-platform-override.md)

## Template

```md
# NNNN - Title

Date: YYYY-MM-DD

Status: Proposed | Accepted | Superseded | Deprecated

## Context

What forces, constraints, or problems led to this decision?

## Decision

What are we choosing?

## Consequences

What becomes easier, harder, safer, or more constrained?

## Agent Guidance

What should future agents do or avoid when touching this area?
```
