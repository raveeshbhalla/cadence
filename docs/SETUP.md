# Setup

## Secrets

Cadence reads credentials from `~/.config/cadence-env/.env.local` (loaded by the
Rust backend via dotenv — never bundled into the webview):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
```

You can copy `.env.example` as a template. Do not commit real credential values;
`.env` and `.env.*` are ignored. See `SECURITY.md` for token storage, CI, and
release-secret guidance.

## Google OAuth client

Create credentials in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **Use a _Desktop app_ OAuth client (recommended).** Create Credentials →
   OAuth client ID → Application type **Desktop app**. Desktop clients accept
   the loopback redirect (`http://127.0.0.1:8765`) automatically — nothing to
   register, and no `redirect_uri_mismatch`. Put its Client ID + secret in the
   env file.
   - _Alternative — Web application client:_ you must add **exactly**
     `http://127.0.0.1:8765` (no trailing slash) under **Authorized redirect
     URIs**, or Google returns `Error 400: redirect_uri_mismatch`.
2. **Enable APIs** for the project: Google Calendar API, Google Tasks API, Gmail API.
3. **OAuth consent screen**
   - User type: External (or Internal if a Workspace org).
   - Add the scopes Cadence requests:
     - `openid`, `email`, `profile`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/gmail.modify` (read inbox + archive a
       thread when its task is completed)
   - While the app is in **Testing**, add your Google account under **Test users**
     (otherwise consent is blocked).

Tokens (access + refresh) are stored in the macOS **Keychain** under service
`com.cadence.app`. Sign out (clears tokens) is available via the `sign_out` command.

## Run

```bash
pnpm install
pnpm app          # tauri dev — native window
pnpm dev          # browser preview (auth is mocked outside Tauri)
```

On first launch you'll see onboarding → **Continue with Google** opens your
browser for consent; on success the app stores tokens and proceeds. Subsequent
launches skip onboarding while tokens are valid.
