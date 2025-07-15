import 'reflect-metadata';

import { Subscription } from '@/modules/subscription/domain/entities/subscription';
import SubscriptionRepository from '@/modules/subscription/infrastructure/repository/SubscriptionRepository';
import { PrismaClient, SubscriptionFrequency } from '@prisma/client';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/test-database';

describe('SubscriptionRepository', () => {
  let prisma: PrismaClient;
  let repository: SubscriptionRepository;

  beforeAll(async () => {
    // Setup test database with container and prisma client
    const testSetup = await setupTestDatabase();
    prisma = testSetup.prisma;

    // Initialize repository with test Prisma client
    repository = new SubscriptionRepository(prisma);
  }, 60000);

  afterAll(async () => {
    // Clean up resources
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.subscription.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('save', () => {
    it('should save a subscription with a new city', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      // Act
      const subscription = new Subscription(subscriptionData);
      const result = await repository.save(subscription);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.frequency).toBe('daily');
      expect(result.confirmationToken).toBe('confirm-123');
      expect(result.revokeToken).toBe('revoke-123');
      expect(result.isConfirmed).toBe(false);
      expect(result.city).toBeDefined();
      expect(result.city.externalId).toBe(123);
      expect(result.city.name).toBe('Kyiv');
    });

    it('should connect to an existing city by externalId', async () => {
      // Arrange
      // First create a city
      const city = await prisma.city.create({
        data: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      });

      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Should not be used', // This should not be used since city exists by externalId
          fullName: 'Should not be used',
          region: 'Should not be used',
          country: 'Should not be used',
          latitude: 0,
          longitude: 0,
        },
      };

      // Act
      const subscription = new Subscription(subscriptionData);
      const result = await repository.save(subscription);

      // Assert
      expect(result).toBeDefined();
      expect(result.city.id).toBe(city.id); // Should link to existing city
      expect(result.city.name).toBe('Kyiv'); // Should use existing city name
    });
  });

  describe('findByEmail', () => {
    it('should find a subscription by email', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      const subscription = new Subscription(subscriptionData);
      await repository.save(subscription);

      // Act
      const result = await repository.findByEmail('test@example.com');

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect(result?.city).toBeDefined();
      expect(result?.city.name).toBe('Kyiv');
    });

    it('should return null if subscription not found', async () => {
      // Act
      const result = await repository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByConfirmationToken', () => {
    it('should find a subscription by confirmation token', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      const subscription = new Subscription(subscriptionData);
      await repository.save(subscription);

      // Act
      const result = await repository.findByConfirmationToken('confirm-123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('findByRevokeToken', () => {
    it('should find a subscription by revoke token', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      const subscription = new Subscription(subscriptionData);
      await repository.save(subscription);

      // Act
      const result = await repository.findByRevokeToken('revoke-123');

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });
  });

  describe('save (update)', () => {
    it('should update an existing subscription', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      const subscription = new Subscription(subscriptionData);
      const savedSubscription = await repository.save(subscription);

      // Act
      savedSubscription.isConfirmed = true;
      savedSubscription.confirmationToken = null;
      const result = await repository.save(savedSubscription);

      // Assert
      expect(result).toBeDefined();
      expect(result.isConfirmed).toBe(true);
      expect(result.confirmationToken).toBeNull();
    });
  });

  describe('deleteByRevokeToken', () => {
    it('should delete a subscription by revoke token', async () => {
      // Arrange
      const subscriptionData = {
        email: 'test@example.com',
        frequency: 'daily' as SubscriptionFrequency,
        confirmationToken: 'confirm-123',
        revokeToken: 'revoke-123',
        isConfirmed: false,
        city: {
          externalId: 123,
          name: 'Kyiv',
          fullName: 'Kyiv, Ukraine',
          region: 'Kyiv Oblast',
          country: 'Ukraine',
          latitude: 50.45,
          longitude: 30.52,
        },
      };

      const subscription = new Subscription(subscriptionData);
      await repository.save(subscription);

      // Act
      const result = await repository.deleteByRevokeToken('revoke-123');
      const findResult = await repository.findByEmail('test@example.com');

      // Assert
      expect(result).toBeDefined();
      expect(result!.email).toBe('test@example.com');
      expect(findResult).toBeNull(); // Subscription should be deleted
    });
  });
});
