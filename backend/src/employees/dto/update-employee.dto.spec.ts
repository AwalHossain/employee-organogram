import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateEmployeeDto } from './update-employee.dto';

describe('UpdateEmployeeDto', () => {
  it('should validate a valid update DTO with partial fields', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {
      position: 'Senior Software Engineer',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a valid update DTO with multiple fields', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {
      firstName: 'John',
      lastName: 'Doe',
      position: 'Senior Software Engineer',
      email: 'john.doe@example.com',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid email format', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {
      email: 'invalid-email',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const emailError = errors.find(err => err.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail validation with too long string fields', async () => {
    const longString = 'a'.repeat(200); // Create a string that's too long
    
    const dto = plainToInstance(UpdateEmployeeDto, {
      firstName: longString, // Too long for firstName
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const firstNameError = errors.find(err => err.property === 'firstName');
    expect(firstNameError).toBeDefined();
  });

  it('should fail validation with non-number managerId', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {
      managerId: 'not-a-number', // Not a number
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const managerIdError = errors.find(err => err.property === 'managerId');
    expect(managerIdError).toBeDefined();
  });

  it('should validate when sending an empty object', async () => {
    const dto = plainToInstance(UpdateEmployeeDto, {});

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
}); 