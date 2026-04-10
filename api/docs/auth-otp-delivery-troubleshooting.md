# OTP Delivery Troubleshooting

This guide helps when login or reset OTP is generated but not received in inbox.

## Symptom

- UI shows `Delivery mode: log`
- OTP requests succeed, but no email arrives

## Why this happens

When SMTP is not configured, backend can fallback to console log mode for local development.

## Required environment variables

Set these in `backend/.env` and restart backend:

```env
EMAIL=your-gmail@gmail.com
APP_PASSWORD=your-16-char-gmail-app-password
EMAIL_SERVICE=gmail
EMAIL_FROM="CinemaSync <your-gmail@gmail.com>"
EMAIL_FALLBACK_TO_LOG=false
```

You can also use:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-char-gmail-app-password
```

Both styles are supported.

## Verify setup

1. Restart backend server.
2. Call login OTP or forgot password flow.
3. Confirm `deliveryMode` in response is `smtp`.
4. Check spam/promotions tab once.

## Notes

- Gmail App Password requires 2-Step Verification enabled.
- Never commit real credentials to git.
