import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

describe('CreateEmployeeDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: 'John',
      lastName: 'Doe',
      position: 'Software Engineer',
      email: 'john.doe@example.com',
      managerId: 1,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a valid DTO with optional fields', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: 'John',
      lastName: 'Doe',
      position: 'Software Engineer',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when required fields are missing', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: 'John',
      // Missing lastName
      // Missing position
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    // Check for specific validation errors
    const errorFields = errors.map(err => err.property);
    expect(errorFields).toContain('lastName');
    expect(errorFields).toContain('position');
  });

  it('should fail validation with invalid email format', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: 'John',
      lastName: 'Doe',
      position: 'Software Engineer',
      email: 'invalid-email', // Invalid email format
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const emailError = errors.find(err => err.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail validation with too long string fields', async () => {
    const longString = 'a'.repeat(200); // Create a string that's too long
    
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: longString, // Too long for firstName
      lastName: 'Doe',
      position: 'Software Engineer',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const firstNameError = errors.find(err => err.property === 'firstName');
    expect(firstNameError).toBeDefined();
  });

  it('should fail validation with non-number managerId', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      firstName: 'John',
      lastName: 'Doe',
      position: 'Software Engineer',
      managerId: 'not-a-number', // Not a number
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const managerIdError = errors.find(err => err.property === 'managerId');
    expect(managerIdError).toBeDefined();
  });
}); 