# Security

## Secrets

Cadence does not require committed secrets. Runtime credentials are loaded by
the Rust backend from `~/.config/cadence-env/.env.local`, with project-local
`.env` files supported only for development convenience.

Expected local variables:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
```

Never commit real values for those variables. The repository tracks
`.env.example` as a template and ignores `.env` / `.env.*`.

The backend does not forward these credential values to the React webview.

## User Tokens

Google OAuth uses a loopback redirect and PKCE. In release builds, access and
refresh tokens are stored in macOS Keychain under the service
`com.cadence.app`. In debug builds, tokens are stored at
`~/.config/cadence/tokens.json` with `0600` permissions so local development
does not repeatedly trigger Keychain prompts.

The frontend receives account metadata such as the signed-in email address, not
raw access or refresh tokens.

## Distribution

Do not embed a shared OpenAI API key in the app, GitHub Actions, or release
artifacts. Public distribution should either require each user to provide their
own key or route OpenAI calls through a backend with billing and abuse controls.

Google Desktop OAuth client secrets are not strong secrets once an app is
distributed. Keep them out of the repository, but rely on PKCE, redirect
restrictions, Google's token exchange, and OAuth consent review for the actual
security boundary.

## CI and Releases

Current PR DMG builds do not use application secrets. If release signing,
notarization, or updater signing is added later, store those values as GitHub
encrypted secrets, preferably on a protected environment that does not run for
untrusted pull request code.
