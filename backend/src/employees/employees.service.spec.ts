import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '../redis/redis.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetSubordinatesDto } from './dto/get-subordinates.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let repository: EmployeesRepository;

  const mockEmployeesRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findSubordinates: jest.fn(),
    findAllSubordinatesRecursive: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getStatus: jest.fn(),
    invalidateByPattern: jest.fn(),
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
    firstName: 'John',
    lastName: 'Doe',
    position: 'Software Engineer',
    email: 'john@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: 'IT',
    phoneNumber: '1234567890',
    isActive: true,
  };

  const mockSubordinate1: Partial<EmployeeEntity> = {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    position: 'Junior Developer',
    email: 'jane@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    department: 'IT',
    phoneNumber: '1234567890',
    isActive: true,
  };

  const mockSubordinate2: Partial<EmployeeEntity> = {
    id: 3,
    firstName: 'Bob',
    lastName: 'Johnson',
    position: 'Junior Developer',
    email: 'bob@example.com',
    managerId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: EmployeesRepository,
          useValue: mockEmployeesRepository,
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

    service = module.get<EmployeesService>(EmployeesService);
    repository = module.get<EmployeesRepository>(EmployeesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        position: 'Software Engineer',
        email: 'john@example.com',
        managerId: undefined,
      };

      mockEmployeesRepository.create.mockResolvedValue(mockEmployee);

      const result = await service.create(createEmployeeDto);

      expect(mockEmployeesRepository.create).toHaveBeenCalledWith(createEmployeeDto);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return an array of employees', async () => {
      const mockEmployees = [mockEmployee, mockSubordinate1, mockSubordinate2];
      mockEmployeesRepository.findAll.mockResolvedValue(mockEmployees);

      const result = await service.findAll();

      expect(mockEmployeesRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEmployees);
    });

    it('should return an empty array if no employees found', async () => {
      mockEmployeesRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockEmployeesRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an employee when found', async () => {
      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);

      const result = await service.findOne(1);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeesRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Employee with ID 999 not found')
      );

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(999);
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

      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);
      mockEmployeesRepository.update.mockResolvedValue(updatedEmployee);

      const result = await service.update(1, updateEmployeeDto);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesRepository.update).toHaveBeenCalledWith(1, updateEmployeeDto);
      expect(result).toEqual(updatedEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        position: 'Senior Software Engineer',
      };

      mockEmployeesRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateEmployeeDto)).rejects.toThrow(
        new NotFoundException('Employee with ID 999 not found')
      );

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(999);
      expect(mockEmployeesRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove an employee when found', async () => {
      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);
      mockEmployeesRepository.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesRepository.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Employee with ID 999 not found')
      );

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(999);
      expect(mockEmployeesRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('findSubordinates', () => {
    it('should return direct subordinates when depth is 1', async () => {
      const params: GetSubordinatesDto = {
        id: 1,
        depth: 1,
        page: 1,
        limit: 10,
      };

      const subordinates = [mockSubordinate1, mockSubordinate2];

      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);
      mockEmployeesRepository.findSubordinates.mockResolvedValue(subordinates);

      const result = await service.findSubordinates(params);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesRepository.findSubordinates).toHaveBeenCalledWith(1);
      expect(result).toEqual(subordinates);
    });

    it('should return all recursive subordinates when depth is -1', async () => {
      const params: GetSubordinatesDto = {
        id: 1,
        depth: -1,
        page: 1,
        limit: 10,
      };

      const allSubordinates = [
        mockSubordinate1,
        mockSubordinate2,
        // Add deeper level subordinates if needed for your test
      ];

      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);
      mockEmployeesRepository.findAllSubordinatesRecursive.mockResolvedValue(allSubordinates);

      const result = await service.findSubordinates(params);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesRepository.findAllSubordinatesRecursive).toHaveBeenCalledWith(1, 1, 10);
      expect(result).toEqual(allSubordinates);
    });

    it('should return all subordinates for any other depth value', async () => {
      const params: GetSubordinatesDto = {
        id: 1,
        depth: 2, // Any value other than 1 or -1
        page: 1,
        limit: 10,
      };

      const allSubordinates = [
        mockSubordinate1,
        mockSubordinate2,
        // Add deeper level subordinates if needed for your test
      ];

      mockEmployeesRepository.findOne.mockResolvedValue(mockEmployee);
      mockEmployeesRepository.findAllSubordinatesRecursive.mockResolvedValue(allSubordinates);

      const result = await service.findSubordinates(params);

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesRepository.findAllSubordinatesRecursive).toHaveBeenCalledWith(1, 1, 10);
      expect(result).toEqual(allSubordinates);
    });

    it('should throw NotFoundException when employee not found', async () => {
      const params: GetSubordinatesDto = {
        id: 999,
        depth: -1,
        page: 1,
        limit: 10,
      };

      mockEmployeesRepository.findOne.mockResolvedValue(null);

      await expect(service.findSubordinates(params)).rejects.toThrow(
        new NotFoundException('Employee with ID 999 not found')
      );

      expect(mockEmployeesRepository.findOne).toHaveBeenCalledWith(999);
      expect(mockEmployeesRepository.findSubordinates).not.toHaveBeenCalled();
      expect(mockEmployeesRepository.findAllSubordinatesRecursive).not.toHaveBeenCalled();
    });
  });
}); 