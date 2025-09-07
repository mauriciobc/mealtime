import { vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Tipos para dados de teste
export interface TestUser {
  id: string;
  email: string;
  name: string;
  household_id: string;
}

export interface TestCat {
  id: string;
  name: string;
  breed: string;
  birth_date: Date;
  household_id: string;
  owner_id: string;
}

export interface TestFeeding {
  id: string;
  cat_id: string;
  food_type: string;
  amount: number;
  feeding_time: Date;
  notes?: string;
  user_id: string;
}

export interface TestWeightLog {
  id: string;
  cat_id: string;
  weight: number;
  measurement_date: Date;
  notes?: string;
  user_id: string;
}

// Utilitários para mocks
export function createMockPrisma() {
  return {
    profiles: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    households: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cats: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feeding_logs: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cat_weight_logs: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };
}

// Utilitários para validação
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // Mínimo 8 caracteres, pelo menos uma letra e um número
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

export function validateCatName(name: string): boolean {
  return name.length >= 2 && name.length <= 50;
}

export function validateWeight(weight: number): boolean {
  return weight > 0 && weight <= 50; // Peso em kg, máximo 50kg
}

export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000; // Quantidade em gramas, máximo 1kg
}

// Utilitários para datas
export function createDate(daysOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isDateValid(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

// Utilitários para limpeza de mocks
export function clearAllMocks() {
  vi.clearAllMocks();
}

export function resetAllMocks() {
  vi.resetAllMocks();
}

// Setup e teardown padrão
export function setupTestEnvironment() {
  beforeEach(() => {
    clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });
}

// Utilitários para assertions customizadas
export function expectValidId(id: string) {
  expect(id).toBeDefined();
  expect(typeof id).toBe('string');
  expect(id.length).toBeGreaterThan(0);
}

export function expectValidDate(date: Date) {
  expect(date).toBeInstanceOf(Date);
  expect(isDateValid(date)).toBe(true);
}

export function expectValidEmail(email: string) {
  expect(validateEmail(email)).toBe(true);
}

export function expectValidPassword(password: string) {
  expect(validatePassword(password)).toBe(true);
}

// Utilitários para performance
export function measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, duration: end - start };
}

export function expectFastExecution<T>(fn: () => T, maxDuration: number = 100): T {
  const { result, duration } = measureExecutionTime(fn);
  expect(duration).toBeLessThan(maxDuration);
  return result;
}

// Utilitários para logs de teste
export function logTestInfo(testName: string, data?: any) {
  console.log(`🧪 [${testName}]`, data ? JSON.stringify(data, null, 2) : '');
}

export function logTestError(testName: string, error: any) {
  console.error(`❌ [${testName}] Erro:`, error);
}

// Utilitários para retry
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Utilitários para timeouts
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Utilitários para validação de objetos
export function expectObjectToHaveRequiredProperties(
  obj: any,
  requiredProperties: string[]
) {
  for (const prop of requiredProperties) {
    expect(obj).toHaveProperty(prop);
    expect(obj[prop]).toBeDefined();
  }
}

export function expectObjectToHaveOptionalProperties(
  obj: any,
  optionalProperties: string[]
) {
  for (const prop of optionalProperties) {
    if (obj.hasOwnProperty(prop)) {
      expect(obj[prop]).toBeDefined();
    }
  }
}

// Utilitários para arrays
export function expectArrayToContainValidItems<T>(
  array: T[],
  validator: (item: T) => boolean
) {
  expect(Array.isArray(array)).toBe(true);
  expect(array.length).toBeGreaterThan(0);
  
  for (const item of array) {
    expect(validator(item)).toBe(true);
  }
}

// Utilitários para strings
export function expectStringToMatchPattern(str: string, pattern: RegExp) {
  expect(typeof str).toBe('string');
  expect(str).toMatch(pattern);
}

export function expectStringToHaveLength(str: string, minLength: number, maxLength?: number) {
  expect(typeof str).toBe('string');
  expect(str.length).toBeGreaterThanOrEqual(minLength);
  
  if (maxLength !== undefined) {
    expect(str.length).toBeLessThanOrEqual(maxLength);
  }
}

// Exportar tudo como default para facilitar importação
export default {
  createMockPrisma,
  validateEmail,
  validatePassword,
  validateCatName,
  validateWeight,
  validateAmount,
  createDate,
  formatDate,
  isDateValid,
  clearAllMocks,
  resetAllMocks,
  setupTestEnvironment,
  expectValidId,
  expectValidDate,
  expectValidEmail,
  expectValidPassword,
  measureExecutionTime,
  expectFastExecution,
  logTestInfo,
  logTestError,
  retry,
  createTimeoutPromise,
  expectObjectToHaveRequiredProperties,
  expectObjectToHaveOptionalProperties,
  expectArrayToContainValidItems,
  expectStringToMatchPattern,
  expectStringToHaveLength,
}; 