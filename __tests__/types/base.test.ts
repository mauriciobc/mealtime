import '@testing-library/jest-dom';
import { BaseCat, BaseFeedingLog, BaseUser, ID } from '@/lib/types/common';

describe('Base Types', () => {
  describe('BaseCat', () => {
    it('should create a valid BaseCat object', () => {
      const cat: BaseCat = {
        id: 1,
        name: 'Whiskers',
        photoUrl: 'https://example.com/cat.jpg',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
        restrictions: 'No dairy',
        householdId: 1,
        feeding_interval: 8
      };

      expect(cat).toBeDefined();
      expect(cat.id).toBe(1);
      expect(cat.name).toBe('Whiskers');
      expect(cat.feeding_interval).toBe(8);
    });

    it('should allow optional fields to be undefined', () => {
      const cat: BaseCat = {
        id: 1,
        name: 'Whiskers',
        householdId: 1,
        feeding_interval: 8
      };

      expect(cat.photoUrl).toBeUndefined();
      expect(cat.birthdate).toBeUndefined();
      expect(cat.weight).toBeUndefined();
      expect(cat.restrictions).toBeUndefined();
    });
  });

  describe('BaseFeedingLog', () => {
    it('should create a valid BaseFeedingLog object', () => {
      const log: BaseFeedingLog = {
        id: 1,
        catId: 1,
        userId: 1,
        timestamp: new Date('2024-03-15T12:00:00Z'),
        portionSize: 100,
        notes: 'Regular feeding',
        status: 'completed'
      };

      expect(log).toBeDefined();
      expect(log.id).toBe(1);
      expect(log.catId).toBe(1);
      expect(log.portionSize).toBe(100);
      expect(log.status).toBe('completed');
    });

    it('should allow optional fields to be undefined', () => {
      const log: BaseFeedingLog = {
        id: 1,
        catId: 1,
        userId: 1,
        timestamp: new Date('2024-03-15T12:00:00Z'),
        portionSize: 100
      };

      expect(log.notes).toBeUndefined();
      expect(log.status).toBeUndefined();
    });
  });

  describe('BaseUser', () => {
    it('should create a valid BaseUser object', () => {
      const user: BaseUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        households: [1],
        primaryHousehold: 1,
        preferences: {
          timezone: 'America/New_York',
          language: 'en-US',
          notifications: {
            pushEnabled: true,
            emailEnabled: false,
            feedingReminders: true,
            missedFeedingAlerts: true,
            householdUpdates: true
          }
        },
        role: 'admin'
      };

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.name).toBe('John Doe');
      expect(user.role).toBe('admin');
    });

    it('should allow optional fields to be undefined', () => {
      const user: BaseUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        households: [1],
        primaryHousehold: 1,
        preferences: {
          timezone: 'America/New_York',
          language: 'en-US',
          notifications: {
            pushEnabled: true,
            emailEnabled: false,
            feedingReminders: true,
            missedFeedingAlerts: true,
            householdUpdates: true
          }
        },
        role: 'admin'
      };

      expect(user.avatar).toBeUndefined();
    });
  });

  describe('ID type', () => {
    it('should accept number values', () => {
      const id: ID = 1;
      expect(id).toBe(1);
    });

    it('should accept string values', () => {
      const id: ID = '1';
      expect(id).toBe('1');
    });
  });
}); 