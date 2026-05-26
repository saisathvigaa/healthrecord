import { ScrollView, Text, View, Dimensions } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { LineChart } from 'react-native-chart-kit';
import { biomarkersWithCharts, getChartData } from '@/lib/enhanced-mock-data';

const screenWidth = Dimensions.get('window').width;

export default function ChartsScreen() {
  const colors = useColors();

  const chartConfig = {
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    color: () => colors.primary,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fontSize: 12,
      fill: colors.muted,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5, 5',
      stroke: colors.border,
      strokeWidth: 0.5,
    },
  };

  const getStatusColor = (value: number, min: number, max: number) => {
    if (value < min || value > max) return colors.error;
    if (Math.abs(value - min) < 2 || Math.abs(value - max) < 2) return colors.warning;
    return colors.success;
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">Patient Medical History</Text>
          <Text className="text-sm text-muted mt-1">Comprehensive Health Record</Text>
        </View>

        {/* Charts Grid */}
        <View className="px-3 pb-6">
          {biomarkersWithCharts.map((biomarker, index) => {
            const chartData = getChartData(biomarker.id);
            if (!chartData) return null;

            const latestValue = biomarker.readings[biomarker.readings.length - 1].value;
            const statusColor = getStatusColor(latestValue, biomarker.referenceMin, biomarker.referenceMax);

            return (
              <View
                key={biomarker.id}
                className="bg-surface rounded-2xl p-4 mb-4 border border-border"
              >
                {/* Biomarker Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      {biomarker.name}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {biomarker.unit}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      Reference: {biomarker.referenceMin} — {biomarker.referenceMax} {biomarker.unit}
                    </Text>
                  </View>
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: statusColor }}
                  >
                    <Text className="text-lg font-bold text-white">
                      {latestValue}
                    </Text>
                  </View>
                </View>

                {/* Chart */}
                <View className="bg-background rounded-lg overflow-hidden">
                  <LineChart
                    data={{
                      labels: chartData.labels,
                      datasets: [
                        {
                          data: chartData.datasets[0].data,
                          strokeWidth: 3,
                          color: () => biomarker.color,
                        },
                      ],
                    }}
                    width={screenWidth - 48}
                    height={220}
                    chartConfig={{
                      ...chartConfig,
                      color: () => biomarker.color,
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      marginHorizontal: -8,
                    }}
                    withDots={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    segments={4}
                  />
                </View>

                {/* Status Indicator */}
                <View className="mt-3 flex-row items-center gap-2">
                  <View
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                  <Text className="text-xs text-muted">
                    {latestValue < biomarker.referenceMin || latestValue > biomarker.referenceMax
                      ? 'Outside reference range'
                      : 'Within normal range'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="h-20" />
      </ScrollView>
    </ScreenContainer>
  );
}
