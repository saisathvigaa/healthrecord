import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';

// Sample data used only in demo mode
const SAMPLE_BIOMARKERS = [
  { name: 'Hemoglobin',     value: '13.5', unit: 'g/dL',   status: 'normal'   as const },
  { name: 'Glucose',        value: '95',   unit: 'mg/dL',  status: 'normal'   as const },
  { name: 'Creatinine',     value: '1.1',  unit: 'mg/dL',  status: 'normal'   as const },
  { name: 'Cholesterol',    value: '210',  unit: 'mg/dL',  status: 'warning'  as const },
  { name: 'Blood Pressure', value: '138',  unit: 'mmHg',   status: 'warning'  as const },
  { name: 'Potassium',      value: '4.2',  unit: 'mmol/L', status: 'normal'   as const },
];

export default function HomeScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const router = useRouter();

  // Fetch real readings from DB (only when authenticated)
  const { data: readings, isLoading: readingsLoading, refetch } = trpc.readings.list.useQuery(
    undefined,
    { enabled: isAuthenticated && !demoMode }
  );

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
      <ScreenContainer style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  // ── Landing / not signed in ────────────────────────────────────────────────
  if (!showDashboard) {
    return (
      <ScreenContainer style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', gap: 16 }}>
            <Text style={{ fontSize: 56 }}>❤️</Text>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#111', textAlign: 'center' }}>HealthTrack</Text>
            <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>
              Upload your lab reports — AI extracts and tracks your biomarkers
            </Text>
            <View style={{ gap: 12, width: '100%', marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Sign In / Register</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDemoMode(true)}
                style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: colors.primary }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 17 }}>View Demo</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 }}>Demo shows sample health data</Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ── Choose data source ────────────────────────────────────────────────────
  const biomarkers = demoMode
    ? SAMPLE_BIOMARKERS
    : (readings ?? []).map((r: any) => ({
        name: r.biomarkerName ?? r.name ?? 'Unknown',
        value: r.value,
        unit: r.unit ?? '',
        status: r.status ?? 'unknown',
      }));

  const normalCount   = biomarkers.filter(b => b.status === 'normal').length;
  const warningCount  = biomarkers.filter(b => b.status === 'warning').length;
  const abnormalCount = biomarkers.filter(b => b.status === 'abnormal').length;
  const hasData       = biomarkers.length > 0;

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#fff' }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#111' }}>Your Health</Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 2 }}>
              {demoMode ? 'Demo Mode' : `Hi, ${user?.name ?? user?.email ?? 'there'} 👋`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {!demoMode && (
              <TouchableOpacity
                onPress={() => router.push('/upload')}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>+ Upload</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={async () => { if (demoMode) setDemoMode(false); else await logout(); }}
              style={{ backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>
                {demoMode ? 'Exit Demo' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading state for readings */}
        {!demoMode && readingsLoading && (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: '#888', marginTop: 8 }}>Loading your data…</Text>
          </View>
        )}

        {/* Empty state — no uploads yet */}
        {!demoMode && !readingsLoading && !hasData && (
          <View style={{ alignItems: 'center', padding: 40, gap: 16 }}>
            <Text style={{ fontSize: 52 }}>📋</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' }}>
              No reports yet
            </Text>
            <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 280 }}>
              Upload your first lab report and AI will extract all your biomarker values automatically.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/upload')}
              style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>📤 Upload First Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dashboard — has data */}
        {hasData && (
          <>
            {/* Health Scorecard */}
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
              <View style={{ backgroundColor: '#f9fafb', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e5e7eb' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 16 }}>Health Summary</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  {[
                    { count: normalCount,   label: 'Normal',   color: colors.success, bg: '#D1FAE5' },
                    { count: warningCount,  label: 'Warning',  color: colors.warning, bg: '#FEF3C7' },
                    { count: abnormalCount, label: 'Abnormal', color: colors.error,   bg: '#FEE2E2' },
                  ].map(({ count, label, color, bg }) => (
                    <View key={label} style={{ flex: 1, marginHorizontal: 4, alignItems: 'center' }}>
                      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color, marginBottom: 6 }}>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color }}>{count}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                  <Text style={{ fontSize: 12, color: '#1e40af' }}>
                    {warningCount === 0 && abnormalCount === 0
                      ? '✅ All metrics look great!'
                      : `⚠️ ${warningCount + abnormalCount} metric(s) need attention.`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Biomarker list */}
            <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 12 }}>
                {demoMode ? 'Sample Metrics' : 'Your Metrics'}
              </Text>
              {biomarkers.map((item, idx) => (
                <View
                  key={idx}
                  style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 4 }}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111' }}>{item.value}</Text>
                      <Text style={{ fontSize: 13, color: '#888' }}>{item.unit}</Text>
                    </View>
                  </View>
                  <View style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: statusBg(item.status) }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor(item.status) }}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Upload more button */}
            {!demoMode && (
              <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                <TouchableOpacity
                  onPress={() => router.push('/upload')}
                  style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>📤 Upload Another Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </ScreenContainer>
  );
}
