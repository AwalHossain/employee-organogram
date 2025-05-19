import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('should validate a valid login DTO', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'admin',
      password: 'admin123',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when username is missing', async () => {
    const dto = plainToInstance(LoginDto, {
      password: 'admin123',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const usernameError = errors.find(err => err.property === 'username');
    expect(usernameError).toBeDefined();
  });

  it('should fail validation when password is missing', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'admin',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const passwordError = errors.find(err => err.property === 'password');
    expect(passwordError).toBeDefined();
  });

  it('should fail validation when username is not a string', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 123,
      password: 'admin123',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const usernameError = errors.find(err => err.property === 'username');
    expect(usernameError).toBeDefined();
  });

  it('should fail validation when password is not a string', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'admin',
      password: 12345,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const passwordError = errors.find(err => err.property === 'password');
    expect(passwordError).toBeDefined();
  });

  it('should fail validation when both fields are missing', async () => {
    const dto = plainToInstance(LoginDto, {});

    const errors = await validate(dto);
    expect(errors.length).toBe(2);

    const propertyNames = errors.map(error => error.property);
    expect(propertyNames).toContain('username');
    expect(propertyNames).toContain('password');
  });
}); 