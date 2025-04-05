export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface Metric {
    type: MetricType;
    name: string;
    value: number;
    timestamp: Date;
    labels?: Record<string, string>;
}

export interface TimingMetric extends Metric {
    type: 'histogram';
    operation: string;
    duration: number;
}

export interface ErrorMetric extends Metric {
    type: 'counter';
    error: string;
    context?: Record<string, any>;
} 