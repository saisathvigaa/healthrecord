import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getDocumentAsync } from 'expo-document-picker';

export default function UploadScreen() {
  const colors = useColors();
  const [reportType, setReportType] = useState<'blood' | 'urine' | 'other'>('blood');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();

  const uploadMutation = trpc.reports.create.useMutation();
  const extractMutation = trpc.reports.extract.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      if (result.success) {
        alert(`✓ Extraction complete! Found ${result.biomarkers.length} biomarkers.`);
        setSelectedFile(null);
        setPreview(null);
        router.back();
      } else {
        alert(`Extraction failed: ${result.error}`);
      }
    },
    onError: (error: any) => {
      setIsProcessing(false);
      alert(`Error: ${error?.message || 'Extraction failed'}`);
    },
  });

  // Pick image from gallery or camera
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || `report-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        setPreview(asset.uri);
      }
    } catch (error) {
      alert('Error picking image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Pick PDF document
  const handlePickPDF = async () => {
    try {
      const result = await getDocumentAsync({
        type: 'application/pdf',
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name || 'document.pdf',
          type: 'application/pdf',
        });
        setPreview(null); // PDFs can't be previewed easily
      }
    } catch (error) {
      alert('Error picking PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Upload and extract
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsProcessing(true);
    try {
      // In production, this would upload to S3 and get a URL
      // For now, we'll use the local URI and the backend will handle it
      const fileKey = `uploads/${Date.now()}-${selectedFile.name}`;
      const fileUrl = selectedFile.uri; // In production, this would be an S3 URL

      // Step 1: Create the report
      const reportId = await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        fileKey,
        fileUrl,
        reportType,
      });

      // Step 2: Trigger extraction
      await extractMutation.mutateAsync({
        reportId: reportId as number,
        fileUrl,
        reportType,
      });
    } catch (error) {
      console.error('Error:', error);
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer className="p-0">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-background">
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">Upload Report</Text>
          <Text className="text-sm text-muted mt-1">Upload your blood or urine test report</Text>
        </View>

        {/* Content */}
        <View className="px-6 pb-6 flex-1">
          {/* Report Type Selection */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-foreground mb-3">Report Type</Text>
            <View className="flex-row gap-3">
              {(['blood', 'urine', 'other'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setReportType(type)}
                  disabled={isProcessing}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 items-center ${
                    reportType === type
                      ? 'bg-primary border-primary'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text
                    className={`font-semibold capitalize ${
                      reportType === type ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* File Selection Buttons */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-foreground mb-3">Select File</Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={isProcessing}
                className="bg-blue-100 rounded-xl py-4 px-4 items-center border-2 border-blue-300"
              >
                <Text className="text-blue-900 font-semibold">📸 Pick Image</Text>
                <Text className="text-blue-700 text-xs mt-1">From gallery or camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickPDF}
                disabled={isProcessing}
                className="bg-red-100 rounded-xl py-4 px-4 items-center border-2 border-red-300"
              >
                <Text className="text-red-900 font-semibold">📄 Pick PDF</Text>
                <Text className="text-red-700 text-xs mt-1">From your device</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* File Preview */}
          {selectedFile && (
            <View className="mb-8">
              <Text className="text-lg font-semibold text-foreground mb-3">Selected File</Text>
              <View className="bg-surface rounded-xl p-4 border border-border">
                {preview && (
                  <Image
                    source={{ uri: preview }}
                    style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 12 }}
                  />
                )}
                <Text className="text-sm font-semibold text-foreground mb-1">{selectedFile.name}</Text>
                <Text className="text-xs text-muted">{selectedFile.type}</Text>
              </View>
            </View>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            onPress={handleUpload}
            disabled={isProcessing || !selectedFile}
            className="bg-primary rounded-xl py-4 items-center mb-4"
            style={{ opacity: isProcessing || !selectedFile ? 0.6 : 1 }}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-semibold text-lg">📤 Upload & Extract</Text>
                <Text className="text-white text-xs mt-1">AI will analyze your report</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <Text className="text-xs text-blue-900 leading-relaxed">
              💡 <Text className="font-semibold">How it works:</Text> Select a PDF or image of your health report. Our AI will automatically extract biomarker values and add them to your health chart.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
