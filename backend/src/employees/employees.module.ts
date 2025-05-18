import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeEntity])],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
