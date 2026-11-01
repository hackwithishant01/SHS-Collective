# SHS Collective

A Next.js storefront for SHS Collective, with a PostgreSQL catalogue, stock,
orders, and owner dashboard.

## Local development

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

The local development database uses PGlite. Open
[http://localhost:3000](http://localhost:3000).

Run the checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Temporary owner-review deployment on Render

The root `render.yaml` Blueprint creates a free Render web service and a free
PostgreSQL database in Singapore. It applies the database migrations on startup
and serves the four supplied product listings and their bundled photos. This
is a temporary review environment, not a production store:

- Free web services can sleep when idle and take about a minute to wake up.
- Free PostgreSQL expires after 30 days and has no backups. Export anything you
  need before it expires.
- The web service has an ephemeral filesystem. Product photos bundled in
  `public/` are retained in deploys, but photos uploaded through the owner
  dashboard are not durable and may disappear on restart or deploy.
- No payment provider is configured. Do not treat this preview as a live shop.

### Deploy

1. Keep the GitHub repository **private**. Create a private repository and push
   this project to it using your own GitHub account. Do not include `.env` files,
   passwords, database URLs, or other secrets.
2. In [Render](https://dashboard.render.com), choose **New → Blueprint** and
   connect your private repository. Select the root `render.yaml`, choose the
   free plans, and create the resources in the same Singapore region.
3. Wait for the first deployment to finish. Render shows the public preview
   URL on the web service page.
4. If the owner needs dashboard access, open the web service's **Environment**
   settings and add `ADMIN_EMAIL` and `ADMIN_PASSWORD` as secret environment
   variables. Use an owner email and a unique password of at least 12
   characters. Save and deploy; the startup command creates the owner account
   once. After a successful deployment, remove both variables and deploy again.
   The account remains in PostgreSQL.
5. Send the preview URL to the owner. Free services can take about a minute to
   respond after being idle.

Never put credentials in this repository or share them in chat. The review
database is temporary; do not enter real customer information.
