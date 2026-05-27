import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { LineChart } from 'react-native-chart-kit';
import { trpc } from '@/lib/trpc';
import { useState, useMemo } from 'react';

const screenWidth = Dimensions.get('window').width;

export default function ChartsRealScreen() {
  const colors = useColors();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'abnormal'>('all');
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  // Fetch biomarker readings from database
  const { data: readings, isLoading } = trpc.biomarkers.getReadings.useQuery(
    { timeRange },
    { enabled: true }
  );

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

  const getStatusLabel = (value: number, min: number, max: number) => {
    if (value < min || value > max) return 'abnormal';
    if (Math.abs(value - min) < 2 || Math.abs(value - max) < 2) return 'warning';
    return 'normal';
  };

  // Group readings by biomarker and filter
  const groupedReadings = useMemo(() => {
    if (!readings) return {};

    const grouped: Record<string, any[]> = {};
    readings.forEach((reading: any) => {
      if (!grouped[reading.biomarkerName]) {
        grouped[reading.biomarkerName] = [];
      }
      grouped[reading.biomarkerName].push(reading);
    });

    return grouped;
  }, [readings]);

  // Filter biomarkers based on search and status
  const filteredBiomarkers = useMemo(() => {
    return Object.entries(groupedReadings)
      .filter(([name]) => name.toLowerCase().includes(searchText.toLowerCase()))
      .filter(([name, data]) => {
        if (filterStatus === 'all') return true;
        if (data.length === 0) return false;
        const latestValue = data[data.length - 1].value;
        const status = getStatusLabel(latestValue, data[0].referenceMin, data[0].referenceMax);
        return status === filterStatus;
      });
  }, [groupedReadings, searchText, filterStatus]);

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">Your Health Trends</Text>
          <Text className="text-sm text-muted mt-1">Track your biomarker progress</Text>
        </View>

        {/* Search Bar */}
        <View className="px-6 mb-4">
          <TextInput
            placeholder="Search biomarkers..."
            value={searchText}
            onChangeText={setSearchText}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* Filter Buttons */}
        <View className="px-6 mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Filter by Status</Text>
          <View className="flex-row gap-2">
            {(['all', 'normal', 'warning', 'abnormal'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status)}
                className={`flex-1 py-2 px-3 rounded-lg ${
                  filterStatus === status
                    ? 'bg-primary'
                    : 'bg-surface border border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold text-center capitalize ${
                    filterStatus === status ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Range Buttons */}
        <View className="px-6 mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Time Range</Text>
          <View className="flex-row gap-2">
            {(['3m', '6m', '1y', 'all'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setTimeRange(range)}
                className={`flex-1 py-2 px-3 rounded-lg ${
                  timeRange === range
                    ? 'bg-primary'
                    : 'bg-surface border border-border'
                }`}
              >
                <Text
                  className={`text-xs font-semibold text-center ${
                    timeRange === range ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Charts Grid */}
        <View className="px-3 pb-6">
          {filteredBiomarkers.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Text className="text-lg text-muted">No biomarkers found</Text>
              <Text className="text-sm text-muted mt-2">Upload a health report to get started</Text>
            </View>
          ) : (
            filteredBiomarkers.map(([biomarkerName, data]) => {
              if (data.length === 0) return null;

              const latestValue = data[data.length - 1].value;
              const referenceMin = data[0].referenceMin;
              const referenceMax = data[0].referenceMax;
              const statusColor = getStatusColor(latestValue, referenceMin, referenceMax);
              const status = getStatusLabel(latestValue, referenceMin, referenceMax);

              // Prepare chart data
              const chartData = {
                labels: data.slice(-6).map((d: any) => {
                  const date = new Date(d.date);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }),
                datasets: [
                  {
                    data: data.slice(-6).map((d: any) => d.value),
                    color: () => statusColor,
                    strokeWidth: 2,
                  },
                ],
              };

              return (
                <View
                  key={biomarkerName}
                  className="bg-surface rounded-2xl p-4 mb-4 border border-border"
                >
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-foreground">{biomarkerName}</Text>
                      <Text className="text-xs text-muted mt-1">
                        Ref: {referenceMin} - {referenceMax}
                      </Text>
                    </View>
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: statusColor + '20' }}
                    >
                      <Text className="text-xs font-semibold capitalize" style={{ color: statusColor }}>
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Current Value */}
                  <View className="mb-4">
                    <Text className="text-4xl font-bold text-foreground">{latestValue}</Text>
                    <Text className="text-sm text-muted mt-1">{data[0].unit}</Text>
                  </View>

                  {/* Chart */}
                  {data.length > 1 && (
                    <LineChart
                      data={chartData}
                      width={screenWidth - 48}
                      height={200}
                      chartConfig={chartConfig}
                      bezier
                      style={{ marginLeft: -16, marginRight: -16 }}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
