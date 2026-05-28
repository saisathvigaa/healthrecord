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

  const utils = trpc.useUtils();
  const extractMutation = trpc.reports.extractFromBase64.useMutation();

  // ── Pick file ───────────────────────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const base64 = await uriToBase64(asset.uri);
      const mime: MimeType =
        asset.mimeType === 'image/png' ? 'image/png' :
        asset.mimeType?.startsWith('image/') ? 'image/jpeg' :
        'application/pdf';
      setPickedFile({ name: asset.name ?? 'report.pdf', base64, mimeType: mime, size: asset.size ?? 0 });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not pick file');
    }
  };

  // ── Upload + Extract ────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!pickedFile?.base64) {
      Alert.alert('No file selected', 'Please pick a PDF or image first.');
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
        // Invalidate cache so home screen shows fresh data immediately
        await utils.readings.list.invalidate();
        await utils.reports.list.invalidate();
        // Reset file picker so a second upload works cleanly
        setPickedFile(null);
        const saved = (result as any).createdReadings ?? result.biomarkers.length;
        Alert.alert(
          '✓ Done!',
          `Extracted ${result.biomarkers.length} biomarker${result.biomarkers.length !== 1 ? 's' : ''} and saved ${saved} to your dashboard.`,
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
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#fff' }}>

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

          {/* File picker */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 12 }}>Select File</Text>
            <TouchableOpacity
              onPress={pickFile}
              disabled={isProcessing}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                padding: 20, borderRadius: 14,
                borderWidth: 2, borderStyle: 'dashed', borderColor: '#e5e7eb',
                backgroundColor: '#fafafa',
              }}
            >
              <Text style={{ fontSize: 32 }}>📄</Text>
              <View>
                <Text style={{ fontWeight: '600', color: '#333', fontSize: 15 }}>Pick a File</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>PDF or image of your lab report</Text>
              </View>
            </TouchableOpacity>
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
