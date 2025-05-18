import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(loginDto: LoginDto) {
    // In a real application, you would validate credentials against a database
    // For this example, we'll use hardcoded credentials
    if (loginDto.username !== 'admin' || loginDto.password !== 'admin') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: 1,
      username: loginDto.username,
      roles: ['admin'],
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  validateToken(token: string) {
    try {
      this.jwtService.verify(token);
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
