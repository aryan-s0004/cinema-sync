# CinemaSync Security Review

## 1. Scope and Method

This review covers the visible project structure, configuration, frontend assets, API contract implied by the app, and the current build/test state.

Important limitation:
- The workspace contains the Spring Boot resources and static frontend files, but the Java source tree under src/main/java is not present in the visible workspace snapshot.
- The assessment therefore relies on the compiled classes, the frontend assets, the application configuration, and the documented API behavior.

---

## 2. Executive Summary

The current CinemaSync implementation is a functional MVP, but it is not production-ready from a security perspective.

> Documentation update (2026-07-29): a remediation plan, a secure implementation patch outline, and a penetration-test checklist have now been added so the security work is documented and can be executed in a structured way.

The most serious issues are:

- No visible authentication protection for state-changing API endpoints
- No password hashing or secure credential handling visible
- Potential leakage of sensitive user data through API response patterns
- No protection against tampering, IDOR-style abuse, or replay-style misuse of booking actions
- Weak configuration and deployment hygiene for a web application

The site is currently exposed to multiple realistic attack paths, including unauthorized booking actions, user impersonation, account enumeration, and abuse of public endpoints.

---

## 3. Folder-by-Folder Review

### 3.1 Root project folder

Files and folders present:
- [cinemaSync/README.md](cinemaSync/README.md)
- [cinemaSync/ARCHITECTURE_DOCUMENT.md](cinemaSync/ARCHITECTURE_DOCUMENT.md)
- [cinemaSync/SECURITY_REVIEW.md](cinemaSync/SECURITY_REVIEW.md)
- [cinemaSync/pom.xml](cinemaSync/pom.xml)
- [cinemaSync/k6_load_test.js](cinemaSync/k6_load_test.js)
- [cinemaSync/frontend/index.html](cinemaSync/frontend/index.html)
- [cinemaSync/src/main/resources](cinemaSync/src/main/resources)
- [cinemaSync/target](cinemaSync/target)

Findings:
- The project is a simple monolithic web app with no visible security hardening documentation beyond architecture notes.
- The build succeeds, but there is no visible security test suite.
- The load-test script is present, but there is no evidence of DDoS protection, rate limiting, or abuse detection in the application.

### 3.2 src/main/resources

Files present:
- [cinemaSync/src/main/resources/application.properties](cinemaSync/src/main/resources/application.properties)
- [cinemaSync/src/main/resources/static](cinemaSync/src/main/resources/static)

Findings:
- The application is configured with a local MongoDB connection string: mongodb://localhost:27017/cinemasync_db.
- There is no environment-variable-based secret management visible.
- The application runs on port 8080.
- No TLS, HTTPS enforcement, or secure cookie configuration is visible.

### 3.3 src/main/resources/static

Files present:
- [cinemaSync/src/main/resources/static/index.html](cinemaSync/src/main/resources/static/index.html)
- [cinemaSync/src/main/resources/static/login.html](cinemaSync/src/main/resources/static/login.html)
- [cinemaSync/src/main/resources/static/register.html](cinemaSync/src/main/resources/static/register.html)
- [cinemaSync/src/main/resources/static/movies.html](cinemaSync/src/main/resources/static/movies.html)
- [cinemaSync/src/main/resources/static/css/style.css](cinemaSync/src/main/resources/static/css/style.css)
- [cinemaSync/src/main/resources/static/js/auth.js](cinemaSync/src/main/resources/static/js/auth.js)
- [cinemaSync/src/main/resources/static/js/movies.js](cinemaSync/src/main/resources/static/js/movies.js)

Findings:
- The frontend is static and uses vanilla JavaScript.
- There is no CSP header or security header policy visible.
- The pages do not show evidence of client-side input sanitization beyond basic form fields.
- The login and registration pages accept password fields directly and submit them to the backend.

### 3.4 frontend

File present:
- [cinemaSync/frontend/index.html](cinemaSync/frontend/index.html)

Findings:
- This is a front-end entry page that points to the movie flow.
- It does not include any visible security protections or token handling.

### 3.5 target

The build output contains compiled classes and copied static assets under [cinemaSync/target](cinemaSync/target).

Findings:
- The build output confirms that the app is runnable and that the static assets are being served.
- The compiled output does not introduce new security controls beyond what is already present in the app configuration.

---

## 4. API Endpoint Assessment

The visible frontend code and project documentation imply these endpoints:

- POST /auth/register
- POST /auth/login
- GET /movies
- POST /movies
- POST /booking/lock
- POST /booking/confirm/{id}
- POST /payment/pay/{id}
- POST /payment/refund/{id}

### 4.1 Are they secured?

No, not sufficiently.

Current status:
- Registration and login are public endpoints.
- Booking and payment actions appear to be callable without visible authentication enforcement.
- The browser stores a user ID in localStorage and uses it as a client-side identity signal.
- There is no visible JWT, session token, or server-side authorization gate protecting these endpoints.

### 4.2 Security implications

This means an attacker can potentially:
- Create accounts freely
- Try credential stuffing against login
- Call booking endpoints with arbitrary user IDs
- Trigger booking confirmations for bookings they do not own
- Abuse payment endpoints if they are reachable without access control

This is a severe authorization weakness.

---

## 5. Data Leakage Assessment

### 5.1 Likely sensitive data exposure

