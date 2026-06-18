# Setup

## Secrets

Cadence reads credentials from `~/.config/cadence-env/.env.local` (loaded by the
Rust backend via dotenv — never bundled into the webview):

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
```

## Google OAuth client

Create credentials in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. **OAuth client type: _Desktop app_.** The desktop type allows the loopback
   redirect (`http://127.0.0.1:<random-port>`) Cadence uses — no fixed redirect
   URI to register. (A "Web application" client would need every loopback port
   pre-registered, which isn't practical.)
2. **Enable APIs** for the project: Google Calendar API, Google Tasks API, Gmail API.
3. **OAuth consent screen**
   - User type: External (or Internal if a Workspace org).
   - Add the scopes Cadence requests:
     - `openid`, `email`, `profile`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/gmail.readonly`
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
