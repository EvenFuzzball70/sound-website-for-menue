# SOUND menu website

A standalone public catalog for SOUND's Instagram bio link.

## Cloudflare Worker deployment

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages** and choose **Create application**.
3. Choose **Workers**, then deploy from an existing GitHub repository if that option is available. Select `EvenFuzzball70/sound-website-for-menue` and the `main` branch.
4. If Cloudflare asks for a build command, leave it empty. The repository is plain HTML and needs no build.
5. The Worker name should be `sound-menu`, matching `wrangler.toml`.
6. Deploy, then open the generated `*.workers.dev` URL.
7. Add a custom domain such as `menu.soundcafe.app` from the Worker's **Settings > Domains & Routes**.

CLI alternative:

```bash
npm install
npx wrangler login
npx wrangler deploy
```

The existing `sound-project-done-and-paid` repository is a separate internal management system and must not be replaced by this menu site. It contains the older `sound` Worker configuration and D1-backed payroll/expenses application.

## Included

- PS5, gaming PC and VIP PC room catalog
- Cinema, billiards, café and restaurant sections
- English/Arabic language switch with RTL support
- Responsive mobile-first layout
- No prices, hardware specifications, booking flow or contact details invented
