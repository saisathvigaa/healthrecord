import { describe, it, expect } from 'vitest';

describe('Date Filtering Logic', () => {
  const mockHistoricalData = [
    { date: 'Apr 2024', value: 245 },
    { date: 'May 2024', value: 235 },
    { date: 'Jun 2024', value: 225 },
    { date: 'Jul 2024', value: 218 },
    { date: 'Aug 2024', value: 212 },
    { date: 'Sep 2024', value: 210 },
  ];

  const getFilteredData = (data: typeof mockHistoricalData, period: '3m' | '6m' | '1y' | 'all') => {
    switch (period) {
      case '3m':
        return data.slice(-3);
      case '6m':
        return data.slice(-6);
      case '1y':
        return data.slice(-12);
      case 'all':
        return data;
      default:
        return data;
    }
  };

  it('should filter data for 3 months', () => {
    const filtered = getFilteredData(mockHistoricalData, '3m');
    expect(filtered).toHaveLength(3);
    expect(filtered[0].date).toBe('Jul 2024');
    expect(filtered[2].date).toBe('Sep 2024');
  });

  it('should filter data for 6 months', () => {
    const filtered = getFilteredData(mockHistoricalData, '6m');
    expect(filtered).toHaveLength(6);
    expect(filtered[0].date).toBe('Apr 2024');
    expect(filtered[5].date).toBe('Sep 2024');
  });

  it('should return all data for all-time period', () => {
    const filtered = getFilteredData(mockHistoricalData, 'all');
    expect(filtered).toHaveLength(6);
    expect(filtered).toEqual(mockHistoricalData);
  });

  it('should calculate min, max, and average values correctly', () => {
    const filtered = getFilteredData(mockHistoricalData, '6m');
    const values = filtered.map(d => d.value);
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    expect(min).toBe(210);
    expect(max).toBe(245);
    expect(avg).toBeCloseTo(224.17, 1);
  });

  it('should handle empty data gracefully', () => {
    const emptyData: typeof mockHistoricalData = [];
    const filtered = getFilteredData(emptyData, '6m');
    expect(filtered).toHaveLength(0);
  });
});
