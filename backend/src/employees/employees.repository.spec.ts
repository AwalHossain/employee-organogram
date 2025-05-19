import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';
import { EmployeeEntity } from './entities/employee.entity';


describe('EmployeesRepository', () => {
  let repository: EmployeesRepository;
  let employeeRepository: Repository<EmployeeEntity>;

  const mockEmployee: Partial<EmployeeEntity> = {
    id: 12,
    firstName: 'John',
    lastName: 'Doe',
    position: 'Software Engineer',
    email: 'john@example.com',
    managerId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    metadata: {
      connection: {
        options: {
          type: 'sqlite'
        }
      }
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesRepository,
        {
          provide: getRepositoryToken(EmployeeEntity),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    repository = module.get<EmployeesRepository>(EmployeesRepository);
    employeeRepository = module.get<Repository<EmployeeEntity>>(
      getRepositoryToken(EmployeeEntity)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new employee', async () => {
      const createEmployeeDto: CreateEmployeeDto = {
        firstName: 'John',
        lastName: 'Doe',
        position: 'Software Engineer',
        email: 'john@example.com',
        managerId: 1,
      };

      employeeRepository.create = jest.fn().mockReturnValue(mockEmployee);
      employeeRepository.save = jest.fn().mockResolvedValue(mockEmployee);

      const result = await repository.create(createEmployeeDto);

      expect(employeeRepository.create).toHaveBeenCalledWith(createEmployeeDto);
      expect(employeeRepository.save).toHaveBeenCalledWith(mockEmployee);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return an array of employees', async () => {
      const mockEmployees = [mockEmployee];
      employeeRepository.find = jest.fn().mockResolvedValue(mockEmployees);

      const result = await repository.findAll();

      expect(employeeRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockEmployees);
    });
  });

  describe('findOne', () => {
    it('should return an employee when found', async () => {
      employeeRepository.findOne = jest.fn().mockResolvedValue(mockEmployee);

      const result = await repository.findOne(1);

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(repository.findOne(999)).rejects.toThrow(
        new NotFoundException('Employee not found')
      );

      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('update', () => {
    it('should update an employee and return the updated entity', async () => {
      const updateEmployeeDto: UpdateEmployeeDto = {
        position: 'Senior Software Engineer',
      };

      const updatedEmployee = {
        ...mockEmployee,
        position: 'Senior Software Engineer',
      };

      employeeRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      employeeRepository.findOne = jest.fn().mockResolvedValue(updatedEmployee);

      const result = await repository.update(1, updateEmployeeDto);

      expect(employeeRepository.update).toHaveBeenCalledWith(1, updateEmployeeDto);
      expect(employeeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should delete an employee by id', async () => {
      employeeRepository.delete = jest.fn().mockResolvedValue({ affected: 1 });

      await repository.remove(1);

      expect(employeeRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('findSubordinates', () => {
    it('should return direct subordinates of an employee', async () => {
      const subordinate1: Partial<EmployeeEntity> = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        position: 'Junior Developer',
        managerId: 1,
      };

      const subordinate2: Partial<EmployeeEntity> = {
        id: 3,
        firstName: 'Bob',
        lastName: 'Johnson',
        position: 'Junior Developer',
        managerId: 1,
      };

      const directSubordinates = [subordinate1, subordinate2];
      employeeRepository.find = jest.fn().mockResolvedValue(directSubordinates);

      const result = await repository.findSubordinates(1);

      expect(employeeRepository.find).toHaveBeenCalledWith({
        where: { managerId: 1 },
        relations: ['subordinates'],
      });
      expect(result).toEqual(directSubordinates);
    });
  });

  describe('findAllSubordinatesRecursive', () => {
    it('should return all subordinates recursively', async () => {
      // Create test data
      const directSubordinate1 = {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        position: 'Junior Developer',
        managerId: 1,
      };

      const directSubordinate2 = {
        id: 3,
        firstName: 'Bob',
        lastName: 'Johnson',
        position: 'Junior Developer',
        managerId: 1,
      };

      const nestedSubordinate = {
        id: 4,
        firstName: 'Alice',
        lastName: 'Brown',
        position: 'Intern',
        managerId: 2,
      };

      // Create a mock array of all employees
      const allEmployees = [
        { id: 1, firstName: 'John', lastName: 'Doe', position: 'Manager', managerId: null },
        directSubordinate1,
        directSubordinate2,
        nestedSubordinate
      ];

      // Mock the find method to return all employees
      employeeRepository.find = jest.fn().mockResolvedValue(allEmployees);

      // Call the method we want to test
      const result = await repository.findAllSubordinatesRecursive(1, 1, 20);

      // Expect find to be called
      expect(employeeRepository.find).toHaveBeenCalled();

      // Check that the result includes the right subordinates
      expect(result.length).toBe(3);
      expect(result).toContainEqual(expect.objectContaining({ id: 2 }));
      expect(result).toContainEqual(expect.objectContaining({ id: 3 }));
      expect(result).toContainEqual(expect.objectContaining({ id: 4 }));
    });
  });
}); 