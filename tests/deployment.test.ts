import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface RouteConfig { route: string; headers?: Record<string, string> }

const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: RouteConfig[];
};

const workerSource = readFileSync('public/sw.js', 'utf8');
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as { start_url: string };

describe('production response policy', () => {
  it('ships framing, origin isolation, content type, and CSP protections', () => {
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'");
    expect(config.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(config.globalHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });

  it('gives built assets immutable caching while service-worker updates revalidate', () => {
    const assets = config.routes.find(({ route }) => route === '/assets/*');
    const worker = config.routes.find(({ route }) => route === '/sw.js');
    expect(assets?.headers?.['Cache-Control']).toBe('public, max-age=31536000, immutable');
    expect(worker?.headers?.['Cache-Control']).toBe('no-cache');
  });

  it('keeps the installed-app start version aligned with the versioned worker cache', () => {
    const version = workerSource.match(/const VERSION = 'move-confirmed-v(\d+)'/)?.[1];
    expect(version).toBeTruthy();
    expect(manifest.start_url).toBe(`/?v=${version}`);
  });
});
