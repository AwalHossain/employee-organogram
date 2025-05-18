import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetSubordinatesDto } from './dto/get-subordinates.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesRepository } from './employees.repository';
import { EmployeeEntity } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    return this.employeesRepository.create(createEmployeeDto);
  }

  async findAll(): Promise<EmployeeEntity[]> {
    return this.employeesRepository.findAll();
  }

  async findOne(id: number): Promise<EmployeeEntity> {
    const employee = await this.employeesRepository.findOne(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async update(
    id: number,
    updateEmployeeDto: UpdateEmployeeDto
  ): Promise<EmployeeEntity> {
    await this.findOne(id); // Check if employee exists
    return this.employeesRepository.update(id, updateEmployeeDto);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id); // Check if employee exists
    await this.employeesRepository.remove(id);
  }

  /**
   * Find all subordinates for an employee, with optional parameters for depth and pagination
   */
  async findSubordinates(
    params: GetSubordinatesDto
  ): Promise<EmployeeEntity[]> {
    // Check if employee exists
    await this.findOne(params.id);

    if (params.depth === -1) {
      // Get all levels of subordinates
      return this.employeesRepository.findAllSubordinatesRecursive(params.id);
    } else if (params.depth === 1) {
      // Get only direct subordinates
      return this.employeesRepository.findSubordinates(params.id);
    } else {
      // For any other depth, we need to implement a custom solution
      // This is a simplified version - in a real app we would implement pagination
      const allSubordinates =
        await this.employeesRepository.findAllSubordinatesRecursive(params.id);

      // Filter by depth (would require additional data or query to work correctly)
      // This is a placeholder for actual implementation
      return allSubordinates;
    }
  }
}
