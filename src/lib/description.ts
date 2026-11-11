export type DescStyle = 'simple' | 'bullets' | 'own';

type Details = {
  brand?: string;
  model?: string;
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  screen_size?: number | string | null;
  notes?: string;
};

export function buildDescription(style: DescStyle, d: Details): string {
  if (style === 'own') return '';
  const name = [d.brand, d.model].filter(Boolean).join(' ') || 'laptop';
  const notes = d.notes ? d.notes.trim() : '';

  if (style === 'simple') {
    const specs = [d.cpu, d.ram ? d.ram + ' RAM' : '', d.storage, d.screen_size ? d.screen_size + ' inch screen' : '']
      .filter(Boolean)
      .join(', ');
    return ('Selling my ' + name + (specs ? ' with ' + specs : '') + '. ' + notes).trim();
  }

  const lines = [
    name + ' for sale',
    '',
    d.cpu ? '- CPU: ' + d.cpu : '',
    d.gpu ? '- GPU: ' + d.gpu : '',
    d.ram ? '- RAM: ' + d.ram : '',
    d.storage ? '- Storage: ' + d.storage : '',
    d.screen_size ? '- Screen: ' + d.screen_size + ' inch' : '',
    notes ? '- Notes: ' + notes : '',
  ];
  return lines.filter((l, i) => i < 2 || l !== '').join('\n');
}
