# Lingayat Shadi

A free English–Marathi matrimony application for Hindu Lingayat adults (21+).

## Features
- Responsive burgundy and gold interface, original illustrative wedding photograph, and persistent language preference.
- Member sign-in with mobile number or email ID plus password.
- Persistent D1 profiles, independently fetched shortlists, and interest requests.
- Contact emails are omitted from browsing and revealed to both participants only after acceptance.
- Profile photos in Supabase Storage; browser normalization and server metadata removal.
- Profile visibility controls and profile/data deletion.
- Subcommunities supplied by the owner: Pancham/Panchamasali, Jangam, Banajiga/Vani, Dixivant/Dikshavant, Chilivant/Chilwants, Koshti/Padmasali, Hatkar/Bandgar, Mali, Teli, Vanjari, Sutar, Panchal. Other/self-description and undisclosed options are available.
- Clearly labeled fictional examples when there are no member profiles to display.

## Run locally

Use Node.js 22.13+ and npm. Run `npm ci`, then `npm run dev -- --port 5183`.
Members create an account with a mobile number or email ID plus password.

Generate migrations with `npm run db:generate`. Build with `npm run build` before applying local migrations through Wrangler using `dist/server/wrangler.json` and `.wrangler/state`. Apply the SQL files in `drizzle/` exactly once, in numerical order. Production migrations are applied by Sites during deployment.

## Verification

- `node node_modules/typescript/bin/tsc --noEmit`
- `npm run build`
- Start the built Worker with `npm start -- --port 5184` and run `node scripts/check-community.mjs`. This loopback-only integration check creates and removes disposable local profiles; it covers authorization, consent/age validation, profile persistence, shortlists, reciprocal interest protection, acceptance/contact privacy, photo metadata removal, profile visibility, and CSRF protection.

The local Worker test supplies simulated dispatcher identity headers. Never expose that local test server on a public interface. Production authentication is owned by the hosting platform.

## Supabase photo storage

Create a private Supabase Storage bucket named `profile-photos`, then add these runtime variables to the Cloudflare Worker:

- `SUPABASE_URL` - your Supabase project URL, for example `https://example.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` - server-only service role key; never expose it in browser code
- `SUPABASE_STORAGE_BUCKET` - optional bucket name, defaults to `profile-photos`

The app keeps member/profile data in D1 and stores only the private photo object path in D1.

## Publication

Site identity and logical storage bindings are in `.openai/hosting.json`. Publish through the Sites workflow. The initial deployment is private to its owner for review. All member features have no payment flow or paid membership tier. External hosting or custom-domain billing is separate from membership pricing.

The profile directory currently shows the newest 250 visible profiles. Shortlists are fetched separately. Profiles are self-reported; there is no identity verification or moderation dashboard. Uploaded photos and account contact email require signed-in access. Future public launch operations should establish member support and moderation ownership.
