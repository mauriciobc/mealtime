#!/usr/bin/env node
/**
 * Manage Netlify Preview Servers (dev_servers API) via netlify-cli.
 *
 * Usage:
 *   node scripts/netlify-preview-server.mjs list
 *   node scripts/netlify-preview-server.mjs start <branch>
 *   node scripts/netlify-preview-server.mjs stop <branch>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STATE_FILE = resolve(ROOT, '.netlify/state.json');

function getSiteId() {
  if (process.env.NETLIFY_SITE_ID) return process.env.NETLIFY_SITE_ID;
  if (!existsSync(STATE_FILE)) {
    console.error('Site not linked. Run: npx netlify link');
    process.exit(1);
  }
  const { siteId } = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  if (!siteId) {
    console.error('Missing siteId in .netlify/state.json. Run: npx netlify link');
    process.exit(1);
  }
  return siteId;
}

function netlifyApi(method, data = {}) {
  const output = execFileSync(
    'npx',
    ['netlify', 'api', method, '--data', JSON.stringify(data)],
    { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
  return JSON.parse(output || '[]');
}

const [command, branch] = process.argv.slice(2);
const siteId = getSiteId();

switch (command) {
  case 'list': {
    const servers = netlifyApi('listSiteDevServers', { site_id: siteId });
    if (!servers.length) {
      console.log('No Preview Servers found.');
      break;
    }
    for (const s of servers) {
      console.log(`${s.branch}\t${s.state}\t${s.url ?? '—'}`);
    }
    break;
  }
  case 'start': {
    if (!branch) {
      console.error('Usage: netlify:preview-server:start <branch>');
      process.exit(1);
    }
    const servers = netlifyApi('createSiteDevServer', { site_id: siteId, branch });
    const created = Array.isArray(servers) ? servers[0] : servers;
    console.log('Preview Server requested.');
    console.log(`  branch: ${branch}`);
    console.log(`  state:  ${created?.state ?? 'starting'}`);
    console.log(`  url:    ${created?.url ?? `https://devserver-${branch.replace(/\//g, '-')}--meowtime.netlify.app`}`);
    console.log('\nMonitor in Netlify UI: Deploys → Preview Servers');
    break;
  }
  case 'stop': {
    if (!branch) {
      console.error('Usage: netlify:preview-server:stop <branch>');
      process.exit(1);
    }
    try {
      execFileSync(
        'npx',
        ['netlify', 'api', 'deleteSiteDevServers', '--data', JSON.stringify({ site_id: siteId, branch })],
        { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' },
      );
    } catch (error) {
      // Netlify returns 202 Accepted for async stop — treat as success
      const stderr = error?.stderr ?? '';
      if (!String(stderr).includes('Accepted') && error?.status !== 0) {
        throw error;
      }
    }
    console.log(`Preview Server stopped for branch: ${branch}`);
    break;
  }
  default:
    console.error(`Unknown command: ${command ?? '(none)'}`);
    console.error('Commands: list | start <branch> | stop <branch>');
    process.exit(1);
}
