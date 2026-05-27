export const mockBiomarkers = [
  { id: 1, name: 'Hemoglobin', unit: 'g/dL', referenceMin: 13.5, referenceMax: 17.5, category: 'blood' },
  { id: 2, name: 'Glucose', unit: 'mg/dL', referenceMin: 70, referenceMax: 100, category: 'blood' },
  { id: 3, name: 'Creatinine', unit: 'mg/dL', referenceMin: 0.7, referenceMax: 1.3, category: 'blood' },
  { id: 4, name: 'Cholesterol', unit: 'mg/dL', referenceMin: 0, referenceMax: 200, category: 'blood' },
  { id: 5, name: 'Protein', unit: 'g/24h', referenceMin: 0, referenceMax: 0.15, category: 'urine' },
];

export function generateMockReadings(biomarkerId: number, count: number = 6) {
  const biomarker = mockBiomarkers.find((b) => b.id === biomarkerId);
  if (!biomarker) return [];

  const readings = [];
  const now = new Date();
  const range = biomarker.referenceMax - biomarker.referenceMin;

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 7); // Weekly readings

    const variance = range * 0.15;
    const baseValue = biomarker.referenceMin + range / 2;
    const value = baseValue + (Math.random() - 0.5) * variance * 2;

    const status =
      value < biomarker.referenceMin
        ? 'abnormal'
        : value > biomarker.referenceMax
          ? 'warning'
          : 'normal';

    readings.push({
      id: i,
      biomarkerId,
      value: Math.round(value * 100) / 100,
      status,
      createdAt: date.toISOString(),
      reportId: 1,
    });
  }

  return readings;
}

export const mockReports = [
  {
    id: 1,
    userId: 1,
    fileName: 'blood-test-2024.pdf',
    fileKey: 'reports/blood-test-2024.pdf',
    fileUrl: 'https://via.placeholder.com/400x300?text=Blood+Test+Report',
    reportType: 'blood',
    uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    userId: 1,
    fileName: 'blood-test-2024-2.pdf',
    fileKey: 'reports/blood-test-2024-2.pdf',
    fileUrl: 'https://via.placeholder.com/400x300?text=Blood+Test+Report+2',
    reportType: 'blood',
    uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
