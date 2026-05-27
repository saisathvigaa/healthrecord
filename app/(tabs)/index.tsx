import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useRouter } from 'expo-router';

interface BiomarkerCard {
  name: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'abnormal';
  trend: string;
}

const SAMPLE_BIOMARKERS: BiomarkerCard[] = [
  { name: 'Hemoglobin', value: 13.5, unit: 'g/dL', status: 'normal', trend: '→' },
  { name: 'Glucose', value: 95, unit: 'mg/dL', status: 'normal', trend: '↑' },
  { name: 'Creatinine', value: 1.1, unit: 'mg/dL', status: 'normal', trend: '→' },
  { name: 'Cholesterol', value: 210, unit: 'mg/dL', status: 'warning', trend: '↓' },
  { name: 'Blood Pressure', value: 138, unit: 'mmHg', status: 'warning', trend: '→' },
  { name: 'Potassium', value: 4.2, unit: 'mmol/L', status: 'normal', trend: '→' },
];

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();

  const isLoading = authLoading && !demoMode;
  const showDashboard = isAuthenticated || demoMode;

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

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'normal':
        return '#D1FAE5';
      case 'warning':
        return '#FEF3C7';
      case 'abnormal':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
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

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!showDashboard) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View className="items-center gap-6">
            <Text className="text-5xl">❤️</Text>
            <Text className="text-3xl font-bold text-foreground text-center">HealthTrack</Text>
            <Text className="text-base text-muted text-center">Track your health records with ease</Text>

            <View className="gap-3 w-full mt-6">
              <TouchableOpacity
                onPress={() => {
                  // OAuth login - will open browser and redirect back
                  const appId = process.env.EXPO_PUBLIC_APP_ID || 'app-id';
                  const redirectUri = `${process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL || 'http://localhost:3000'}/oauth/callback`;
                  const loginUrl = `${process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL || 'http://localhost:3000'}/login?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
                  router.push(loginUrl as any);
                }}
                className="bg-primary rounded-xl py-4 items-center"
              >
                <Text className="text-white font-semibold text-lg">Sign In with OAuth</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDemoMode(true)}
                className="bg-surface rounded-xl py-4 items-center border-2 border-primary"
              >
                <Text className="text-primary font-semibold text-lg">View Demo</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-muted text-center mt-4">Demo shows sample health data</Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Premium Dashboard
  const normalCount = SAMPLE_BIOMARKERS.filter(b => b.status === 'normal').length;
  const warningCount = SAMPLE_BIOMARKERS.filter(b => b.status === 'warning').length;
  const abnormalCount = SAMPLE_BIOMARKERS.filter(b => b.status === 'abnormal').length;

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-8 pb-6">
          <Text className="text-4xl font-bold text-foreground">Your Health</Text>
          <Text className="text-base text-muted mt-2">Last updated 2 days ago</Text>
        </View>

        {/* Health Scorecard */}
        <View className="px-6 mb-8">
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-6">Health Summary</Text>

            <View className="flex-row justify-between mb-6">
              {/* Normal */}
              <View className="flex-1 mr-3 items-center">
                <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center border-2 border-success mb-3">
                  <Text className="text-2xl font-bold text-success">{normalCount}</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Normal</Text>
                <Text className="text-xs text-muted">Healthy</Text>
              </View>

              {/* Warning */}
              <View className="flex-1 mx-1 items-center">
                <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center border-2 border-warning mb-3">
                  <Text className="text-2xl font-bold text-warning">{warningCount}</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Warning</Text>
                <Text className="text-xs text-muted">Monitor</Text>
              </View>

              {/* Abnormal */}
              <View className="flex-1 ml-3 items-center">
                <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center border-2 border-error mb-3">
                  <Text className="text-2xl font-bold text-error">{abnormalCount}</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Abnormal</Text>
                <Text className="text-xs text-muted">Action</Text>
              </View>
            </View>

            {/* Overall Status */}
            <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Text className="text-xs font-semibold text-blue-900 mb-1">💡 Overall Status</Text>
              <Text className="text-sm text-blue-800">
                {warningCount === 0 && abnormalCount === 0
                  ? 'All your metrics look great! Keep up the good work.'
                  : `${warningCount + abnormalCount} metric(s) need attention. Tap to review.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Biomarkers */}
        <View className="px-6 mb-8">
          <Text className="text-lg font-semibold text-foreground mb-4">Your Metrics</Text>

          {SAMPLE_BIOMARKERS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => router.push(`/biomarker-detail?id=${idx}`)}
              className="bg-surface rounded-xl p-4 mb-3 border border-border flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground mb-1">{item.name}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-2xl font-bold text-foreground">{item.value}</Text>
                  <Text className="text-sm text-muted">{item.unit}</Text>
                  <Text className="text-lg" style={{ color: getStatusColor(item.status) }}>
                    {item.trend}
                  </Text>
                </View>
              </View>

              <View className="rounded-full px-3 py-1 ml-4" style={{ backgroundColor: `${getStatusBgColor(item.status)}40` }}>
                <Text className="text-xs font-semibold" style={{ color: getStatusColor(item.status) }}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>

              <Text className="text-xl text-muted ml-2">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <View className="px-6 pb-8">
          <TouchableOpacity onPress={() => router.push('/upload')} className="bg-primary rounded-xl py-4 items-center">
            <Text className="text-white font-semibold text-lg">📤 Upload New Report</Text>
            <Text className="text-white text-xs mt-1">Add your latest test results</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
