import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeEntity } from './entities/employee.entity';

@Injectable()
export class EmployeesRepository {
  constructor(
    @InjectRepository(EmployeeEntity)
    private employeeRepository: Repository<EmployeeEntity>
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const employee = this.employeeRepository.create(createEmployeeDto);
    return this.employeeRepository.save(employee);
  }

  async findAll(): Promise<EmployeeEntity[]> {
    return this.employeeRepository.find();
  }

  async findOne(id: number): Promise<EmployeeEntity> {
    const result = await this.employeeRepository.findOne({ where: { id } });
    if (!result) {
      throw new NotFoundException('Employee not found');
    }
    return result;
  }

  async update(
    id: number,
    updateEmployeeDto: UpdateEmployeeDto
  ): Promise<EmployeeEntity> {
    await this.employeeRepository.update(id, updateEmployeeDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.employeeRepository.delete(id);
  }

  async findSubordinates(id: number): Promise<EmployeeEntity[]> {
    // Find all direct subordinates
    return this.employeeRepository.find({
      where: { managerId: id },
      relations: ['subordinates'],
    });
  }

  /**
   * Find all subordinates recursively (including subordinates of subordinates)
   * Uses database-specific optimizations when available
   */
  async findAllSubordinatesRecursive(id: number): Promise<EmployeeEntity[]> {
    // Try to get the database type safely
    let dbType: string = 'unknown';
    try {
      // This might fail in test environments with mock repositories
      if (this.employeeRepository.metadata?.connection?.options?.type) {
        dbType = this.employeeRepository.metadata.connection.options.type as string;
      }
    } catch (error) {
      // If error occurs, default to the recursive approach
      dbType = 'unknown';
    }
    
    // Use efficient recursive CTE query for PostgreSQL
    if (dbType === 'postgres') {
      const recursiveQuery = ` 
        WITH RECURSIVE subordinates AS (
          SELECT * FROM employees WHERE manager_id = $1
          UNION ALL
          SELECT e.* FROM employees e
          INNER JOIN subordinates s ON e.manager_id = s.id
        )
        SELECT * FROM subordinates
      `;
      
      return this.employeeRepository.query(recursiveQuery, [id]);
    } 
    
    // Use a fallback approach for SQLite and other databases that 
    // may not support recursive CTEs or have different syntax
    else {
      // First get direct subordinates
      const directSubordinates = await this.findSubordinates(id);
      
      // Then recursively get their subordinates
      const allSubordinates: EmployeeEntity[] = [...directSubordinates];
      
      for (const subordinate of directSubordinates) {
        const nestedSubordinates = await this.findAllSubordinatesRecursive(subordinate.id);
        allSubordinates.push(...nestedSubordinates);
      }
      
      return allSubordinates;
    }
  }
}
