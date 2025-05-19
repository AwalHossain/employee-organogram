import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetSubordinatesDto } from './dto/get-subordinates.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';
import { EmployeeEntity } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employeesRepository: EmployeesRepository,
    private readonly cacheService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('EmployeesService');
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    this.logger.info({ action: 'create_employee', data: createEmployeeDto });
    const employee = await this.employeesRepository.create(createEmployeeDto);

    // Invalidate cache when creating a new employee
    await this.cacheService.del('all_employees');

    return employee;
  }

  async findAll(page: number = 1, limit: number = 50): Promise<EmployeeEntity[]> {
    const cacheKey = `all_employees:page:${page}:limit:${limit}`;

    // from cache first
    const cachedEmployees = await this.cacheService.get<EmployeeEntity[]>(cacheKey);
    if (cachedEmployees) {
      this.logger.debug({ action: 'cache_hit', key: cacheKey });
      return cachedEmployees;
    }

    // If not in cache, get from repository with pagination
    this.logger.debug({ action: 'cache_miss', key: cacheKey });
    const employees = await this.employeesRepository.findAll(page, limit);

    // Store in cache with 5 minute TTL to prevent stale data
    await this.cacheService.set(cacheKey, employees, 300);

    return employees;
  }

  async findOne(id: number): Promise<EmployeeEntity> {
    const cacheKey = `employee:${id}`;

    // Try to get from cache first
    const cachedEmployee = await this.cacheService.get<EmployeeEntity>(cacheKey);
    if (cachedEmployee) {
      this.logger.debug({ action: 'cache_hit', key: cacheKey });
      return cachedEmployee;
    }

    // If not in cache, get from repository
    this.logger.debug({ action: 'cache_miss', key: cacheKey });
    const employee = await this.employeesRepository.findOne(id);

    if (!employee) {
      this.logger.warn({ action: 'employee_not_found', id });
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Store in cache
    await this.cacheService.set(cacheKey, employee);

    return employee;
  }

  async update(
    id: number,
    updateEmployeeDto: UpdateEmployeeDto
  ): Promise<EmployeeEntity> {
    this.logger.info({ action: 'update_employee', id, data: updateEmployeeDto });

    await this.findOne(id);
    const employee = await this.employeesRepository.update(id, updateEmployeeDto);


    await this.cacheService.del(`employee:${id}`);
    await this.cacheService.del('all_employees');

    await this.cacheService.del(`subordinates:${id}`);

    return employee;
  }

  async remove(id: number): Promise<void> {
    this.logger.info({ action: 'remove_employee', id });

    await this.findOne(id);
    await this.employeesRepository.remove(id);

    // Invalidate cache when removing an employee
    await this.cacheService.del('all_employees');
  }

  /**
   * Find all subordinates for an employee, with optional parameters for depth and pagination
   */
  async findSubordinates(
    params: GetSubordinatesDto
  ): Promise<EmployeeEntity[]> {
    const { id, depth, page, limit } = params;
    const cacheKey = `subordinates:${id}:depth:${depth}:page:${page}:limit:${limit}`;

    try {
      //  from cache first with a short timeout
      const cachedSubordinates = await this.cacheService.get<EmployeeEntity[]>(cacheKey);
      if (cachedSubordinates) {
        this.logger.debug({ action: 'cache_hit', key: cacheKey });
        return cachedSubordinates;
      }
    } catch (error) {
      this.logger.warn({ action: 'cache_error', message: error.message });
      // Continue execution if cache fails
    }

    this.logger.debug({ action: 'cache_miss', key: cacheKey });

    // Check if employee exists
    await this.findOne(id);

    let subordinates: EmployeeEntity[];

    try {
      // Ensure page and limit have default values if undefined
      const pageValue = page ?? 1;
      const limitValue = limit ?? 20;

      if (depth === -1) {
        // Get all levels of subordinates with pagination
        subordinates = await this.employeesRepository.findAllSubordinatesRecursive(id, pageValue, limitValue);
      } else if (depth === 1) {
        // Get only direct subordinates
        subordinates = await this.employeesRepository.findSubordinates(id);

        // Apply pagination for direct subordinates
        const startIdx = (pageValue - 1) * limitValue;
        const endIdx = startIdx + limitValue;
        subordinates = subordinates.slice(startIdx, endIdx);
      } else {
        subordinates = await this.employeesRepository.findAllSubordinatesRecursive(id, pageValue, limitValue);
      }

      // Store in cache with a reasonable TTL for high-traffic data
      await this.cacheService.set(cacheKey, subordinates, 300); // Cache for 5 minutes

      return subordinates;
    } catch (error) {
      this.logger.error({
        action: 'find_subordinates_error',
        employeeId: id,
        message: error.message
      });
      throw error;
    }
  }
}
