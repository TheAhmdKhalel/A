# A-main — Version 5.0

# Ahmad Khalel

Personal portfolio website for Ahmad Khalel.

## Project

Ahmad Khalel | أحمد خليل

Visual Identity Designer & Personal Website Designer.

## Technologies

- HTML
- CSS
- JavaScript

## Structure

- index.html
- css/style.css
- js/main.js
- assets/images
- assets/icons
- assets/fonts

## Development

The website is built section by section and phase by phase.

## Private Client Forms Backend
The private identity form now expects a unique `?token=` link and verifies the client's WhatsApp against a Google Apps Script Web App. The Apps Script stores submissions in Google Sheets. Configure `backend/Code.gs` with your Sheet ID, deploy it as a Web App, then place the `/exec` URL in `js/form-config.js`. The Admin Panel is served by the Google Apps Script Web App and is not hosted on GitHub Pages. Open the deployed `/exec?op=admin` URL while signed into an allowed Google account. If `/exec?op=admin` shows the API status message, the Apps Script deployment is an older version and must be updated.


## Current form system
- Public/private form routes: `/meeting/`, `/form-identity/`, `/form-website/`, `/form-identity-website/`
- Private project invitation: `?token=...`
- WhatsApp verification before access
- Google Sheets storage through Google Apps Script
- Web3Forms email notifications (up to the account's monthly plan limit)
- Restricted Admin Web App creates Client ID, Project ID, Service, WhatsApp, Email, and Unique Token
- Admin GET route is protected by `ADMIN_EMAILS` before the panel is served

## Private service forms
- `/form-identity/` — Visual Identity questionnaire.
- `/form-website/` — Personal Website questionnaire.
- `/form-identity-website/` — combined questionnaire (to be added after the two sections are finalized).

All service forms are `noindex` and require a project token plus WhatsApp verification.


## Version 3.8
Admin panel now uses Google Apps Script's `google.script.run` and includes a setup guide for the Google Sheets connection.
