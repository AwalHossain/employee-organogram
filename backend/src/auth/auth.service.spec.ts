import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return JWT token when credentials are valid', () => {
      const loginDto: LoginDto = {
        username: 'admin',
        password: 'admin',
      };

      const mockToken = 'jwt-token';
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        username: 'admin',
        roles: ['admin'],
      });
      expect(result).toEqual({ access_token: mockToken });
    });

    it('should throw UnauthorizedException when username is invalid', () => {
      const loginDto: LoginDto = {
        username: 'invalid',
        password: 'admin',
      };

      expect(() => service.login(loginDto)).toThrow(
        new UnauthorizedException('Invalid credentials')
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', () => {
      const loginDto: LoginDto = {
        username: 'admin',
        password: 'invalid',
      };

      expect(() => service.login(loginDto)).toThrow(
        new UnauthorizedException('Invalid credentials')
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should return true when token is valid', () => {
      const mockToken = 'valid-jwt-token';
      mockJwtService.verify.mockReturnValue({
        sub: 1,
        username: 'admin',
        roles: ['admin'],
      });

      const result = service.validateToken(mockToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      const mockToken = 'invalid-jwt-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => service.validateToken(mockToken)).toThrow(
        new UnauthorizedException('Invalid token')
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith(mockToken);
    });
  });
}); 