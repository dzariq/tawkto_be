// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly users = [
    { id: 'user-1', username: 'testuser', password: 'password123' },
  ];

  constructor(private readonly jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = this.users.find(
      u => u.username === username && u.password === password,
    );

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUser(payload: any) {
    return { id: payload.sub, username: payload.username };
  }
}