import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

export default function UploadScreen() {
  const colors = useColors();
  const [reportType, setReportType] = useState<'blood' | 'urine' | 'other'>('blood');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const uploadMutation = trpc.reports.create.useMutation();
  const extractMutation = trpc.reports.extract.useMutation({
    onSuccess: (result) => {
      setIsProcessing(false);
      if (result.success) {
        alert(`✓ Extraction complete! Found ${result.biomarkers.length} biomarkers.`);
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

  // Mock upload - creates report and triggers extraction
  const handleMockUpload = async () => {
    setIsProcessing(true);
    try {
      // Create a mock report with sample data
      const mockFileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
      const mockFileKey = `uploads/${Date.now()}-${mockFileName}`;
      const mockFileUrl = `https://example.com/reports/${mockFileKey}`;

      // Step 1: Create the report
      const reportId = await uploadMutation.mutateAsync({
        fileName: mockFileName,
        fileKey: mockFileKey,
        fileUrl: mockFileUrl,
        reportType,
      });

      // Step 2: Trigger extraction
      await extractMutation.mutateAsync({
        reportId: reportId as number,
        fileUrl: mockFileUrl,
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

          {/* Upload Info */}
          <View className="bg-surface rounded-xl p-6 border border-border mb-8">
            <Text className="text-sm font-semibold text-foreground mb-3">📋 How it works:</Text>
            <Text className="text-xs text-muted leading-relaxed mb-3">
              1. Select your report type (blood or urine test)
            </Text>
            <Text className="text-xs text-muted leading-relaxed mb-3">
              2. Upload your test report (PDF or image)
            </Text>
            <Text className="text-xs text-muted leading-relaxed mb-3">
              3. Our AI automatically extracts biomarker values
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              4. Your health charts update automatically
            </Text>
          </View>

          {/* Demo Upload Button */}
          <TouchableOpacity
            onPress={handleMockUpload}
            disabled={isProcessing}
            className="bg-primary rounded-xl py-4 items-center mb-4"
            style={{ opacity: isProcessing ? 0.6 : 1 }}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-semibold text-lg">📤 Upload Report</Text>
                <Text className="text-white text-xs mt-1">Demo: Simulates file upload</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <Text className="text-xs text-blue-900">
              💡 <Text className="font-semibold">Demo Mode:</Text> This demo simulates uploading a test report. In production, you'll select files from your device and our AI will extract real biomarker values.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
