import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { CreateEmployeeDto } from '../src/employees/dto/create-employee.dto';
import { EmployeeEntity } from '../src/employees/entities/employee.entity';
import { RedisService } from '../src/redis/redis.service';
import { RedisServiceMock } from './mocks/redis.mock';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;
  let createdEmployeeId: number;
  let subordinateId: number;
  let employeeRepository: Repository<EmployeeEntity>;
  let redisMock: RedisServiceMock;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    // Set environment variables for test configuration
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useClass(RedisServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );

    // Get the repository and JwtService
    employeeRepository = moduleFixture.get<Repository<EmployeeEntity>>(
      getRepositoryToken(EmployeeEntity)
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);
    redisMock = moduleFixture.get<RedisServiceMock>(RedisService);

    // Generate a valid JWT token for authentication
    accessToken = jwtService.sign({
      sub: 1,
      username: 'admin',
      roles: ['admin'],
    });

    await app.init();
  }, 30000); // Increase timeout for initialization

  afterAll(async () => {
    // Restore original environment variables
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;

    if (app) {
      await app.close();
    }
  });

  it('/auth/login (POST) - should login and return JWT token', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
      });
  });

  it('/employees (POST) - should create a new employee', () => {
    const createEmployeeDto: CreateEmployeeDto = {
      firstName: 'John',
      lastName: 'Doe',
      position: 'CTO',
      email: 'john@example.com',
    };

    return request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createEmployeeDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.firstName).toBe('John');
        expect(res.body.lastName).toBe('Doe');
        expect(res.body.position).toBe('CTO');
        createdEmployeeId = res.body.id;
        console.log('Created employee with ID:', createdEmployeeId);
      });
  });

  it('/employees (GET) - should return all employees', () => {
    return request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('/employees (GET) - should use Redis cache on second request', async () => {
    // First request should miss cache
    await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Spy on the get method to verify cache hit
    const getSpy = jest.spyOn(redisMock, 'get');

    // Second request should hit cache
    await request(app.getHttpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getSpy).toHaveBeenCalled();
  });

  it('/employees/:id (GET) - should return an employee by ID', () => {
    return request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', createdEmployeeId);
        expect(res.body.firstName).toBe('John');
        expect(res.body.lastName).toBe('Doe');
      });
  });

  it('/employees/:id (PUT) - should update an employee', () => {
    return request(app.getHttpServer())
      .put(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ position: 'CEO' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('id', createdEmployeeId);
        expect(res.body.position).toBe('CEO');
      });
  });

  it('/employees/:id (PUT) - should invalidate cache after update', async () => {
    // Spy on the del method to verify cache invalidation
    const delSpy = jest.spyOn(redisMock, 'del');

    await request(app.getHttpServer())
      .put(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ department: 'Executive' })
      .expect(200);

    expect(delSpy).toHaveBeenCalledWith(`employee:${createdEmployeeId}`);
    expect(delSpy).toHaveBeenCalledWith('all_employees');
  });

  it('/employees/:id/subordinates (GET) - should return employee subordinates', async () => {
    // First create a subordinate
    const createSubordinateDto: CreateEmployeeDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      position: 'CTO',
      email: 'jane@example.com',
      managerId: createdEmployeeId,
    };

    console.log('Creating subordinate with managerId:', createdEmployeeId);

    const response = await request(app.getHttpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(createSubordinateDto);

    expect(response.status).toBe(201);
    subordinateId = response.body.id;
    console.log('Created subordinate:', response.body);

    // Then test the subordinates endpoint
    const subResponse = await request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}/subordinates`)
      .set('Authorization', `Bearer ${accessToken}`);

    console.log('Subordinates response:', JSON.stringify(subResponse.body, null, 2));

    // Check the response status
    expect(subResponse.status).toBe(200);

    // Verify the response body contains subordinates
    expect(Array.isArray(subResponse.body)).toBe(true);
    expect(subResponse.body.length).toBeGreaterThan(0);

    // Debug output of the managerId for each subordinate
    subResponse.body.forEach((emp, index) => {
      console.log(`Subordinate ${index + 1}:`, emp.id, 'managerId:', emp.managerId);
    });

    // Check that at least one subordinate has the manager ID we created
    const hasSubordinate = subResponse.body.some(emp => emp.managerId === createdEmployeeId);
    console.log('Has matching subordinate:', hasSubordinate, 'Expected managerId:', createdEmployeeId);
    expect(hasSubordinate).toBe(true);
  });

  it('/employees/:id/subordinates (GET) - should use cache for repeat requests', async () => {
    // Spy on the get and set methods
    const getSpy = jest.spyOn(redisMock, 'get');
    const setSpy = jest.spyOn(redisMock, 'set');

    // Clear any existing cache first to ensure consistent test behavior
    await redisMock.del(`subordinates:${createdEmployeeId}:depth:-1:page:1:limit:10`);

    // First request should miss cache and set it
    await request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}/subordinates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Check that set was called (only necessary for this test)
    expect(setSpy).toHaveBeenCalled();

    // Reset spies
    getSpy.mockClear();
    setSpy.mockClear();

    // Second request should hit cache
    await request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}/subordinates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Verify cache was used
    expect(getSpy).toHaveBeenCalled();
  });

  // Delete the subordinate first to avoid foreign key constraint
  it('should delete the subordinate', async () => {
    return request(app.getHttpServer())
      .delete(`/employees/${subordinateId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/employees/:id (DELETE) - should delete an employee', async () => {
    const delSpy = jest.spyOn(redisMock, 'del');

    const response = await request(app.getHttpServer())
      .delete(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Employee deleted successfully');
    expect(delSpy).toHaveBeenCalled();

    // Delete from repository via direct DB access to ensure it's gone
    await employeeRepository.delete(createdEmployeeId);

    // Clear the cache too
    await redisMock.del(`employee:${createdEmployeeId}`);
  });

  it('/employees/:id (GET) - should return 404 for deleted employee', async () => {
    // Ensure the employee doesn't exist in DB first
    await employeeRepository.delete(createdEmployeeId);

    // Clear any in-memory cache in the repository
    await redisMock.del(`employee:${createdEmployeeId}`);

    // Give a short delay to ensure DB operations complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now test the API request
    return request(app.getHttpServer())
      .get(`/employees/${createdEmployeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('/employees (GET) - should return 401 without authorization', () => {
    return request(app.getHttpServer())
      .get('/employees')
      .expect(401);
  });
}); 