# CinemaSync Security Plan Update

> Status date: 2026-07-31

## 1. Verified security posture

The current evidence shows that the application remains an MVP with major protection gaps:

- Authentication and authorization are not visible in the server-side source currently committed to the workspace.
- The browser stores `userId` in `localStorage` and reuses it in booking requests.
- Password handling is not shown to use a secure password encoder.
- The MongoDB connection string is hard-coded in configuration.
- No visible security headers, CSRF protection, or HTTPS enforcement are present in the current frontend/server configuration.

## 2. Highest-risk fixes

### P0 - must be implemented first

1. Remove client-controlled identity from the browser.
   - Do not trust `userId` from `localStorage`.
   - Replace this with a server-issued session cookie or signed token.
   - Authorize every booking action against the authenticated principal.

2. Add password hashing.
   - Use `BCryptPasswordEncoder` or Argon2.
   - Hash the password on registration.
   - Verify the hash on login.
   - Never return password fields in API responses.

3. Enforce server-side authorization.
   - `/booking/*` and payment flows must require authentication.
   - Validate ownership of booking records and return 403 for cross-user access.

### P1 - next hardening pass

4. Add request validation.
   - Validate email format, password strength, and booking payload structure.
   - Reject malformed or unexpected inputs early.

5. Add brute-force and abuse protection.
   - Add rate limiting to `/auth/login` and `/auth/register`.
   - Add account lockout or CAPTCHA after repeated failures.

6. Add CSRF and secure cookie settings.
   - Use `HttpOnly`, `Secure`, and `SameSite` attributes on session cookies.
   - Add CSRF tokens for browser session flows.

7. Add security headers and HTTPS hardening.
   - `Content-Security-Policy`
   - `X-Content-Type-Options`
   - `X-Frame-Options`
   - `Referrer-Policy`
   - `Strict-Transport-Security`

### P2 - operational hardening

8. Move secrets to environment variables.
   - MongoDB URI
   - signing secrets
   - app configuration values

9. Add security regression tests.
   - Authn/authz regression tests
   - CSRF rejection tests
   - Password hashing tests
   - malformed request rejection tests

## 3. Implementation sequence

1. Backend authn/authz foundation
2. Password hashing and secure credential flow
3. Replace `localStorage` identity flow
4. Add CSRF and cookie protection
5. Add security headers and HTTPS redirect
6. Move secrets out of source
7. Add security tests and monitoring

## 4. Completion criteria

The next hardening pass is complete when:

- all protected endpoints require authentication,
- all booking changes are ownership-checked,
- passwords are stored as salted hashes,
- browser identity is no longer trusted from `localStorage`,
- CSRF protection and secure cookies are enabled,
- security headers are returned by the app,
- the deployment uses env-based secrets rather than committed configuration.
