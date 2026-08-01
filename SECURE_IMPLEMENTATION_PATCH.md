# CinemaSync Secure Implementation Patch Outline

> Status update (2026-07-31): The current repository evidence supports the same implementation direction: remove browser-trusted identity, harden server-side auth, hash passwords, and move secrets to environment-based configuration. This remains the implementation guide for the next security pass.

## 1. Backend Security Patch Plan

### 1.1 Add authentication filter
Implement an authentication filter or interceptor that:
- checks for an authenticated session or bearer token,
- attaches the current user to the request context,
- denies access to protected endpoints if authentication is missing.

Current gap to close:
- the browser currently stores `userId` in `localStorage` and reuses it for booking requests, which must be replaced by a server-managed identity flow.

Suggested behavior:
- `/auth/register` and `/auth/login` remain public
- all other state-changing endpoints require authentication

### 1.2 Add authorization checks
For booking and payment requests:
- load the booking by ID,
- verify the booking belongs to the authenticated user,
- reject with 403 if the user is not allowed to access it.

### 1.3 Replace plain-text password handling
Use a password encoder such as `BCryptPasswordEncoder` or Argon2.

Example approach:
- during registration, hash the password before saving,
- during login, compare the supplied password with the stored hash,
- never return password fields in the response.

Current gap to close:
- no secure password hashing strategy is visible in the current committed configuration or source path.

### 1.4 Validate request payloads
Add validation annotations or a request validator for:
- user registration fields
- login fields
- booking request payloads
- route IDs and seat values

Recommended validation rules:
- email format
- non-empty password
- non-empty user name
- valid seat list shape

### 1.5 Add secure session handling
Prefer:
- HttpOnly cookies for session tokens,
- Secure cookies in production,
- SameSite=Lax or Strict,
- server-side session storage or signed tokens.

### 1.6 Add rate limiting
Use a filter or interceptor to limit repeated attempts to:
- `/auth/login`
- `/auth/register`

Recommended controls:
- 5 failed login attempts per 10 minutes per IP
- temporary lockout after repeated failures

---

## 2. Frontend Security Patch Plan

### 2.1 Stop using localStorage for sensitive identity state
Remove reliance on localStorage for user identity.

Instead:
- rely on server-managed session cookies,
- use the authenticated session on the server,
- fetch current user profile from a protected endpoint if needed.

### 2.2 Add CSRF protection for browser-based sessions
If cookies are used:
- include a CSRF token in the page or meta tag,
- send it in the request header for state-changing operations.

### 2.3 Add security headers at the server level
Configure the server to return headers such as:
- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Strict-Transport-Security

### 2.4 Improve client-side error handling
- avoid revealing raw backend details to the user,
- show user-friendly messages only,
- prevent accidental data disclosure in the UI.

---

## 3. Configuration Hardening

### 3.1 Use environment variables for secrets
Move all sensitive values to environment variables:
- MongoDB URI
- app secret keys
- JWT signing keys
- admin credentials if any

### 3.2 Disable debug exposure in production
- avoid verbose stack traces in production responses,
- set logging to INFO or WARN by default.

### 3.3 Enforce HTTPS in production
- redirect HTTP to HTTPS,
- ensure cookies are marked Secure.

---

## 4. Suggested Implementation Order

1. Add authentication filter
2. Add authorization checks for bookings and payments
3. Hash passwords with bcrypt/Argon2
4. Add request validation
5. Replace localStorage identity handling with secure server-side sessions
6. Add rate limiting and CSRF protection
7. Add security headers and HTTPS enforcement
8. Add security tests and monitoring

---

## 5. Example Security Control Matrix

| Control | Why it matters | Priority |
|---|---|---|
| Authentication required on protected APIs | Stops anonymous access | P0 |
| Ownership checks on booking actions | Prevents IDOR-style abuse | P0 |
| Password hashing | Protects credentials after breach | P0 |
| Input validation | Prevents malformed or malicious input | P1 |
| Rate limiting | Reduces brute-force attacks | P1 |
| CSRF protection | Prevents cross-site misuse | P1 |
| Security headers | Reduces XSS and clickjacking risk | P1 |
| HTTPS enforcement | Protects credentials in transit | P1 |
