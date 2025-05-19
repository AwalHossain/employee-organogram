import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: EmployeesService;

  const mockEmployeesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findSubordinates: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getStatus: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockEmployee: Partial<EmployeeEntity> = {
    id: 1,
    position: 'Software Engineer',
    email: 'john@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubordinate1: Partial<EmployeeEntity> = {
    id: 2,
    position: 'Junior Developer',
    email: 'jane@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubordinate2: Partial<EmployeeEntity> = {
    id: 3,
    position: 'Junior Developer',
    email: 'bob@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        position: 'Software Engineer',
        email: 'john@example.com',
        managerId: 1,
      };

      mockEmployeesService.create.mockResolvedValue(mockEmployee);

      const result = await controller.create(createEmployeeDto);

      expect(mockEmployeesService.create).toHaveBeenCalledWith(createEmployeeDto);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return an array of employees', async () => {
      const mockEmployees = [mockEmployee, mockSubordinate1, mockSubordinate2];
      mockEmployeesService.findAll.mockResolvedValue(mockEmployees);

      const result = await controller.findAll();

      expect(mockEmployeesService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('findOne', () => {
    it('should return an employee when found', async () => {
      mockEmployeesService.findOne.mockResolvedValue(mockEmployee);

      const result = await controller.findOne(1);

      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEmployee);
    });

    it('should propagate error when employee not found', async () => {
      mockEmployeesService.findOne.mockRejectedValue(
        new NotFoundException('Employee with ID 999 not found')
      );

      await expect(controller.findOne(999)).rejects.toThrow(
        new NotFoundException('Employee with ID 999 not found')
      );

      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('update', () => {
    it('should update an employee when found', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        position: 'Senior Software Engineer',
      };

      const updatedEmployee = {
        ...mockEmployee,
        position: 'Senior Software Engineer',
      };

      mockEmployeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update(1, updateEmployeeDto);

      expect(mockEmployeesService.update).toHaveBeenCalledWith(1, updateEmployeeDto);
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should remove an employee when found', async () => {
      mockEmployeesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(mockEmployeesService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Employee deleted successfully' });
    });
  });

  describe('findSubordinates', () => {
    it('should return subordinates with default parameters', async () => {
      const subordinates = [mockSubordinate1, mockSubordinate2];
      mockEmployeesService.findSubordinates.mockResolvedValue(subordinates);

      const result = await controller.findSubordinates(1);

      expect(mockEmployeesService.findSubordinates).toHaveBeenCalledWith({
        id: 1,
        depth: -1,
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(subordinates);
    });

    it('should return subordinates with custom parameters', async () => {
      const subordinates = [mockSubordinate1, mockSubordinate2];
      mockEmployeesService.findSubordinates.mockResolvedValue(subordinates);

      const result = await controller.findSubordinates(1, 1, 2, 20);

      expect(mockEmployeesService.findSubordinates).toHaveBeenCalledWith({
        id: 1,
        depth: 1,
        page: 2,
        limit: 20,
      });
      expect(result).toEqual(subordinates);
    });
  });
}); 