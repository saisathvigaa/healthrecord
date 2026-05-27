import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useRouter } from 'expo-router';

interface BiomarkerCard {
  name: string; value: number; unit: string;
  status: 'normal' | 'warning' | 'abnormal'; trend: string;
}

const SAMPLE_BIOMARKERS: BiomarkerCard[] = [
  { name: 'Hemoglobin',     value: 13.5, unit: 'g/dL',    status: 'normal',  trend: '→' },
  { name: 'Glucose',        value: 95,   unit: 'mg/dL',   status: 'normal',  trend: '↑' },
  { name: 'Creatinine',     value: 1.1,  unit: 'mg/dL',   status: 'normal',  trend: '→' },
  { name: 'Cholesterol',    value: 210,  unit: 'mg/dL',   status: 'warning', trend: '↓' },
  { name: 'Blood Pressure', value: 138,  unit: 'mmHg',    status: 'warning', trend: '→' },
  { name: 'Potassium',      value: 4.2,  unit: 'mmol/L',  status: 'normal',  trend: '→' },
];

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();

  const isLoading = authLoading && !demoMode;
  const showDashboard = isAuthenticated || demoMode;

  const statusColor = (s: string) =>
    s === 'normal' ? colors.success : s === 'warning' ? colors.warning : s === 'abnormal' ? colors.error : colors.muted;
  const statusBg = (s: string) =>
    s === 'normal' ? '#D1FAE5' : s === 'warning' ? '#FEF3C7' : s === 'abnormal' ? '#FEE2E2' : '#F3F4F6';
  const statusLabel = (s: string) =>
    s === 'normal' ? 'Normal' : s === 'warning' ? 'Warning' : s === 'abnormal' ? 'Abnormal' : 'Unknown';

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  // ── Landing / not signed in ────────────────────────────────────────────────
  if (!showDashboard) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View className="items-center gap-6">
            <Text className="text-5xl">❤️</Text>
            <Text className="text-3xl font-bold text-foreground text-center">HealthTrack</Text>
            <Text className="text-base text-muted text-center">
              Track your health records with ease
            </Text>
            <View className="gap-3 w-full mt-6">
              {/* Fixed: now goes to the real login screen */}
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="bg-primary rounded-xl py-4 items-center"
              >
                <Text className="text-white font-semibold text-lg">Sign In / Register</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDemoMode(true)}
                className="bg-surface rounded-xl py-4 items-center border-2 border-primary"
              >
                <Text className="text-primary font-semibold text-lg">View Demo</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-muted text-center mt-4">
              Demo shows sample health data
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const normalCount   = SAMPLE_BIOMARKERS.filter(b => b.status === 'normal').length;
  const warningCount  = SAMPLE_BIOMARKERS.filter(b => b.status === 'warning').length;
  const abnormalCount = SAMPLE_BIOMARKERS.filter(b => b.status === 'abnormal').length;

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">

        {/* Header */}
        <View className="px-6 pt-8 pb-4 flex-row justify-between items-center">
          <View>
            <Text className="text-4xl font-bold text-foreground">Your Health</Text>
            <Text className="text-base text-muted mt-1">
              {user ? `Hi, ${user.name ?? user.email ?? 'there'} 👋` : 'Demo Mode'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={async () => { if (demoMode) setDemoMode(false); else await logout(); }}
            style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>
              {demoMode ? 'Exit Demo' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Health Scorecard */}
        <View className="px-6 mb-6">
          <View className="bg-surface rounded-2xl p-6 border border-border">
            <Text className="text-lg font-semibold text-foreground mb-5">Health Summary</Text>
            <View className="flex-row justify-between mb-5">
              {[
                { count: normalCount,   label: 'Normal',   sub: 'Healthy',  color: colors.success, bg: '#D1FAE5' },
                { count: warningCount,  label: 'Warning',  sub: 'Monitor',  color: colors.warning, bg: '#FEF3C7' },
                { count: abnormalCount, label: 'Abnormal', sub: 'Action',   color: colors.error,   bg: '#FEE2E2' },
              ].map(({ count, label, sub, color, bg }) => (
                <View key={label} className="flex-1 mx-1 items-center">
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bg,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: color, marginBottom: 8 }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color }}>{count}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{label}</Text>
                  <Text className="text-xs text-muted">{sub}</Text>
                </View>
              ))}
            </View>
            <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <Text className="text-xs font-semibold text-blue-900 mb-1">💡 Overall Status</Text>
              <Text className="text-sm text-blue-800">
                {warningCount === 0 && abnormalCount === 0
                  ? 'All your metrics look great! Keep up the good work.'
                  : `${warningCount + abnormalCount} metric(s) need attention.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Biomarker list */}
        <View className="px-6 mb-6">
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
                  <Text className="text-lg" style={{ color: statusColor(item.status) }}>{item.trend}</Text>
                </View>
              </View>
              <View style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
                backgroundColor: statusBg(item.status) + '60', marginLeft: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor(item.status) }}>
                  {statusLabel(item.status)}
                </Text>
              </View>
              <Text className="text-xl text-muted ml-2">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload CTA */}
        <View className="px-6 pb-10">
          <TouchableOpacity
            onPress={() => router.push('/upload')}
            className="bg-primary rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">📤 Upload New Report</Text>
            <Text className="text-white text-xs mt-1">Add your latest test results</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}
