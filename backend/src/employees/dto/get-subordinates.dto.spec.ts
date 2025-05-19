import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetSubordinatesDto } from './get-subordinates.dto';

describe('GetSubordinatesDto', () => {
  it('should validate a valid DTO with required fields', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 1,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a valid DTO with all fields', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 1,
      depth: 2,
      page: 1,
      limit: 10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation without id', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      depth: 2,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const idError = errors.find(err => err.property === 'id');
    expect(idError).toBeDefined();
  });

  it('should fail validation with non-number id', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 'not-a-number',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const idError = errors.find(err => err.property === 'id');
    expect(idError).toBeDefined();
  });

  it('should fail validation with non-number depth', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 1,
      depth: 'invalid',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const depthError = errors.find(err => err.property === 'depth');
    expect(depthError).toBeDefined();
  });

  it('should fail validation with negative page', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 1,
      page: -1,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const pageError = errors.find(err => err.property === 'page');
    expect(pageError).toBeDefined();
  });

  it('should fail validation with negative limit', async () => {
    const dto = plainToInstance(GetSubordinatesDto, {
      id: 1,
      limit: -10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const limitError = errors.find(err => err.property === 'limit');
    expect(limitError).toBeDefined();
  });
}); 