const SLUG = 'reschedule-proof';
const API_BASE = import.meta.env.VITE_BILLING_API_URL || 'https://api.sociobot.in/api/v1';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const ONE_DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export function buyUrl(): string {
  return `${API_BASE}/products/${SLUG}/checkout`;
}

export function storeReturnedLicense(): void {
  const url = new URL(location.href);
  const license = url.searchParams.get('license');
  if (!license) return;
  localStorage.setItem(LICENSE_KEY, license);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function saveLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function getLicense(): string {
  return localStorage.getItem(LICENSE_KEY) ?? '';
}

export function cachedUnlocked(): boolean {
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    return verdict.valid;
  } catch {
    return false;
  }
}

export async function verifyLicense(force = false): Promise<Verdict> {
  const license = getLicense();
  if (!license) return { valid: false, checkedAt: Date.now(), reason: 'missing' };
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict;
    if (!force && Date.now() - cached.checkedAt < ONE_DAY) return cached;
  } catch { /* verify below */ }
  const response = await fetch(`${API_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(license)}`);
  if (!response.ok) throw new Error('License service is unavailable.');
  const result = await response.json() as { valid: boolean; reason?: string };
  const verdict = { valid: result.valid, reason: result.reason, checkedAt: Date.now() };
  localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
  return verdict;
}
