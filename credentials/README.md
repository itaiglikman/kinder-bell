# Credentials Directory

This directory contains Google OAuth credentials for accessing Google Calendar API.

## Required Files

### 1. `credentials.json`
- Download from Google Cloud Console
- OAuth 2.0 Client ID for Desktop Application
- **NEVER commit this file to git** (it's in .gitignore)

### 2. `token.json`
- Generated automatically on first run
- Contains OAuth access and refresh tokens
- **NEVER commit this file to git** (it's in .gitignore)

## Setup Instructions

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 Client ID (Desktop App)
5. Download credentials JSON file
6. Save it here as `credentials.json`

## First Run

On first run, the application will:
1. Read `credentials.json`
2. Open authorization URL in browser
3. Ask you to paste authorization code
4. Save access token to `token.json`

Subsequent runs will use `token.json` automatically.
