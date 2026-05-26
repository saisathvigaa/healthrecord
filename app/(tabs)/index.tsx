import { ScrollView, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/constants/oauth';
import { mockBiomarkers, mockReports, generateMockReadings } from '@/lib/mock-data';

export default function DashboardScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [demoMode, setDemoMode] = useState(false);

  const isLoading = authLoading && !demoMode;
  const showDashboard = isAuthenticated || demoMode;

  const allReadings = useMemo(() => {
    const readings: any[] = [];
    mockBiomarkers.forEach((biomarker) => {
      const biomarkerReadings = generateMockReadings(biomarker.id, 6);
      readings.push(...biomarkerReadings);
    });
    return readings;
  }, []);

  const latestReadings = useMemo(() => {
    const grouped: Record<number, (typeof allReadings)[0]> = {};
    allReadings.forEach((reading) => {
      if (!grouped[reading.biomarkerId] || new Date(reading.createdAt) > new Date(grouped[reading.biomarkerId].createdAt)) {
        grouped[reading.biomarkerId] = reading;
      }
    });
    return Object.values(grouped);
  }, [allReadings]);

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '✓';
      case 'warning':
        return '⚠';
      case 'abnormal':
        return '✗';
      default:
        return '?';
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!showDashboard) {
    return (
      <ScreenContainer className="items-center justify-center gap-6 px-6">
        <View className="items-center gap-3">
          <Text className="text-5xl">❤️</Text>
          <Text className="text-3xl font-bold text-foreground text-center">HealthTrack</Text>
          <Text className="text-base text-muted text-center">Track your health records with ease</Text>
        </View>
        <View className="w-full gap-3 mt-8">
          <TouchableOpacity
            onPress={() => {
              // Trigger OAuth flow
              const baseUrl = getApiBaseUrl();
              const redirectUri = `${baseUrl}/oauth/callback`;
              const authUrl = `${baseUrl}/api/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
              if (typeof window !== 'undefined') {
                window.location.href = authUrl;
              }
            }}
            className="w-full bg-primary rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">Sign In with OAuth</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDemoMode(true)}
            className="w-full bg-surface rounded-xl py-4 items-center border-2"
            style={{ borderColor: colors.primary }}
          >
            <Text className="font-semibold text-lg" style={{ color: colors.primary }}>
              View Demo
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-muted text-center mt-6">Demo shows sample health data</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-foreground">Dashboard</Text>
              <Text className="text-sm text-muted mt-1">
                {demoMode ? '📊 Demo Mode' : `${mockReports.length} reports uploaded`}
              </Text>
            </View>
            {demoMode && (
              <TouchableOpacity
                onPress={() => setDemoMode(false)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.error }}
              >
                <Text className="text-white font-bold">✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {latestReadings.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">Key Metrics</Text>
            <FlatList
              data={latestReadings.slice(0, 4)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const biomarker = mockBiomarkers.find((b) => b.id === item.biomarkerId);
                return (
                  <TouchableOpacity
                    className="bg-surface rounded-xl p-4 mb-3 flex-row items-center justify-between border border-border"
                  >
                    <View className="flex-1">
                      <Text className="text-sm text-muted">{biomarker?.name || 'Unknown'}</Text>
                      <Text className="text-xl font-semibold text-foreground mt-1">
                        {item.value} <Text className="text-sm text-muted">{biomarker?.unit}</Text>
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        Ref: {biomarker?.referenceMin}-{biomarker?.referenceMax}
                      </Text>
                    </View>
                    <View
                      className="w-12 h-12 rounded-full items-center justify-center"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      <Text className="text-lg font-bold text-white">{getStatusText(item.status)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {mockReports.length > 0 && (
          <View className="px-6 pb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">Recent Reports</Text>
            <FlatList
              data={mockReports.slice(0, 3)}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="bg-surface rounded-xl p-4 mb-3 border border-border"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground capitalize">{item.reportType} Report</Text>
                      <Text className="text-xs text-muted mt-1">
                        {new Date(item.uploadedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-primary">
                        {allReadings.filter((r) => r.reportId === item.id).length}
                      </Text>
                      <Text className="text-xs text-muted">metrics</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {mockReports.length === 0 && (
          <View className="flex-1 items-center justify-center px-6 py-12">
            <Text className="text-xl font-semibold text-foreground mb-2">No Reports Yet</Text>
            <Text className="text-sm text-muted text-center mb-6">
              Upload your first health report to start tracking your biomarkers
            </Text>
          </View>
        )}

        <View className="h-20" />
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full items-center justify-center"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-3xl font-bold text-white">+</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
