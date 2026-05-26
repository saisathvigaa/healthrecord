import { ScrollView, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

interface BiomarkerData {
  id: number;
  name: string;
  unit: string;
  currentValue: number;
  referenceMin: number;
  referenceMax: number;
  status: 'normal' | 'warning' | 'abnormal';
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  historicalData: Array<{ date: string; value: number }>;
  interpretation: string;
  recommendation: string;
}

const BIOMARKER_DETAILS: Record<number, BiomarkerData> = {
  0: {
    id: 0,
    name: 'Hemoglobin',
    unit: 'g/dL',
    currentValue: 13.5,
    referenceMin: 13.0,
    referenceMax: 17.0,
    status: 'normal',
    trend: 'stable',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 12.1 },
      { date: 'May 2024', value: 12.8 },
      { date: 'Jun 2024', value: 13.2 },
      { date: 'Jul 2024', value: 13.5 },
      { date: 'Aug 2024', value: 13.4 },
      { date: 'Sep 2024', value: 13.5 },
    ],
    interpretation: 'Your hemoglobin level is within the normal range, indicating healthy oxygen-carrying capacity.',
    recommendation: 'Continue current lifestyle. Maintain regular check-ups every 6 months.',
  },
  1: {
    id: 1,
    name: 'Glucose',
    unit: 'mg/dL',
    currentValue: 95,
    referenceMin: 70,
    referenceMax: 100,
    status: 'normal',
    trend: 'improving',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 105 },
      { date: 'May 2024', value: 102 },
      { date: 'Jun 2024', value: 98 },
      { date: 'Jul 2024', value: 96 },
      { date: 'Aug 2024', value: 95 },
      { date: 'Sep 2024', value: 95 },
    ],
    interpretation: 'Your glucose level is improving and now within the normal range. Great progress!',
    recommendation: 'Keep up with your current diet and exercise routine. Consider consulting your doctor about medication adjustments.',
  },
  2: {
    id: 2,
    name: 'Creatinine',
    unit: 'mg/dL',
    currentValue: 1.1,
    referenceMin: 0.8,
    referenceMax: 1.3,
    status: 'normal',
    trend: 'stable',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 1.05 },
      { date: 'May 2024', value: 1.08 },
      { date: 'Jun 2024', value: 1.1 },
      { date: 'Jul 2024', value: 1.1 },
      { date: 'Aug 2024', value: 1.1 },
      { date: 'Sep 2024', value: 1.1 },
    ],
    interpretation: 'Your kidney function is stable and normal. No concerns at this time.',
    recommendation: 'Maintain adequate hydration and avoid excessive salt intake. Continue regular monitoring.',
  },
  3: {
    id: 3,
    name: 'Cholesterol',
    unit: 'mg/dL',
    currentValue: 210,
    referenceMin: 0,
    referenceMax: 200,
    status: 'warning',
    trend: 'declining',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 245 },
      { date: 'May 2024', value: 235 },
      { date: 'Jun 2024', value: 225 },
      { date: 'Jul 2024', value: 218 },
      { date: 'Aug 2024', value: 212 },
      { date: 'Sep 2024', value: 210 },
    ],
    interpretation: 'Your cholesterol is slightly elevated but trending in the right direction. You\'re making good progress!',
    recommendation: 'Continue with heart-healthy diet (reduce saturated fats). Increase physical activity to 150 min/week. Consult your doctor about medication if needed.',
  },
  4: {
    id: 4,
    name: 'Blood Pressure',
    unit: 'mmHg',
    currentValue: 138,
    referenceMin: 90,
    referenceMax: 120,
    status: 'warning',
    trend: 'stable',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 142 },
      { date: 'May 2024', value: 140 },
      { date: 'Jun 2024', value: 139 },
      { date: 'Jul 2024', value: 138 },
      { date: 'Aug 2024', value: 138 },
      { date: 'Sep 2024', value: 138 },
    ],
    interpretation: 'Your blood pressure is slightly elevated (Stage 1 Hypertension). Lifestyle changes can help.',
    recommendation: 'Reduce sodium intake, increase exercise, manage stress, and limit alcohol. Schedule a doctor visit to discuss treatment options.',
  },
  5: {
    id: 5,
    name: 'Potassium',
    unit: 'mmol/L',
    currentValue: 4.2,
    referenceMin: 3.5,
    referenceMax: 5.1,
    status: 'normal',
    trend: 'stable',
    lastUpdated: '2 days ago',
    historicalData: [
      { date: 'Apr 2024', value: 4.1 },
      { date: 'May 2024', value: 4.15 },
      { date: 'Jun 2024', value: 4.2 },
      { date: 'Jul 2024', value: 4.2 },
      { date: 'Aug 2024', value: 4.2 },
      { date: 'Sep 2024', value: 4.2 },
    ],
    interpretation: 'Your potassium level is normal and well-balanced. Your electrolytes are healthy.',
    recommendation: 'Maintain balanced diet with potassium-rich foods (bananas, spinach, potatoes). Continue regular monitoring.',
  },
};