The visible design suggests that user objects may be returned from the authentication flow.

Risk:
- If the user model includes password or other sensitive fields and those are serialized to JSON, the API may leak data to the browser.
- The visible frontend code does not filter responses before storing or handling them.

### 5.2 Browser storage risk

The frontend uses localStorage to store userId after login.

Risk:
- localStorage is accessible to JavaScript on the page and can be read by any injected script.
- It is not a secure place for sensitive authentication state.
- If the app later stores tokens or profile data there, it becomes an XSS target.

### 5.3 Information leakage through error handling

No visible evidence of sanitized error responses.

Risk:
- Improper error reporting may expose stack traces, internal object details, or database information to clients.

---

## 6. Attack Vectors Visible in the Current Code

### 6.1 Broken authentication and authorization

Observed issue:
- The client sends userId from localStorage to booking requests.
- There is no visible server-side check that the authenticated user is actually allowed to book or confirm that booking.

Attack impact:
- IDOR-style abuse is possible.
- A user can tamper with userId or bookingId values to influence another account’s booking state.

### 6.2 Credential handling weakness

Observed issue:
- Password field is collected and sent in a plain JSON payload.
- No password hashing or secure password policy is visible.

Attack impact:
- If the backend stores plaintext passwords, account compromise becomes trivial after a database breach.
- If the transport is not HTTPS, credentials can be intercepted in transit.

### 6.3 CSRF and state-changing action abuse

Observed issue:
- There is no visible anti-CSRF token or same-site cookie protection.

Attack impact:
- If the app later uses browser cookies for authentication, it becomes vulnerable to cross-site request forgery.

### 6.4 Brute-force and abuse of login endpoints

Observed issue:
- Login and register endpoints are exposed without visible rate limiting.

Attack impact:
- Account enumeration and credential stuffing are easier.

### 6.5 Input tampering and malformed payloads

Observed issue:
- Booking payloads are client-generated and include hard-coded seats.

Attack impact:
- Attackers can modify the request body to submit arbitrary data.
- The server must validate constraints, ownership, and allowed values.

---

## 7. Current Security Posture Summary

| Area | Status | Notes |
|---|---|---|
| Authentication | Weak | No visible JWT/session-based auth layer |
| Authorization | Weak | Booking/payment actions appear unprotected |
| Password storage | Weak | No visible hashing strategy |
| Transport security | Weak | No HTTPS enforcement visible |
| Data exposure | Moderate risk | Potential user data leakage and localStorage misuse |
| Input validation | Weak | No visible server-side validation evidence |
| CSRF protection | Missing | No visible anti-CSRF controls |
| Rate limiting | Missing | Login/register could be abused |
| Security headers | Missing | No CSP/X-Frame-Options etc. visible |
| Test coverage | Weak | No security-focused tests visible |

---

## 8. How to Prevent Cyber Attacks on This Site

### Priority 0: Stop the highest-risk problems immediately

1. Protect all state-changing endpoints
   - Require authentication for /booking/lock, /booking/confirm/{id}, /payment/pay/{id}, /payment/refund/{id}, and any admin or management endpoints.
   - Enforce ownership checks server-side.

2. Replace localStorage-based identity with secure server-side sessions
   - Use HttpOnly, Secure, SameSite cookies for authenticated sessions.
   - Avoid storing sensitive identity state in localStorage.

3. Hash passwords properly
   - Use bcrypt or Argon2.
   - Never return passwords in API responses.

4. Validate all input server-side
   - Enforce schema validation for login, registration, booking payloads, and IDs.
   - Reject invalid, unexpected, or oversized data.

### Priority 1: Add core defensive controls

5. Add rate limiting and brute-force protection
   - Limit repeated login attempts per IP and account.

6. Add CSRF protection
   - For cookie-based sessions, use CSRF tokens or double-submit cookies.

7. Use HTTPS everywhere
   - Enforce TLS in production.
   - Do not send credentials over plain HTTP.

8. Add security headers
   - CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Strict-Transport-Security.

### Priority 2: Harden the application architecture

9. Add logging and monitoring
   - Log authentication failures, suspicious booking attempts, and unusual traffic.

10. Add automated security tests
   - Unit and integration tests for authorization, input validation, and error handling.

11. Use environment-based configuration secrets
   - Move MongoDB credentials and app secrets into environment variables or secret management.

12. Add database hardening
   - Use authentication for MongoDB, network restrictions, and least-privilege roles.

---

## 9. Recommended Immediate Action Plan

### Short term
- Add authentication middleware to booking and payment endpoints
- Enforce user ownership checks
- Hash passwords with bcrypt/Argon2
- Remove password exposure from API responses
- Replace localStorage-based user identity with secure session cookies

### Medium term
- Add input validation and schema enforcement
- Add rate limiting and audit logging
- Add security headers and HTTPS enforcement

### Long term
- Add penetration testing and security regression tests
- Deploy with managed cloud infrastructure and secrets management
- Add WAF and intrusion monitoring if the app goes public

---

## 10. Bottom Line

The current site is functional, but it does not meet basic security expectations for a web application that handles accounts, booking actions, and potentially sensitive user data.

The most important improvements are:
- enforce authentication and authorization on every protected endpoint,
- stop treating client-provided user identity as trusted,
- hash passwords correctly,
- and move to secure session handling and HTTPS.
