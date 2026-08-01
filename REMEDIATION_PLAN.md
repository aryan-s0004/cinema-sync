# CinemaSync Prioritized Remediation Plan

> Status update (2026-07-31): Verified evidence from the workspace shows that the current frontend still uses `localStorage` for user identity, the backend source is not visibly present for auth enforcement, and the configuration still exposes a local MongoDB URI. This plan should be treated as the active backlog for the next production-hardening pass.

## 1. Immediate Priority (P0)

These issues should be addressed first because they create the highest risk of unauthorized access and data compromise.

### 1.1 Enforce authentication on protected endpoints
- Require authentication for all booking, confirmation, payment, and admin-related actions.
- Reject unauthenticated requests with 401 Unauthorized.

### 1.2 Enforce authorization and ownership checks
- Ensure a user can only access their own bookings and booking confirmations.
- Validate that booking IDs belong to the authenticated user.
- Reject attempts to modify another user’s records with 403 Forbidden.

### 1.3 Replace client-side identity with server-side sessions
- Stop trusting the browser-supplied `userId` from `localStorage`.
- Use server-issued session cookies or signed tokens with server-side validation.
- Prefer `HttpOnly`, `Secure`, and `SameSite=Lax/Strict` cookies.
- Bind booking actions to the authenticated principal rather than any browser-supplied identifier.

### 1.4 Hash passwords securely
- Use bcrypt or Argon2 for password hashing.
- Hash passwords during registration and verify hashes during login.
- Never return password values in API responses.

### 1.5 Add server-side auth enforcement
- Require authentication on all state-changing endpoints.
- Reject unauthenticated requests with `401 Unauthorized`.
- Enforce ownership checks and reject cross-user access with `403 Forbidden`.

---

## 2. High Priority (P1)

These changes substantially reduce common attack surfaces.

### 2.1 Add input validation
- Validate request body schemas for registration, login, booking, and payment.
- Reject invalid types, empty fields, and malformed identifiers.

### 2.2 Add rate limiting and brute-force protection
- Limit repeated login attempts per IP and per account.
- Add temporary lockout or captcha after repeated failures.

### 2.3 Add CSRF protection
- If cookie-based sessions are used, implement CSRF tokens.
- Use SameSite cookies and origin validation.

### 2.4 Add security headers
- Enable Content-Security-Policy
- Enable X-Content-Type-Options
- Enable X-Frame-Options
- Enable Referrer-Policy
- Enable Strict-Transport-Security in production

---

## 3. Medium Priority (P2)

These improvements strengthen robustness and operational security.

### 3.1 Improve error handling
- Return generic error messages to clients.
- Avoid exposing stack traces or internal object details.

### 3.2 Add audit logging
- Log authentication failures, booking actions, and suspicious traffic.
- Store enough context for incident review.

### 3.3 Add security testing
- Add unit and integration tests for access control and input validation.
- Add regression tests for authentication and authorization flows.

### 3.4 Harden configuration
- Move secrets to environment variables.
- Disable debug logging in production.
- Use HTTPS and production-safe settings.

---

## 4. Lower Priority (P3)

These are important for long-term maturity and resilience.

### 4.1 Introduce seat inventory and booking concurrency controls
- Prevent double-booking with atomic checks or transactional updates.
- Add lock expiration for temporary seat reservations.

### 4.2 Add observability
- Add health endpoints, metrics, and request monitoring.
- Track failure rates and suspicious request spikes.

### 4.3 Prepare for deployment hardening
- Containerize the app.
- Deploy behind a reverse proxy or load balancer.
- Use managed MongoDB with network protection.
