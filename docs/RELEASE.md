# Release

Cadence release versions are determined by Git tags. The app update check compares the installed `package.json` version with the latest GitHub release tag, and Tauri packages the version from `src-tauri/tauri.conf.json`. During release builds, CI writes the tag version into the app manifests before packaging.

## Ship a New Version

1. Tag the commit you want to release and push the tag:

   ```sh
   git checkout main
   git pull
   git tag v0.1.1
   git push origin v0.1.1
   ```

2. The `Release` workflow sets the app version from the tag, builds the macOS DMG, creates the GitHub release if needed, and uploads the DMG.

The release workflow fails if the tag cannot be converted to a semver app version or if the generated manifest versions do not match the tag.

To rebuild or upload assets for an existing tag, run the `Release` workflow manually and provide the tag in `release_tag`.
