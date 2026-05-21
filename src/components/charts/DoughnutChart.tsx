'use client';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { ATISA_COLORS } from './chartDefaults';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  height?: number;
}

export default function DoughnutChart({ labels, data, colors, height = 260 }: DoughnutChartProps) {
  return (
    <div style={{ height, display: 'flex', justifyContent: 'center' }}>
      <Doughnut
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff',
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom' as const,
              labels: {
                font: { family: 'Heebo', size: 12 },
                color: ATISA_COLORS.dark,
                padding: 12,
                boxWidth: 12,
                boxHeight: 12,
              },
            },
            tooltip: {
              backgroundColor: ATISA_COLORS.dark,
              bodyFont: { family: 'Heebo', size: 12 },
              padding: 10,
              cornerRadius: 6,
            },
          },
        }}
      />
    </div>
  );
}
