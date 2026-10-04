# Lingayat Shadi

A free English–Marathi matrimony application for Hindu Lingayat adults (21+).

## Features
- Responsive burgundy and gold interface, original illustrative wedding photograph, and persistent language preference.
- Platform-provided ChatGPT sign-in; production identity is supplied by the Sites dispatcher.
- Persistent D1 profiles, independently fetched shortlists, and interest requests.
- Contact emails are omitted from browsing and revealed to both participants only after acceptance.
- Profile photos in R2; browser normalization and server metadata removal.
- Profile visibility controls and profile/data deletion.
- Subcommunities supplied by the owner: Pancham/Panchamasali, Jangam, Banajiga/Vani, Dixivant/Dikshavant, Chilivant/Chilwants, Koshti/Padmasali, Hatkar/Bandgar, Mali, Teli, Vanjari, Sutar, Panchal. Other/self-description and undisclosed options are available.
- Clearly labeled fictional examples when there are no member profiles to display.

## Run locally

Use Node.js 22.13+ and npm. Run `npm ci`, then `npm run dev -- --port 5183`.
The portable starter simulates sign-in locally at `/signin-with-chatgpt?return_to=/`; this mock identity is not part of the production build.

Generate migrations with `npm run db:generate`. Build with `npm run build` before applying local migrations through Wrangler using `dist/server/wrangler.json` and `.wrangler/state`. Apply the SQL files in `drizzle/` exactly once, in numerical order. Production migrations are applied by Sites during deployment.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run build`
- Start the built Worker with `npm start -- --port 5184` and run `node scripts/check-community.mjs`. This loopback-only integration check creates and removes disposable local profiles; it covers authorization, consent/age validation, profile persistence, shortlists, reciprocal interest protection, acceptance/contact privacy, photo metadata removal, profile visibility, and CSRF protection.

The local Worker test supplies simulated dispatcher identity headers. Never expose that local test server on a public interface. Production authentication is owned by the hosting platform.

## Publication

Site identity and logical storage bindings are in `.openai/hosting.json`. Publish through the Sites workflow. The initial deployment is private to its owner for review. All member features have no payment flow or paid membership tier. External hosting or custom-domain billing is separate from membership pricing.

The profile directory currently shows the newest 250 visible profiles. Shortlists are fetched separately. Profiles are self-reported; there is no identity verification or moderation dashboard. Uploaded photos and account contact email require signed-in access. Future public launch operations should establish member support and moderation ownership.
