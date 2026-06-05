# 0004 - Standardize On ProblemDetails For Error Handling

Date: 2026-05-13

Status: Accepted

## Context

The backend returns standardized RFC-style problem responses for validation, business, and auth errors. The frontend needs consistent behavior across forms, mutations, BFF routes, and global redirects.

The shared client-side mapper lives in `api/problems.ts`. Server-side forwarding helpers live in `lib/backend.ts`.

## Decision

Client-visible backend errors should be represented as `ProblemDetails` and handled through shared helpers.

Expected handling:

- Validation errors with an `errors` object map to form field errors.
- `401` redirects the user to login from client-side API handling.
- `5xx` responses show a generic failure toast.
- Business errors show the problem title and detail through Sonner.
- BFF routes should forward backend problem bodies without exposing stack traces or raw token/session data.

## Consequences

Forms and mutations get consistent behavior and copy. New features do not need bespoke toast and validation mapping code for every request.

The app remains dependent on backend error consistency. If the backend changes its error shape, the shared mapper should be updated before feature code is patched around it.

## Agent Guidance

When building forms or mutations, use the shared problem helpers. Do not parse response errors ad hoc in each component unless there is a documented exception.

When adding BFF auth routes, return backend problems through `problemResponse()` where appropriate, but sanitize login and registration errors that could leak account enumeration details.

If a form needs field-level errors, use `mapProblemToFieldErrors()` and keep backend field names converted to the frontend form field casing in one place.
