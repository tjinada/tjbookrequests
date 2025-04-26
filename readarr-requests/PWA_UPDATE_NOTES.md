# PWA White Screen Recovery Update

This update adds several improvements to handle and prevent white screens in the Progressive Web App (PWA).

## Key Changes

1. **Temporary No-Cache Headers (Nginx)**
   - Added strict no-cache headers to the Nginx configuration
   - This will force all users to download the latest version, bypassing any cached versions
   - **Note: These headers should be removed after 2-4 weeks** once most users have been updated

2. **Automatic White Screen Recovery**
   - Added a recovery script in index.html that runs before the app loads
   - Detects white screens and automatically fixes them
   - Provides a manual recovery button if automatic recovery fails

3. **User-Controlled Updates**
   - Added a "Refresh App" button in the Profile page
   - Allows users to manually clear caches and get the latest version

## How to Remove Temporary No-Cache Headers

After 2-4 weeks (when most users have updated), edit the `frontend/Dockerfile` and remove these lines:

```diff
-    # TEMPORARY (Remove after ~2-4 weeks): Force no caching globally to recover users with white screens \
-    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
-    add_header Pragma "no-cache"; \
-    expires -1; \
```

Then rebuild and deploy:

```bash
docker-compose build
docker-compose up -d
```

## How Users Can Manually Fix White Screens

If a user reports a white screen and none of the automatic recovery methods work, they can try:

1. Open their browser settings
2. Find the application/site data section
3. Clear data for your app's domain
4. Reload the app

For Chrome/Android users, they can also go to: chrome://serviceworker-internals/ and unregister the service worker for your domain.
