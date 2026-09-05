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
The private identity form now expects a unique `?token=` link and verifies the client's WhatsApp against a Google Apps Script Web App. The Apps Script stores submissions in Google Sheets. Configure `backend/Code.gs` with your Sheet ID, deploy it as a Web App, then place the `/exec` URL in `js/form-config.js`. The future Admin Panel will create client/project records and unique tokens; it is intentionally not exposed in this version.


## Current form system
- Public form routes: `/form-identity/`, `/form-website/`, `/form-identity-website/`
- Private project invitation: `?token=...`
- WhatsApp verification before access
- Google Sheets storage through Google Apps Script
- Restricted Admin Web App creates Client ID, Project ID, Service, WhatsApp, Email, and Unique Token

## Private service forms
- `/form-identity/` — Visual Identity questionnaire.
- `/form-website/` — Personal Website questionnaire.
- `/form-identity-website/` — combined questionnaire (to be added after the two sections are finalized).

All service forms are `noindex` and require a project token plus WhatsApp verification.


## Version 3.8
Admin panel now uses Google Apps Script's `google.script.run` and includes a setup guide for the Google Sheets connection.
