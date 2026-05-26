import { View, Text, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface DataPoint {
  value: number;
  date: string;
}

interface MicroChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  color?: string;
}

export function MicroChart({ data, height = 60, width = 100, color }: MicroChartProps) {
  const colors = useColors();
  const chartColor = color || colors.primary;

  if (!data || data.length === 0) {
    return (
      <View style={{ height, width }} className="bg-surface rounded-lg items-center justify-center">
        <Text className="text-xs text-muted">No data</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1 || 1)) * (width - 8);
    const y = height - 8 - ((value - minValue) / range) * (height - 16);
    return { x, y, value };
  });

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <View style={{ height, width }} className="bg-surface rounded-lg items-center justify-center overflow-hidden">
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={chartColor}
          strokeWidth="2"
        />
        <circle cx={points[points.length - 1]?.x} cy={points[points.length - 1]?.y} r="2" fill={chartColor} />
      </svg>
    </View>
  );
}
