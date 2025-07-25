import { IEmailingService } from '@/common/interfaces/emailing-service';
import { City, IWeatherApiService } from '@/common/interfaces/weather-api-service';
import { EmailAlreadySubscribed, TokenNotFound } from './errors/subscription-service';
import { SubscriptionService } from './subscription.service';
import { ISubscriptionRepository, SubscriptionWithCity } from './types/subscription-repository';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

describe('SubscriptionService', () => {
  let subscriptionRepositoryMock: jest.Mocked<ISubscriptionRepository>;
  let weatherApiServiceMock: jest.Mocked<IWeatherApiService>;
  let emailingServiceMock: jest.Mocked<IEmailingService>;
  let configMock: { appUrl: string };
  let subscriptionService: SubscriptionService;

  const mockEmail = 'test@example.com';
  const mockCity = 'Kyiv';
  const mockFrequency = 'daily' as const;
  const mockToken = 'mock-token-123456789';
  const mockCities: City[] = [
    {
      id: 1,
      name: 'Kyiv',
      region: 'Kyiv City',
      country: 'Ukraine',
      lat: 50.4501,
      lon: 30.5234,
      url: 'kyiv-ukraine',
    },
  ];
  const mockSubscription: SubscriptionWithCity = {
    id: 1,
    email: mockEmail,
    cityId: 1,
    frequency: mockFrequency,
    confirmationToken: mockToken,
    revokeToken: 'mock-revoke-token',
    isConfirmed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    city: {
      id: 1,
      externalId: 1,
      name: 'Kyiv',
      region: 'Kyiv City',
      country: 'Ukraine',
      fullName: 'Kyiv, Kyiv City, Ukraine',
      latitude: 50.4501,
      longitude: 30.5234,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    subscriptionRepositoryMock = {
      findByEmail: jest.fn(),
      findByRevokeToken: jest.fn(),
      findByConfirmationToken: jest.fn(),
      create: jest.fn(),
      updateByConfirmationToken: jest.fn(),
      deleteByRevokeToken: jest.fn(),
    } as jest.Mocked<ISubscriptionRepository>;

    weatherApiServiceMock = {
      getWeatherByCity: jest.fn(),
      searchCity: jest.fn(),
    } as jest.Mocked<IWeatherApiService>;

    emailingServiceMock = {
      sendEmail: jest.fn(),
    } as jest.Mocked<IEmailingService>;

    configMock = { appUrl: 'https://example.com' };

    const cryptoMock = jest.requireMock('crypto');
    cryptoMock.randomBytes.mockReset();

    cryptoMock.randomBytes.mockReturnValueOnce({
      toString: () => 'abcdef1234567890abcdef1234567890',
    });

    cryptoMock.randomBytes.mockReturnValueOnce({
      toString: () => '9876543210fedcba9876543210fedcba',
    });

    subscriptionService = new SubscriptionService(
      subscriptionRepositoryMock,
      weatherApiServiceMock,
      emailingServiceMock,
      configMock,
    );

    weatherApiServiceMock.searchCity.mockResolvedValue(mockCities);
  });

  describe('subscribe', () => {
    it('should successfully create a new subscription', async () => {
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(null);
      subscriptionRepositoryMock.create.mockResolvedValue(mockSubscription);

      await subscriptionService.subscribe(mockEmail, mockCity, mockFrequency);

      expect(subscriptionRepositoryMock.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(weatherApiServiceMock.searchCity).toHaveBeenCalledWith(mockCity);
      expect(subscriptionRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          frequency: mockFrequency,
          isConfirmed: false,
          confirmationToken: expect.any(String),
          revokeToken: expect.any(String),
          city: expect.objectContaining({
            externalId: mockCities[0].id,
            name: mockCities[0].name,
            region: mockCities[0].region,
            country: mockCities[0].country,
          }),
        }),
      );
      expect(emailingServiceMock.sendEmail).toHaveBeenCalledWith({
        to: mockEmail,
        subject: 'Weather Subscription Confirmation',
        html: expect.stringContaining(configMock.appUrl),
      });
    });

    it('should generate unique tokens of the correct length', async () => {
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(null);
      subscriptionRepositoryMock.create.mockImplementation((data) => {
        return Promise.resolve({
          ...mockSubscription,
          confirmationToken: data.confirmationToken,
          revokeToken: data.revokeToken,
        });
      });

      await subscriptionService.subscribe(mockEmail, mockCity, mockFrequency);

      const createCall = subscriptionRepositoryMock.create.mock.calls[0][0];
      expect(createCall.confirmationToken?.length).toBe(32);
      expect(createCall.revokeToken?.length).toBe(32);
      expect(createCall.confirmationToken).not.toEqual(createCall.revokeToken);
    });

    it('should throw EmailAlreadySubscribed when email is already subscribed', async () => {
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(mockSubscription);

      await expect(subscriptionService.subscribe(mockEmail, mockCity, mockFrequency)).rejects.toThrow(
        EmailAlreadySubscribed,
      );
      expect(subscriptionRepositoryMock.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(subscriptionRepositoryMock.create).not.toHaveBeenCalled();
      expect(emailingServiceMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should use the most relevant city from search results', async () => {
      const multipleCities: City[] = [
        {
          id: 1,
          name: 'Kyiv',
          region: 'Kyiv City',
          country: 'Ukraine',
          lat: 50.4501,
          lon: 30.5234,
          url: 'kyiv-ukraine',
        },
        {
          id: 2,
          name: 'Kyiv Oblast',
          region: 'Central',
          country: 'Ukraine',
          lat: 50.0,
          lon: 30.0,
          url: 'kyiv-oblast-ukraine',
        },
      ];
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(null);
      subscriptionRepositoryMock.create.mockResolvedValue(mockSubscription);
      weatherApiServiceMock.searchCity.mockResolvedValue(multipleCities);

      await subscriptionService.subscribe(mockEmail, mockCity, mockFrequency);

      expect(subscriptionRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          city: expect.objectContaining({
            externalId: multipleCities[0].id,
            name: multipleCities[0].name,
          }),
        }),
      );
    });

    it('should work with hourly frequency', async () => {
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(null);
      subscriptionRepositoryMock.create.mockResolvedValue({
        ...mockSubscription,
        frequency: 'hourly',
      });

      await subscriptionService.subscribe(mockEmail, mockCity, 'hourly');

      expect(subscriptionRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'hourly',
        }),
      );
    });

    it('should throw error when no cities found', async () => {
      subscriptionRepositoryMock.findByEmail.mockResolvedValue(null);
      weatherApiServiceMock.searchCity.mockResolvedValue([]);

      await expect(subscriptionService.subscribe(mockEmail, 'NonExistentCity', mockFrequency)).rejects.toThrow();
      expect(subscriptionRepositoryMock.create).not.toHaveBeenCalled();
      expect(emailingServiceMock.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('confirmSubscription', () => {
    it('should successfully confirm a subscription', async () => {
      subscriptionRepositoryMock.findByConfirmationToken.mockResolvedValue(mockSubscription);

      await subscriptionService.confirmSubscription(mockToken);

      expect(subscriptionRepositoryMock.findByConfirmationToken).toHaveBeenCalledWith(mockToken);
      expect(subscriptionRepositoryMock.updateByConfirmationToken).toHaveBeenCalledWith(mockToken, {
        isConfirmed: true,
        confirmationToken: null,
      });
      expect(emailingServiceMock.sendEmail).toHaveBeenCalledWith({
        to: mockSubscription.email,
        subject: 'Weather Subscription Successfully Confirmed!',
        html: expect.stringContaining(mockSubscription.city.fullName),
      });
    });

    it('should include unsubscribe link in confirmation success email', async () => {
      subscriptionRepositoryMock.findByConfirmationToken.mockResolvedValue(mockSubscription);

      await subscriptionService.confirmSubscription(mockToken);

      const emailCall = emailingServiceMock.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain(`/api/unsubscribe/${mockSubscription.revokeToken}`);
      expect(emailCall.html).toContain('Unsubscribe');
      expect(emailCall.subject).toBe('Weather Subscription Successfully Confirmed!');
    });

    it('should throw TokenNotFound when confirmation token is invalid', async () => {
      subscriptionRepositoryMock.findByConfirmationToken.mockResolvedValue(null);

      await expect(subscriptionService.confirmSubscription('invalid-token')).rejects.toThrow(TokenNotFound);
      expect(subscriptionRepositoryMock.updateByConfirmationToken).not.toHaveBeenCalled();
      expect(emailingServiceMock.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should successfully unsubscribe a user', async () => {
      const revokeToken = 'revoke-token-123';
      subscriptionRepositoryMock.findByRevokeToken.mockResolvedValue(mockSubscription);

      await subscriptionService.unsubscribe(revokeToken);

      expect(subscriptionRepositoryMock.findByRevokeToken).toHaveBeenCalledWith(revokeToken);
      expect(subscriptionRepositoryMock.deleteByRevokeToken).toHaveBeenCalledWith(revokeToken);
      expect(emailingServiceMock.sendEmail).toHaveBeenCalledWith({
        to: mockSubscription.email,
        subject: 'Weather Subscription Successfully Unsubscribed!',
        html: expect.stringContaining(mockSubscription.city.fullName),
      });
    });

    it('should include correct information in unsubscribe confirmation email', async () => {
      const revokeToken = 'revoke-token-123';
      subscriptionRepositoryMock.findByRevokeToken.mockResolvedValue(mockSubscription);

      await subscriptionService.unsubscribe(revokeToken);

      const emailCall = emailingServiceMock.sendEmail.mock.calls[0][0];
      expect(emailCall.html).toContain('successfully unsubscribed');
      expect(emailCall.html).toContain(mockSubscription.city.fullName);
      expect(emailCall.html).toContain(mockSubscription.frequency.toLowerCase());
      expect(emailCall.subject).toBe('Weather Subscription Successfully Unsubscribed!');
      expect(emailCall.html).toContain(`/api/unsubscribe/${mockSubscription.revokeToken}`);
    });

    it('should throw TokenNotFound when revoke token is invalid', async () => {
      subscriptionRepositoryMock.findByRevokeToken.mockResolvedValue(null);

      await expect(subscriptionService.unsubscribe('invalid-token')).rejects.toThrow(TokenNotFound);
      expect(subscriptionRepositoryMock.deleteByRevokeToken).not.toHaveBeenCalled();
      expect(emailingServiceMock.sendEmail).not.toHaveBeenCalled();
    });
  });
});
