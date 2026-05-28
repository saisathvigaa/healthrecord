import { ScrollView, Text, View, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

type Reading = {
  id: number;
  value: string;
  status: string;
  readingDate: string | Date | null;
  biomarkerName: string | null;
  unit: string | null;
};

type BiomarkerGroup = {
  name: string;
  unit: string;
  readings: { value: number; date: string }[];
  latestStatus: string;
};

function groupByBiomarker(readings: Reading[]): BiomarkerGroup[] {
  const map = new Map<string, BiomarkerGroup>();
  // readings come newest-first from DB; reverse for chronological charts
  const chronological = [...readings].reverse();
  for (const r of chronological) {
    const name = r.biomarkerName ?? 'Unknown';
    const numVal = parseFloat(r.value);
    if (isNaN(numVal)) continue;
    if (!map.has(name)) {
      map.set(name, { name, unit: r.unit ?? '', readings: [], latestStatus: r.status ?? 'unknown' });
    }
    const group = map.get(name)!;
    const dateStr = r.readingDate
      ? new Date(r.readingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';
    group.readings.push({ value: numVal, date: dateStr });
    // last one added is newest (since we reversed)
    group.latestStatus = r.status ?? 'unknown';
  }
  return Array.from(map.values());
}

export default function ChartsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: readings, isLoading, refetch, error: readingsError } = trpc.readings.list.useQuery(
    undefined,
    { enabled: isAuthenticated, retry: 1 }
  );

  useFocusEffect(useCallback(() => {
    if (isAuthenticated) refetch();
  }, [isAuthenticated]));

  const statusColor = (s: string) =>
    s === 'normal' ? colors.success : s === 'warning' ? colors.warning : s === 'abnormal' ? colors.error : colors.muted;
  const statusBg = (s: string) =>
    s === 'normal' ? '#D1FAE5' : s === 'warning' ? '#FEF3C7' : s === 'abnormal' ? '#FEE2E2' : '#F3F4F6';
  const statusLabel = (s: string) =>
    s === 'normal' ? 'Normal' : s === 'warning' ? 'Warning' : s === 'abnormal' ? 'Abnormal' : 'Unknown';

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 102, 204, ${opacity})`,
    strokeWidth: 2,
    propsForLabels: { fontSize: 10, fill: colors.muted },
    propsForBackgroundLines: { strokeDasharray: '4, 4', stroke: '#e5e7eb', strokeWidth: 0.5 },
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' }}>Sign in to view charts</Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Sign In</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: '#888', marginTop: 12 }}>Loading your data…</Text>
      </ScreenContainer>
    );
  }

  if (readingsError) {
    return (
      <ScreenContainer style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 8 }}>
          Could not load data
        </Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 }}>
          {readingsError.message}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const groups = groupByBiomarker((readings ?? []) as Reading[]);

  if (groups.length === 0) {
    return (
      <ScreenContainer style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📈</Text>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' }}>No data yet</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8, maxWidth: 280 }}>
          Upload a lab report to see your biomarker trends here.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/upload')}
          style={{ marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>📤 Upload Report</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#fff' }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111' }}>Trends</Text>
          <Text style={{ fontSize: 14, color: '#888', marginTop: 2 }}>
            {groups.length} biomarker{groups.length !== 1 ? 's' : ''} tracked
            {groups.some(g => g.readings.length > 1) ? ' · Upload more reports to see trends' : ' · Upload more reports to see trends'}
          </Text>
        </View>

        {/* Biomarker cards */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {groups.map((group) => {
            const latest = group.readings[group.readings.length - 1];
            const hasMultiple = group.readings.length >= 2;

            return (
              <View
                key={group.name}
                style={{ backgroundColor: '#f9fafb', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' }}
              >
                {/* Card header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111' }}>{group.name}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{group.unit || 'no unit'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#111' }}>{latest.value}</Text>
                    <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: statusBg(group.latestStatus) }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor(group.latestStatus) }}>
                        {statusLabel(group.latestStatus)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Line chart — only when 2+ readings */}
                {hasMultiple && (
                  <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' }}>
                    <LineChart
                      data={{
                        labels: group.readings.map(r => r.date),
                        datasets: [{ data: group.readings.map(r => r.value), strokeWidth: 2 }],
                      }}
                      width={screenWidth - 64}
                      height={160}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => statusColor(group.latestStatus).replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
                      }}
                      bezier
                      withDots={true}
                      withInnerLines={false}
                      withOuterLines={true}
                      withVerticalLines={false}
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                )}

                {/* Single reading — show a simple timeline note */}
                {!hasMultiple && (
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 12, color: '#1e40af' }}>
                      📅 Recorded on {latest.date} · Upload another report to track trend
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Upload more CTA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>📤 Upload Another Report</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}
