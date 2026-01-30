/**
 * Cores padrão do sistema para consistência visual.
 */
export const CHART_COLORS = {
  emerald: {
    base: '#10b981',
    hover: '#059669',
    light: '#34d399',
  },
  indigo: {
    base: '#6366f1',
    hover: '#4f46e5',
    light: '#818cf8',
  },
  red: {
    base: '#ef4444',
    hover: '#dc2626',
    light: '#f87171',
  },
  amber: {
    base: '#f59e0b',
    hover: '#d97706',
    light: '#fbbf24',
  },
  slate: {
    base: '#64748b',
    hover: '#475569',
    light: '#94a3b8',
  },
};

/**
 * Paleta de cores para gráficos de pizza/rosca.
 */
export const CATEGORY_PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#14b8a6', // Teal
];

/**
 * Configurações comuns de plugins para gráficos.
 */
export const COMMON_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: { size: 12 },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      padding: 12,
      cornerRadius: 8,
      titleFont: { size: 14, weight: 'bold' },
      bodyFont: { size: 13 },
      footerFont: { size: 11, style: 'italic' },
      callbacks: {
        footer: () => 'Clique para ver detalhes',
      },
    },
  },
} as const;
