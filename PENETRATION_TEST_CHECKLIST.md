# CinemaSync Penetration Test Checklist

> Status update (2026-07-29): this checklist should be used after the P0 authentication and authorization controls are implemented to validate the security posture end to end.

## 1. Authentication Testing

- [ ] Register a new account successfully
- [ ] Attempt login with valid credentials
- [ ] Attempt login with invalid credentials
- [ ] Test for username/email enumeration differences
- [ ] Verify that unauthenticated users cannot access protected endpoints
- [ ] Verify session expiry behavior
- [ ] Verify logout clears authentication state

## 2. Authorization Testing

- [ ] Attempt to access another user’s booking by changing the booking ID
- [ ] Attempt to confirm another user’s booking
- [ ] Attempt payment actions for a booking not owned by the current user
- [ ] Test for IDOR-style access to user records or booking data
- [ ] Verify that administrators and regular users are properly separated if roles are added

## 3. Input Validation Testing

- [ ] Send malformed JSON to registration and login endpoints
- [ ] Send oversized values in fields such as name, email, and password
- [ ] Test for SQL/NoSQL injection patterns in query parameters and request bodies
- [ ] Test for invalid seat values and booking payload tampering
- [ ] Verify that invalid IDs are rejected cleanly

## 4. Session and Token Security Testing

- [ ] Inspect whether sensitive state is stored in localStorage
- [ ] Verify whether session tokens are HttpOnly and Secure
- [ ] Test for token reuse after logout
- [ ] Test for token tampering or missing token handling
- [ ] Confirm that authentication state is not exposed in client-side scripts

## 5. Transport and Configuration Testing

- [ ] Verify that the app redirects HTTP to HTTPS in production
- [ ] Confirm that cookies are marked Secure and SameSite properly
- [ ] Check whether secrets are hardcoded in configuration files
- [ ] Verify that debug mode is not enabled in production
- [ ] Review exposed ports and network access rules

## 6. Frontend Security Testing

- [ ] Test for reflected XSS in form inputs and error messages
- [ ] Test for DOM-based XSS via URL parameters or client-side rendering
- [ ] Verify that scripts do not expose sensitive values in the browser console
- [ ] Check for CSP and security headers on responses
- [ ] Test clickjacking resistance

## 7. Abuse and Rate-Limiting Testing

- [ ] Attempt repeated login attempts from one IP
- [ ] Attempt repeated registration attempts from one IP
- [ ] Check whether the app rate-limits suspicious traffic
- [ ] Verify that repeated failures trigger temporary lockouts or captchas

## 8. Data Exposure Testing

- [ ] Confirm that password fields are not returned in API responses
- [ ] Verify that internal error messages are not leaked to clients
- [ ] Check whether user profile data is unnecessarily exposed
- [ ] Confirm that MongoDB credentials are not present in source or config artifacts

## 9. Reporting and Evidence

- [ ] Record request/response pairs for each finding
- [ ] Capture HTTP status codes and payloads
- [ ] Note the affected endpoint and potential impact
- [ ] Recommend remediation with severity and priority
