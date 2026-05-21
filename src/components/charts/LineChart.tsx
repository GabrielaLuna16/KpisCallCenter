'use client';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BASE_CHART_OPTIONS } from './chartDefaults';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
    fill?: boolean;
    tension?: number;
  }>;
  height?: number;
}

export default function LineChart({ labels, datasets, height = 280 }: LineChartProps) {
  return (
    <div style={{ height }}>
      <Line
        data={{ labels, datasets: datasets.map(d => ({ tension: 0.3, ...d })) }}
        options={BASE_CHART_OPTIONS}
      />
    </div>
  );
}
