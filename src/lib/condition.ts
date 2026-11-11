export const CHECKLIST_ITEMS = [
  { key: 'battery_health', label: 'Battery' },
  { key: 'screen_grade', label: 'Screen' },
  { key: 'keyboard_grade', label: 'Keyboard' },
  { key: 'hinge_grade', label: 'Hinge' },
  { key: 'ports', label: 'Ports' },
  { key: 'charger', label: 'Charger' },
];

export function suggestCondition(values: Record<string, string | null | undefined>): string | null {
  const grades = CHECKLIST_ITEMS.map((i) => values[i.key]).filter((v) => v === 'good' || v === 'fair' || v === 'poor');
  if (grades.length < 3) return null; // too few checks to suggest anything
  const poor = grades.filter((g) => g === 'poor').length;
  const fair = grades.filter((g) => g === 'fair').length;
  if (poor >= 3) return 'heavily_used';
  if (poor >= 1 || fair >= 4) return 'well_used';
  if (fair >= 1) return 'lightly_used';
  return 'like_new';
}
