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
  ) { }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeEntity> {
    const employee = this.employeeRepository.create(createEmployeeDto);
    return this.employeeRepository.save(employee);
  }

  async findAll(page: number = 1, limit: number = 50): Promise<EmployeeEntity[]> {
    const skip = (page - 1) * limit;

    return this.employeeRepository.find({
      skip,
      take: limit,
      cache: 60000, // Enable TypeORM's query result cache for 1 minute
    });
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
  async findAllSubordinatesRecursive(id: number, page = 1, limit = 20): Promise<EmployeeEntity[]> {
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

    const offset = (page - 1) * limit;

    // Use efficient recursive CTE query for PostgreSQL
    if (dbType === 'postgres') {
      const recursiveQuery = `
        WITH RECURSIVE subordinates AS (
          SELECT *, 1 as depth FROM employees WHERE manager_id = $1
          UNION ALL
          SELECT e.*, s.depth + 1 FROM employees e
          INNER JOIN subordinates s ON e.manager_id = s.id
          WHERE s.depth < 10 -- Prevent infinite recursion with a reasonable depth limit
        )
        SELECT * FROM subordinates
        ORDER BY id
        OFFSET $2 LIMIT $3
      `;

      return this.employeeRepository.query(recursiveQuery, [id, offset, limit]);

    } else {
      // For SQLite and other databases, use a more efficient approach
      const allEmployees = await this.employeeRepository.find({
        cache: {
          id: `all_employees_for_subordinates`,
          milliseconds: 60000 // Cache for 1 minute
        }
      });

      // Map for faster lookup
      const employeeMap = new Map<number, EmployeeEntity>();
      const result: EmployeeEntity[] = [];

      // Build the map for O(1) lookups
      allEmployees.forEach(emp => {
        employeeMap.set(emp.id, emp);
      });

      // Initial direct subordinates
      const queue = allEmployees
        .filter(emp => emp.managerId === id)
        .map(emp => emp.id);

      // Process queue iteratively instead of recursively
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (currentId !== undefined) {
          const employee = employeeMap.get(currentId);

          if (employee) {
            result.push(employee);

            // Add all direct subordinates to the queue
            allEmployees
              .filter(emp => emp.managerId === currentId)
              .forEach(subordinate => {
                queue.push(subordinate.id);
              });
          }
        }
      }

      // Apply pagination in memory
      return result.slice(offset, offset + limit);
    }
  }
}
