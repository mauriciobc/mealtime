import { faker } from '@faker-js/faker/locale/pt_BR';
import { TestUser, TestCat, TestFeeding, TestWeightLog } from './test-utils';

// Dados mock para usuários
export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    household_id: faker.string.uuid(),
    ...overrides
  };
}

export function createMockUsers(count: number, householdId?: string): TestUser[] {
  return Array.from({ length: count }, () => 
    createMockUser(householdId ? { household_id: householdId } : {})
  );
}

// Dados mock para gatos
export function createMockCat(overrides: Partial<TestCat> = {}): TestCat {
  return {
    id: faker.string.uuid(),
    name: faker.animal.cat(),
    breed: faker.helpers.arrayElement([
      'Persa', 'Siamês', 'Maine Coon', 'Ragdoll', 'Bengala', 'Abissínio', 'Sphynx', 'Misturado'
    ]),
    birth_date: faker.date.past({ years: 10 }),
    household_id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    ...overrides
  };
}

export function createMockCats(count: number, householdId?: string, ownerId?: string): TestCat[] {
  return Array.from({ length: count }, () => 
    createMockCat({
      household_id: householdId,
      owner_id: ownerId
    })
  );
}

// Dados mock para alimentação
export function createMockFeeding(overrides: Partial<TestFeeding> = {}): TestFeeding {
  return {
    id: faker.string.uuid(),
    cat_id: faker.string.uuid(),
    food_type: faker.helpers.arrayElement([
      'Ração Seca', 'Ração Úmida', 'Carne', 'Peixe', 'Frango', 'Suplemento'
    ]),
    amount: faker.number.float({ min: 10, max: 200, precision: 0.1 }),
    feeding_time: faker.date.recent({ days: 7 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    user_id: faker.string.uuid(),
    ...overrides
  };
}

export function createMockFeedings(count: number, catId?: string, userId?: string): TestFeeding[] {
  return Array.from({ length: count }, () => 
    createMockFeeding({
      cat_id: catId,
      user_id: userId
    })
  );
}

// Dados mock para logs de peso
export function createMockWeightLog(overrides: Partial<TestWeightLog> = {}): TestWeightLog {
  return {
    id: faker.string.uuid(),
    cat_id: faker.string.uuid(),
    weight: faker.number.float({ min: 1, max: 15, precision: 0.1 }),
    measurement_date: faker.date.recent({ days: 30 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    user_id: faker.string.uuid(),
    ...overrides
  };
}

export function createMockWeightLogs(count: number, catId?: string, userId?: string): TestWeightLog[] {
  return Array.from({ length: count }, () => 
    createMockWeightLog({
      cat_id: catId,
      user_id: userId
    })
  );
}

// Dados mock para households
export function createMockHousehold() {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    created_at: faker.date.past(),
    updated_at: faker.date.recent()
  };
}

// Cenários de teste pré-definidos
export const mockScenarios = {
  minimal: {
    users: 1,
    cats: 1,
    feedings: 2,
    weightLogs: 1
  },
  medium: {
    users: 2,
    cats: 3,
    feedings: 10,
    weightLogs: 5
  },
  large: {
    users: 5,
    cats: 8,
    feedings: 50,
    weightLogs: 20
  }
};

// Gerador de cenários completos
export function generateMockScenario(scenario: keyof typeof mockScenarios) {
  const config = mockScenarios[scenario];
  const household = createMockHousehold();
  const users = createMockUsers(config.users, household.id);
  const cats = createMockCats(config.cats, household.id, users[0].id);
  
  const feedings = cats.flatMap(cat => 
    createMockFeedings(config.feedings, cat.id, users[0].id)
  );
  
  const weightLogs = cats.flatMap(cat => 
    createMockWeightLogs(config.weightLogs, cat.id, users[0].id)
  );
  
  return {
    household,
    users,
    cats,
    feedings,
    weightLogs
  };
}

// Dados mock para testes de API
export const apiMockData = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123',
    name: 'Test User'
  },
  invalidUser: {
    email: 'invalid-email',
    password: '123',
    name: ''
  },
  validCat: {
    name: 'Fluffy',
    breed: 'Persa',
    birth_date: '2020-01-01'
  },
  invalidCat: {
    name: '',
    breed: '',
    birth_date: 'invalid-date'
  },
  validFeeding: {
    food_type: 'Ração Seca',
    amount: 100,
    feeding_time: new Date().toISOString(),
    notes: 'Test feeding'
  },
  invalidFeeding: {
    food_type: '',
    amount: -10,
    feeding_time: 'invalid-date',
    notes: ''
  },
  validWeightLog: {
    weight: 5.5,
    measurement_date: new Date().toISOString(),
    notes: 'Test weight log'
  },
  invalidWeightLog: {
    weight: -1,
    measurement_date: 'invalid-date',
    notes: ''
  }
};

// Dados mock para testes de erro
export const errorMockData = {
  networkError: new Error('Network error'),
  databaseError: new Error('Database connection failed'),
  validationError: new Error('Validation failed'),
  authenticationError: new Error('Authentication failed'),
  authorizationError: new Error('Authorization failed'),
  notFoundError: new Error('Resource not found')
};

// Dados mock para testes de performance
export const performanceMockData = {
  largeDataset: {
    users: createMockUsers(100),
    cats: createMockCats(50),
    feedings: createMockFeedings(1000),
    weightLogs: createMockWeightLogs(500)
  },
  smallDataset: {
    users: createMockUsers(1),
    cats: createMockCats(1),
    feedings: createMockFeedings(5),
    weightLogs: createMockWeightLogs(2)
  }
};

export default {
  createMockUser,
  createMockUsers,
  createMockCat,
  createMockCats,
  createMockFeeding,
  createMockFeedings,
  createMockWeightLog,
  createMockWeightLogs,
  createMockHousehold,
  generateMockScenario,
  mockScenarios,
  apiMockData,
  errorMockData,
  performanceMockData
}; 