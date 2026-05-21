'use client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BASE_CHART_OPTIONS } from './chartDefaults';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderRadius?: number;
  }>;
  height?: number;
  stacked?: boolean;
}

export default function BarChart({ labels, datasets, height = 280, stacked = false }: BarChartProps) {
  const options = {
    ...BASE_CHART_OPTIONS,
    scales: {
      ...BASE_CHART_OPTIONS.scales,
      x: { ...BASE_CHART_OPTIONS.scales.x, stacked },
      y: { ...BASE_CHART_OPTIONS.scales.y, stacked },
    },
  };

  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: datasets.map(d => ({ ...d, borderRadius: d.borderRadius ?? 4 })) }}
        options={options}
      />
    </div>
  );
}
