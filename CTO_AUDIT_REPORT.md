# CinemaSync CTO Audit

Date: 2026-08-02

## Executive Summary

CinemaSync is a compact Spring Boot booking prototype with a clear controller-service-repository shape, but it had several release-blocking gaps: the static movie UI could not execute, public pages were blocked by security rules, duplicate registrations could overwrite users, and tests did not cover core abuse cases.

This audit pass prioritized correctness, security posture, and build reliability without expanding the product scope.

## Fixed In This Pass

- Normalized emails before registration and login.
- Rejected duplicate user registrations with `409 Conflict`.
- Required non-blank emails on auth requests.
- Required at least one non-blank seat in booking requests.
- Bound booking ownership to the authenticated principal instead of trusting the submitted `userId`.
- Added consistent JSON error responses for validation and business errors.
- Opened static HTML/CSS/JS assets while keeping booking protected.
- Fixed the broken movie rendering JavaScript and removed unsafe string-based HTML assembly.
- Switched frontend URLs to `window.location.origin` for local and deployed environments.
- Updated app config to use environment-backed MongoDB and logging settings.
- Fixed the Windows Maven wrapper path handling issue.
- Added Spring Boot 4 compatible MockMvc test support.
- Expanded integration tests from happy-path coverage to security and validation cases.

## Remaining Product Risks

- Authentication still uses HTTP Basic for the demo flow. Production should move to short-lived tokens or server-side sessions with CSRF protection.
- The repository is in-memory, so users and bookings are lost on restart despite MongoDB dependencies being present.
- Seat locking is not persisted and does not prevent concurrent double-booking.
- The movie catalog is hardcoded and has no admin workflow.
- Payment and booking confirmation flows described in older documentation are not implemented in the current code.

## Recommended Next Steps

1. Replace the in-memory user repository with MongoDB repositories and unique indexes.
2. Introduce a booking aggregate with lock expiry and atomic seat conflict checks.
3. Replace Basic auth with JWT or secure session cookies.
4. Add CI with `mvnw test` on pull requests.
5. Add API documentation that matches the implemented endpoints.
