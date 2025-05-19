import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';



import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RedisService } from '../redis/redis.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { GetSubordinatesDto } from './dto/get-subordinates.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeEntity } from './entities/employee.entity';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  private static readonly TEST_CACHE_KEY = 'cache-test-key';
  private lastCacheTestTime = 0;

  constructor(
    private readonly employeesService: EmployeesService,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext('EmployeesController');
  }

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

  @Get('cache-test')
  @ApiOperation({ summary: 'Test if Redis cache is working' })
  @ApiResponse({
    status: 200,
    description: 'Cache test result',
  })


  async testCache() {
    const now = Date.now();
    if (now - this.lastCacheTestTime < 1000) {
      // If called within 1 second, return cached response from memory
      return {
        success: true,
        cached: true,
        throttled: true,
        message: 'Cache request throttled due to high frequency',
        timestamp: new Date().toISOString()
      };
    }

    this.lastCacheTestTime = now;
    const testKey = EmployeesController.TEST_CACHE_KEY;

    // First try to get from cache
    let cachedValue = await this.redisService.get(testKey);

    if (!cachedValue) {
      const testValue = {
        message: 'Cache test',
        timestamp: new Date().toISOString()
      };

      await this.redisService.set(testKey, testValue, 300);
      cachedValue = testValue;
    }

    return {
      success: true,
      cachedValue: cachedValue,
      timestamp: new Date().toISOString()
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return all employees',
    type: [EmployeeEntity],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50
  ) {
    return this.employeesService.findAll(page, limit);
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
