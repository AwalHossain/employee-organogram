import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetSubordinatesDto } from './dto/get-subordinates.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({
    status: 201,
    description: 'The employee has been successfully created.',
    type: EmployeeEntity,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees' })
  @ApiResponse({
    status: 200,
    description: 'Return all employees',
    type: [EmployeeEntity],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return the employee',
    type: EmployeeEntity,
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an employee' })
  @ApiResponse({
    status: 200,
    description: 'The employee has been successfully updated.',
    type: EmployeeEntity,
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmployeeDto: UpdateEmployeeDto
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Employee not found.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.employeesService.remove(id);
    return { message: 'Employee deleted successfully' };
  }

  @Get(':id/subordinates')
  @ApiOperation({ summary: 'Get all subordinates of an employee' })
  @ApiResponse({
    status: 200,
    description: 'Return all subordinates',
    type: [EmployeeEntity],
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findSubordinates(
    @Param('id', ParseIntPipe) id: number,
    @Query('depth') depth: number = -1,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    const params: GetSubordinatesDto = { id, depth, page, limit };
    return this.employeesService.findSubordinates(params);
  }
}
