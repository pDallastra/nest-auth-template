import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDTO } from './dto';
import { JwtService } from '@nestjs/jwt';
import { Tokens } from './types';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/core/db/user/user.service';
import { IUser } from 'src/core/db/user/dto/user.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async singinLocal(dto: AuthDTO): Promise<Tokens> {
    const user = await this.userService.getUserByEmail(dto.email);

    if (!user || !this.comparePassword(dto.password, user.hash))
      throw new ForbiddenException('Access Denied!');

    return this.generateAndUpdateTokens(user.id, user.email);
  }

  async generateAndUpdateTokens(
    userId: string,
    email: string,
  ): Promise<Tokens> {
    const tokens = await this.getTokens(userId, email);
    await this.userService.updateRtHash(userId, tokens.refresh_token);
    return tokens;
  }

  async signupLocal(dto: AuthDTO): Promise<Tokens> {
    try {
      const data = {
        email: dto.email,
        hash: await this.hashData(dto.password),
      } as IUser;
      const newUser = await this.userService.create(data);

      return this.generateAndUpdateTokens(newUser.id, newUser.email);
    } catch (error) {
      throw new Error('Not Able to Sign Up!');
    }
  }

  async logout(userId: string) {
    try {
      await this.userService.setUserHashedRtNull(userId);
    } catch (error) {
      throw new Error(error);
    }
  }

  async getTokens(userId: string, email: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: 'at-secret',
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: 'rt-secret',
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  async updateRtHash(userId: string, refreshToken: string): Promise<void> {
    const hashedRt = await this.hashData(refreshToken);
    await this.userService.updateRtHash(userId, hashedRt);
  }

  async hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async comparePassword(password: string, hasedPassword: string) {
    return bcrypt.compare(password, hasedPassword);
  }

  async refreshToken(userId: string, rt: string): Promise<Tokens> {
    const user = await this.userService.getUserById(userId);

    const rtMaches = await bcrypt.compare(rt, user.hashedRt);

    if (!user || !rtMaches) throw new ForbiddenException('Access Denied!');

    return this.generateAndUpdateTokens(user.id, user.email);
  }
}

// TODO: Make sure the helper methods are better located
