# Company Watch deployment

CareerFlow is a static GitHub Pages app. Company Watch therefore runs in a separate Cloudflare Worker and stores only watch targets, the minimum company identity (`id` and display name), snapshots, and detected events in D1. Existing CareerFlow companies, schedules, documents, and preferences remain in browser storage.

The Worker is required. When `VITE_WATCH_API_URL` is absent, the UI says that monitoring is not configured and never claims that a URL is being monitored. There is no browser timer or Service Worker monitoring fallback.

## Create the service

1. Create a Cloudflare account and install dependencies:

   ```sh
   cd watch-service
   npm install
   npx wrangler login
   npx wrangler d1 create careerflow-watch
   ```

2. Put the returned D1 `database_id` in `watch-service/wrangler.jsonc`. Do not commit account tokens.

3. Create a strong, private access code as a Worker secret:

   ```sh
   npx wrangler secret put WATCH_ACCESS_CODE
   ```

   The value is never stored in the frontend, repository, or Worker variables. The browser exchanges it for a random, expiring session token.

4. Apply the schema and deploy:

   ```sh
   npx wrangler d1 migrations apply careerflow-watch --remote
   npm run check
   npm test
   npm run deploy
   ```

5. Set the public Worker endpoint for the GitHub Pages build:

   ```text
   VITE_WATCH_API_URL=https://careerflow-watch.<subdomain>.workers.dev
   ```

   In GitHub, add this as a repository Actions variable (not a secret because the endpoint is public) and expose it to the existing Vite build. `WATCH_ACCESS_CODE` remains only in Cloudflare.

## Runtime

`17 */6 * * *` invokes the Worker every six hours in UTC. It reads enabled targets from D1, so checks continue with CareerFlow and Safari closed. A manual retry uses the exact same server-side pipeline.

The fetcher accepts only public HTTP(S) pages, checks DNS and every redirect, rejects credentials and unusual ports, honors `robots.txt`, does not retain cookies, and stops on login/restriction pages. It extracts visible page text, removes navigation, scripts, analytics, banners, and labelled generated timestamps, then compares recruitment-relevant lines. A raw HTML hash change alone never creates an event.

The first successful check establishes a baseline without notifying. Later meaningful additions are classified as entry, briefing, internship, deadline, selection, job-information, closure, or another recruitment update. Events are de-duplicated by target, content hash, and category.

## Operational limits

The first version processes up to 12 least-recently checked targets per scheduled invocation to stay within a small personal Worker budget. Pages rendered entirely by client JavaScript may not expose enough public HTML and report `INSUFFICIENT_PUBLIC_CONTENT`. Authentication walls report `LOGIN_REQUIRED` or `ACCESS_RESTRICTED`; the service never attempts to bypass them.
