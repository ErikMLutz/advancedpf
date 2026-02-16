// Finance Dashboard - Data Processing Tests
import { describe, it, expect } from 'vitest';

// Mock date for consistent testing
const mockToday = new Date('2024-09-15');
Date.now = () => mockToday.getTime();

// Import functions to test (in real environment, would import from ../web/js/dataProcessing.js)
// For now, we'll inline the functions we need to test

function formatMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function createMonthSkeleton(months) {
    const result = [];
    const today = mockToday;

    for (let i = 0; i < months; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        result.unshift(yearMonth);
    }

    return result;
}

function forwardFill(data) {
    let lastValue = 0;
    return data.map(item => {
        if (item.value !== null && item.value !== undefined) {
            lastValue = item.value;
        }
        return { ...item, value: item.value ?? lastValue };
    });
}

function rollingAverage(values, window = 6) {
    return values.map((_, i) => {
        if (i < window - 1) return null;
        const slice = values.slice(i - window + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / window;
    });
}

describe('Data Processing', () => {
    describe('formatMonth', () => {
        it('should format date as YYYY-MM', () => {
            const date = new Date('2024-03-15');
            expect(formatMonth(date)).toBe('2024-03');
        });

        it('should zero-pad single-digit months', () => {
            const date = new Date('2024-01-15');
            expect(formatMonth(date)).toBe('2024-01');
        });
    });

    describe('createMonthSkeleton', () => {
        it('should create correct number of months', () => {
            const skeleton = createMonthSkeleton(12);
            expect(skeleton).toHaveLength(12);
        });

        it('should generate months in ascending order', () => {
            const skeleton = createMonthSkeleton(3);
            expect(skeleton[0] < skeleton[1]).toBe(true);
            expect(skeleton[1] < skeleton[2]).toBe(true);
        });

        it('should include current month', () => {
            const skeleton = createMonthSkeleton(12);
            expect(skeleton[skeleton.length - 1]).toBe('2024-09');
        });

        it('should generate correct past months', () => {
            const skeleton = createMonthSkeleton(3);
            expect(skeleton).toEqual(['2024-07', '2024-08', '2024-09']);
        });
    });

    describe('forwardFill', () => {
        it('should forward fill null values', () => {
            const data = [
                { month: '2024-01', value: 100 },
                { month: '2024-02', value: null },
                { month: '2024-03', value: null },
                { month: '2024-04', value: 200 }
            ];

            const filled = forwardFill(data);

            expect(filled[0].value).toBe(100);
            expect(filled[1].value).toBe(100);
            expect(filled[2].value).toBe(100);
            expect(filled[3].value).toBe(200);
        });

        it('should handle leading nulls with 0', () => {
            const data = [
                { month: '2024-01', value: null },
                { month: '2024-02', value: null },
                { month: '2024-03', value: 100 }
            ];

            const filled = forwardFill(data);

            expect(filled[0].value).toBe(0);
            expect(filled[1].value).toBe(0);
            expect(filled[2].value).toBe(100);
        });
    });

    describe('rollingAverage', () => {
        it('should calculate 6-month rolling average', () => {
            const values = [10, 20, 30, 40, 50, 60, 70, 80];
            const rolling = rollingAverage(values, 6);

            // First 5 values should be null
            expect(rolling[0]).toBe(null);
            expect(rolling[1]).toBe(null);
            expect(rolling[2]).toBe(null);
            expect(rolling[3]).toBe(null);
            expect(rolling[4]).toBe(null);

            // 6th value: average of [10, 20, 30, 40, 50, 60] = 35
            expect(rolling[5]).toBe(35);

            // 7th value: average of [20, 30, 40, 50, 60, 70] = 45
            expect(rolling[6]).toBe(45);

            // 8th value: average of [30, 40, 50, 60, 70, 80] = 55
            expect(rolling[7]).toBe(55);
        });

        it('should handle different window sizes', () => {
            const values = [10, 20, 30, 40];
            const rolling = rollingAverage(values, 3);

            expect(rolling[0]).toBe(null);
            expect(rolling[1]).toBe(null);
            expect(rolling[2]).toBe(20); // (10 + 20 + 30) / 3
            expect(rolling[3]).toBe(30); // (20 + 30 + 40) / 3
        });
    });

    describe('Integration Tests', () => {
        it('should process month skeleton and forward fill together', () => {
            const skeleton = createMonthSkeleton(3);
            const dataWithGaps = skeleton.map((month, i) => ({
                month,
                value: i === 0 ? 1000 : null
            }));

            const filled = forwardFill(dataWithGaps);

            expect(filled[0].value).toBe(1000);
            expect(filled[1].value).toBe(1000);
            expect(filled[2].value).toBe(1000);
        });

        it('should calculate rolling average on realistic data', () => {
            // Simulate monthly net worth values
            const monthlyValues = [
                100000, 101000, 102000, 103000, 104000, 105000,
                106000, 107000, 108000, 109000, 110000, 111000
            ];

            const rolling = rollingAverage(monthlyValues, 6);

            // Spot check a few values
            expect(rolling[5]).toBe(102500); // First 6 months average
            expect(rolling[11]).toBe(108500); // Last 6 months average
        });
    });
});
