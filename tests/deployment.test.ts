import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface RouteConfig { route: string; headers?: Record<string, string> }

const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
  globalHeaders: Record<string, string>;
  mimeTypes: Record<string, string>;
  routes: (RouteConfig & { rewrite?: string })[];
  responseOverrides: Record<string, { rewrite: string }>;
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

  it('serves the demo as an app route and unknown paths through the designed 404 response', () => {
    expect(config.routes.find(({ route }) => route === '/demo')?.rewrite).toBe('/index.html');
    expect(config.responseOverrides['404']?.rewrite).toBe('/404/index.html');
    expect(readFileSync('404/index.html', 'utf8')).toContain('<title>Page not found — Move Confirmed</title>');
    expect(readFileSync('public/robots.txt', 'utf8')).toContain('sitemap.xml');
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain('/demo');
  });

  it('lists every claim exactly once in the browser suite', () => {
    const claims = JSON.parse(readFileSync('.factory/claims.json', 'utf8')) as { id: string; test: string }[];
    const browserSources = [readFileSync('tests/e2e/app.spec.ts', 'utf8'), readFileSync('tests/e2e/claims.spec.ts', 'utf8')].join('\n');
    for (const claim of claims) {
      expect(claim.test).toBe(`npm run test:e2e -- --grep @claim:${claim.id}`);
      expect(browserSources.match(new RegExp(`@claim:${claim.id}(?![a-z-])`, 'g'))).toHaveLength(1);
    }
  });

  it('ships route-specific discovery and social metadata', () => {
    for (const file of ['index.html', 'privacy/index.html', 'terms/index.html']) {
      const html = readFileSync(file, 'utf8');
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain('rel="apple-touch-icon"');
    }
  });
});
