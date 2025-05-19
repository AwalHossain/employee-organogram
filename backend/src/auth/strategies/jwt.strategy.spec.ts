import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Mock JWT_SECRET value
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') {
        return 'test-jwt-secret';
      }
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw error if JWT_SECRET is not defined', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    await expect(
      Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile()
    ).rejects.toThrow('JWT_SECRET is not defined');

    expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
  });

  describe('validate', () => {
    it('should return payload for valid payload', () => {
      const payload = {
        sub: 1,
        username: 'admin',
        roles: ['admin'],
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid payload', () => {
      const invalidPayload = null;

      expect(() => strategy.validate(invalidPayload)).toThrow(
        UnauthorizedException
      );
    });
  });
}); 