import type { Rule } from '@/types/rule';

export function appendNewRules(prev: Rule[], next: Rule[]): Rule[] {
  const keyOf = (r: Rule) => r?.guid ?? r?.uri;
  const seen = new Set(prev.map(keyOf));
  const merged = prev.slice();
  for (const r of next) {
    const k = keyOf(r);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(r);
    }
  }
  return merged;
}
  