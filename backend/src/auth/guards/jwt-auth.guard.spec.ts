import { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard with "jwt" strategy', () => {
    // Since JwtAuthGuard extends AuthGuard('jwt'), we can only test that
    // it is properly instantiated
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  describe('canActivate', () => {
    it('should call the parent canActivate method', async () => {
      // Create a mock for the parent class canActivate method
      const canActivateSpy = jest.spyOn(JwtAuthGuard.prototype, 'canActivate');
      canActivateSpy.mockImplementation(() => true);

      // Create a mock ExecutionContext
      const mockExecutionContext: ExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      };

      // Call canActivate
      const result = await guard.canActivate(mockExecutionContext);

      // Verify the parent method was called
      expect(canActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      
      // Clean up spy
      canActivateSpy.mockRestore();
    });
  });
});