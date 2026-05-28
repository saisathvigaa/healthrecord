import {
  ScrollView, Text, View, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type MimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

interface PickedFile {
  name: string;
  base64: string;
  mimeType: MimeType;
  size: number;
}

export default function UploadScreen() {
  const colors = useColors();
  const router = useRouter();
  const [reportType, setReportType] = useState<'blood' | 'urine' | 'other'>('blood');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const extractMutation = trpc.reports.extractFromBase64.useMutation();

  // ── Pick PDF ───────────────────────────────────────────────────────────────
  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await uriToBase64(asset.uri);
      setPickedFile({ name: asset.name ?? 'report.pdf', base64, mimeType: 'application/pdf', size: asset.size ?? 0 });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not pick PDF');
    }
  };

  // ── Pick Photo ─────────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mimeType: MimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      setPickedFile({ name: `report-${Date.now()}.jpg`, base64: asset.base64 ?? '', mimeType, size: 0 });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not pick photo');
    }
  };

  // ── Take Photo ─────────────────────────────────────────────────────────────
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85, base64: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPickedFile({ name: `report-${Date.now()}.jpg`, base64: asset.base64 ?? '', mimeType: 'image/jpeg', size: 0 });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not take photo');
    }
  };

  // ── Upload + Extract ────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!pickedFile?.base64) {
      Alert.alert('No file selected', 'Please pick a PDF or photo first.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await extractMutation.mutateAsync({
        base64Data: pickedFile.base64,
        mimeType: pickedFile.mimeType,
        fileName: pickedFile.name,
        reportType,
      });
      if (result.success) {
        Alert.alert(
          '✓ Done!',
          `Found ${result.biomarkers.length} biomarker${result.biomarkers.length !== 1 ? 's' : ''} in your report.`,
          [{ text: 'View Dashboard', onPress: () => router.replace('/(tabs)') }],
        );
      } else {
        Alert.alert('Extraction failed', result.error ?? 'Please try again with a clearer image.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">

        {/* Header with back button */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, color: '#333' }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111' }}>Upload Report</Text>
            <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>AI extracts your biomarkers</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>

          {/* Report Type */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 12 }}>Report Type</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['blood', 'urine', 'other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setReportType(type)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
                    borderWidth: 2,
                    borderColor: reportType === type ? colors.primary : '#e5e7eb',
                    backgroundColor: reportType === type ? '#EFF6FF' : '#fff',
                  }}
                >
                  <Text style={{ fontWeight: '600', textTransform: 'capitalize', color: reportType === type ? colors.primary : '#888' }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* File picker buttons */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 12 }}>Select File</Text>
            <View style={{ gap: 10 }}>
              {[
                { label: 'Pick a PDF', sub: 'Lab report as PDF file', emoji: '📄', onPress: pickPDF },
                { label: 'Pick a Photo', sub: 'Photo of your lab report', emoji: '🖼️', onPress: pickPhoto },
                ...(Platform.OS !== 'web' ? [{ label: 'Take a Photo', sub: 'Use your camera', emoji: '📷', onPress: takePhoto }] : []),
              ].map(({ label, sub, emoji, onPress }) => (
                <TouchableOpacity
                  key={label}
                  onPress={onPress}
                  disabled={isProcessing}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 16, borderRadius: 14,
                    borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                  <View>
                    <Text style={{ fontWeight: '600', color: '#333', fontSize: 15 }}>{label}</Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected file preview */}
          {pickedFile && (
            <View style={{
              padding: 14, borderRadius: 12, backgroundColor: '#EFF6FF',
              borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 20,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Text style={{ fontSize: 22 }}>{pickedFile.mimeType === 'application/pdf' ? '📄' : '🖼️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#1e40af' }} numberOfLines={1}>{pickedFile.name}</Text>
                {pickedFile.size > 0 && (
                  <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>{(pickedFile.size / 1024).toFixed(0)} KB</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setPickedFile(null)}>
                <Text style={{ color: '#94a3b8', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Extract button */}
          <TouchableOpacity
            onPress={handleExtract}
            disabled={isProcessing || !pickedFile}
            style={{
              backgroundColor: pickedFile ? colors.primary : '#e5e7eb',
              borderRadius: 14, paddingVertical: 16, alignItems: 'center',
              opacity: isProcessing ? 0.75 : 1,
            }}
          >
            {isProcessing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>AI is reading your report…</Text>
              </View>
            ) : (
              <Text style={{ color: pickedFile ? '#fff' : '#aaa', fontWeight: '700', fontSize: 16 }}>
                {pickedFile ? '✨ Extract Biomarkers' : 'Select a file first'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 12 }}>
            Processed by Gemini AI · stored securely
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  try {
    const FileSystem = await import('expo-file-system');
    return await FileSystem.default.readAsStringAsync(uri, { encoding: (FileSystem as any).EncodingType.Base64 });
  } catch {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