export default function BiomarkerDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const biomarkerId = parseInt(params.id as string) || 0;
  const biomarker = BIOMARKER_DETAILS[biomarkerId];

  if (!biomarker) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground text-lg">Biomarker not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary font-semibold">Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartData = {
    labels: biomarker.historicalData.map(d => d.date),
    datasets: [
      {
        data: biomarker.historicalData.map(d => d.value),
        color: (opacity = 1) => {
          if (biomarker.status === 'normal') return `rgba(16, 185, 129, ${opacity})`;
          if (biomarker.status === 'warning') return `rgba(245, 158, 11, ${opacity})`;
          return `rgba(239, 68, 68, ${opacity})`;
        },
        strokeWidth: 3,
      },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'abnormal':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving':
        return '📈 Improving';
      case 'declining':
        return '📉 Declining';
      default:
        return '➡️ Stable';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal':
        return 'Normal';
      case 'warning':
        return 'Warning';
      case 'abnormal':
        return 'Abnormal';
      default:
        return 'Unknown';
    }
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-border">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-foreground flex-1 ml-4">{biomarker.name}</Text>
          <Text className="text-xs text-muted">{biomarker.lastUpdated}</Text>
        </View>

        {/* Current Value Card */}
        <View className="px-6 pt-6 pb-4">
          <View
            className="rounded-2xl p-6 border-2"
            style={{
              borderColor: getStatusColor(biomarker.status),
              backgroundColor: `${getStatusColor(biomarker.status)}15`,
            }}
          >
            <View className="flex-row items-baseline justify-between mb-4">
              <View>
                <Text className="text-sm text-muted mb-2">Current Value</Text>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-5xl font-bold text-foreground">{biomarker.currentValue}</Text>
                  <Text className="text-lg text-muted">{biomarker.unit}</Text>
                </View>
              </View>
              <View className="items-center">
                <View
                  className="rounded-full px-3 py-2 mb-2"
                  style={{ backgroundColor: `${getStatusColor(biomarker.status)}30` }}
                >
                  <Text className="font-semibold text-xs" style={{ color: getStatusColor(biomarker.status) }}>
                    {getStatusLabel(biomarker.status)}
                  </Text>
                </View>
                <Text className="text-sm" style={{ color: getStatusColor(biomarker.status) }}>
                  {getTrendText(biomarker.trend)}
                </Text>
              </View>
            </View>

            {/* Reference Range */}
            <View className="bg-white bg-opacity-50 rounded-lg p-3 mt-4">
              <Text className="text-xs text-muted mb-2">Reference Range</Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-foreground">
                  {biomarker.referenceMin} — {biomarker.referenceMax} {biomarker.unit}
                </Text>
                <Text className="text-xs text-muted">Normal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View className="px-6 py-6 bg-surface rounded-2xl mx-6 mb-6 border border-border">
          <Text className="text-lg font-semibold text-foreground mb-4">6-Month Trend</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: getStatusColor(biomarker.status),
              },
            }}
            bezier
            style={{ borderRadius: 16 }}
          />
        </View>

        {/* Interpretation */}
        <View className="px-6 mb-6">
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <Text className="text-sm font-semibold text-blue-900 mb-2">💡 What This Means</Text>
            <Text className="text-sm text-blue-800 leading-relaxed">{biomarker.interpretation}</Text>
          </View>
        </View>

        {/* Recommendation */}
        <View className="px-6 mb-8">
          <View className="bg-green-50 rounded-xl p-4 border border-green-200">
            <Text className="text-sm font-semibold text-green-900 mb-2">✓ Recommendations</Text>
            <Text className="text-sm text-green-800 leading-relaxed">{biomarker.recommendation}</Text>
          </View>
        </View>

        {/* Doctor Consultation CTA */}
        {biomarker.status !== 'normal' && (
          <View className="px-6 pb-8">
            <TouchableOpacity className="bg-primary rounded-xl py-4 items-center">
              <Text className="text-white font-semibold text-lg">📋 Schedule Doctor Visit</Text>
              <Text className="text-white text-xs mt-1">Discuss results with your healthcare provider</Text>
            </TouchableOpacity>
          </View>
        )}

        {biomarker.status === 'normal' && (
          <View className="px-6 pb-8">
            <TouchableOpacity className="bg-green-50 rounded-xl py-4 items-center border-2 border-success">
              <Text className="text-success font-semibold text-lg">✓ Keep It Up!</Text>
              <Text className="text-success text-xs mt-1">Your metric is in great shape</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
