import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';

// Test the built Worker in workerd, with an isolated, disposable D1 database.
// Run `npm run build` first. This never connects to the deployed application.
const root = fileURLToPath(new URL('../', import.meta.url));
const buildDirectory = path.join(root, 'dist/server');
let config;
try {
  config = JSON.parse(await readFile(path.join(buildDirectory, 'wrangler.json'), 'utf8'));
} catch (error) {
  throw new Error('Build the application with npm run build before checking authentication.', { cause: error });
}
assert.ok(config.d1_databases.some(({ binding }) => binding === 'DB'), 'The Worker needs its DB binding');
const migrationsDirectory = path.join(root, 'drizzle');
const journal = JSON.parse(await readFile(path.join(migrationsDirectory, 'meta/_journal.json'), 'utf8'));
const migrationFiles = journal.entries.map(({ tag }) => `${tag}.sql`);
const sqlFiles = (await readdir(migrationsDirectory)).filter(file => file.endsWith('.sql')).sort();
assert.deepEqual([...migrationFiles].sort(), sqlFiles, 'Every SQL migration must be registered in the deployment journal');
const deploymentMigrationsDirectory = path.join(root, 'dist/.openai/drizzle');
const deploymentJournal = JSON.parse(await readFile(path.join(deploymentMigrationsDirectory, 'meta/_journal.json'), 'utf8'));
assert.deepEqual(deploymentJournal, journal, 'Rebuild: the deployed migration journal must match its source');
const deploymentSqlFiles = (await readdir(deploymentMigrationsDirectory)).filter(file => file.endsWith('.sql')).sort();
assert.deepEqual(deploymentSqlFiles, sqlFiles, 'Rebuild: the deployment must contain every migration');
for (const file of migrationFiles) {
  assert.equal(await readFile(path.join(deploymentMigrationsDirectory, file), 'utf8'),
    await readFile(path.join(migrationsDirectory, file), 'utf8'), `Rebuild: deployed migration ${file} differs from its source`);
}

// The framework uses dynamic imports, so provide the complete built module set.
const mainModule = path.resolve(buildDirectory, config.main);
const modulePaths = (await readdir(buildDirectory, { recursive: true }))
  .filter(file => /\.m?js$/.test(file))
  .map(file => path.join(buildDirectory, file))
  .filter(file => file !== mainModule);
const worker = new Miniflare({
  modules: [mainModule, ...modulePaths].map(modulePath => ({ type: 'ESModule', path: modulePath })),
  modulesRoot: buildDirectory,
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  bindings: config.vars,
  d1Databases: { DB: `auth-check-${randomUUID()}` },
  d1Persist: false,
  cf: false,
  host: '127.0.0.1',
  port: 0,
  inspectorPort: 0,
});

try {
  const base = (await worker.ready).origin;
  const database = await worker.getD1Database('DB');
  // Deployment discovers migrations from this journal; testing all SQL files
  // independently would conceal an unregistered authentication migration.
  for (const file of migrationFiles) {
    const sql = await readFile(path.join(deploymentMigrationsDirectory, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint').map(value => value.trim()).filter(Boolean)) {
      await database.prepare(statement).run();
    }
  }

  async function request(route, { body, cookie, origin = base } = {}) {
    const headers = { Origin: origin };
    if (body) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    return fetch(base + route, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  }

  async function auth(body, expectedStatus, cookie) {
    const response = await request('/api/auth', { body, cookie });
    const payload = await response.json();
    assert.equal(response.status, expectedStatus, `${body.action} returned ${JSON.stringify(payload)}`);
    if (expectedStatus === 200) assert.equal(payload.ok, true);
    return { response, payload };
  }

  function sessionCookie(response) {
    const value = response.headers.get('set-cookie');
    assert.ok(value, 'Successful authentication must issue a session cookie');
    assert.match(value, /^lingayat_session=[A-Za-z0-9_-]+;/);
    assert.match(value, /; HttpOnly(?:;|$)/i);
    assert.match(value, /; Secure(?:;|$)/i);
    assert.match(value, /; SameSite=Lax(?:;|$)/i);
    return value.split(';')[0];
  }

  async function signedIn(cookie, expected) {
    const response = await request('/api/community', { cookie });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.signedIn, expected, 'The session must resolve to the expected signed-in state');
  }

  async function signout(cookie) {
    const { response } = await auth({ action: 'signout' }, 200, cookie);
    assert.match(response.headers.get('set-cookie'), /lingayat_session=;/);
    assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    // Replaying the old cookie proves the server revoked the stored session.
    await signedIn(cookie, false);
  }

  const tag = randomUUID();
  const mobile = `+91${randomInt(7_000_000_000, 10_000_000_000)}`;
  const accounts = [
    { identifier: ` Auth-${tag}@EXAMPLE.TEST `, contact: `auth-${tag}@example.test`, type: 'email' },
    { identifier: `${mobile.slice(0, 3)} ${mobile.slice(3, 8)} ${mobile.slice(8)}`, contact: mobile, type: 'mobile' },
  ];

  await signedIn(undefined, false);
  await signedIn('lingayat_session=invalid-test-token', false);
  for (const account of accounts) {
    const password = `Disposable-${randomUUID()}`;
    const credentials = { identifier: account.identifier, password };
    const signup = await auth({ action: 'signup', ...credentials }, 200);
    const firstCookie = sessionCookie(signup.response);
    await signedIn(firstCookie, true);
    const member = await database.prepare('SELECT id, contact_type, password_hash FROM members WHERE contact = ?').bind(account.contact).first();
    assert.ok(member, 'Signup must persist the normalized contact');
    assert.equal(member.contact_type, account.type);
    // Some local workerd versions do not enforce the deployed Workers limit.
    const [scheme, workFactor] = member.password_hash.split(':');
    assert.equal(scheme, 'pbkdf2');
    assert.ok(Number.isInteger(Number(workFactor)) && Number(workFactor) > 0 && Number(workFactor) <= 100_000,
      'Stored PBKDF2 hashes must respect the Workers limit of 100,000 iterations');
    assert.equal((await auth({ action: 'signup', ...credentials }, 409)).payload.error, 'account-exists');
    await signout(firstCookie);

    const wrongPassword = await auth({ action: 'signin', ...credentials, password: `Wrong-${randomUUID()}` }, 401);
    assert.equal(wrongPassword.payload.error, 'bad-login');
    assert.equal(wrongPassword.response.headers.get('set-cookie'), null);
    const signin = await auth({ action: 'signin', identifier: account.contact, password }, 200);
    const secondCookie = sessionCookie(signin.response);
    assert.notEqual(secondCookie, firstCookie, 'Each login must receive a fresh session');
    await signedIn(secondCookie, true);
    await signout(secondCookie);
  }

  const crossOrigin = await request('/api/auth', { body: { action: 'signout' }, origin: 'https://untrusted.example' });
  assert.equal(crossOrigin.status, 403);
  const sessions = await database.prepare('SELECT COUNT(*) AS count FROM sessions').first();
  assert.equal(sessions.count, 0, 'Signout must remove every session created by this check');
  console.log('PASS: Worker email/mobile signup, normalization, session cookies, duplicate signup, signout/revocation, wrong-password rejection, signin, and origin protection.');
} finally {
  await worker.dispose();
  console.log('Disposable Worker and authentication database removed.');
}
