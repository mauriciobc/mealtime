export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricValue {
  value: number;
  timestamp: string;
  labels?: Record<string, string>;
}

export interface BaseMetric {
  name: string;
  description: string;
  type: MetricType;
}

export interface CollectedMetric extends BaseMetric {
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface MetricDefinition extends BaseMetric {
  values: MetricValue[];
}

export interface TimingMetric extends CollectedMetric {
  type: 'histogram';
  operation: string;
  duration: number;
}

export interface ErrorMetric extends CollectedMetric {
  type: 'counter';
  error: string;
  context?: Record<string, unknown>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  sessionId?: string;
} 