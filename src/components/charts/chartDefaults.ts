export const ATISA_COLORS = {
  red: '#d2262c',
  dark: '#1e1e1e',
  charcoal: '#383838',
  muted: '#767676',
  border: '#e5e2db',
  green: '#2d8a5e',
  orange: '#c45c1a',
  purple: '#5b3fa0',
  warm: '#faf9f5',
};

export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        font: { family: 'Heebo', size: 12 },
        color: ATISA_COLORS.dark,
        padding: 16,
        boxWidth: 12,
        boxHeight: 12,
      },
    },
    tooltip: {
      backgroundColor: ATISA_COLORS.dark,
      titleFont: { family: 'Poppins', size: 12, weight: 'bold' as const },
      bodyFont: { family: 'Heebo', size: 12 },
      padding: 10,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      grid: { color: ATISA_COLORS.border },
      ticks: { font: { family: 'Heebo', size: 11 }, color: ATISA_COLORS.muted },
    },
    y: {
      grid: { color: ATISA_COLORS.border },
      ticks: { font: { family: 'Heebo', size: 11 }, color: ATISA_COLORS.muted },
    },
  },
};
