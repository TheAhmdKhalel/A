# Future Admin — Specification

This is a future component and is intentionally not exposed as a public static admin page yet.

## New Client record

Required fields:

- Client ID
- Project ID
- Service
- WhatsApp
- Email
- Unique Token
- Status

## Admin actions

1. Add client/project.
2. Generate a cryptographically random token.
3. Choose the service/form type.
4. Copy the generated private form URL.
5. Revoke a token when necessary.
6. See whether the form has been submitted.

## Security rule

The public GitHub Pages site must never contain an admin password, API key, or Google service-account credential.

The eventual Admin UI should run behind an authenticated backend (Google Apps Script/Google account access or another private backend), while the public forms remain token + WhatsApp verified.


## 3.8 Admin implementation note

The Admin UI is served by the Google Apps Script project itself and uses `google.script.run`
to create clients. It is intentionally not hosted on GitHub Pages. Configure `ADMIN_EMAILS`
with the Google account(s) allowed to operate the panel, and deploy the Apps Script web app
with the access setting appropriate for those accounts. The Admin page does not expose the
Google Sheet ID or client records to the public website.
