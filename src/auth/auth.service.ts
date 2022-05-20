import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthDTO } from './dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Tokens } from './types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private prisma: PrismaService) {}

  async singinLocal(dto: AuthDTO): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user || !this.comparePassword(dto.password, user.hash))
      throw new ForbiddenException('Access Denied!');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async signupLocal(dto: AuthDTO): Promise<Tokens> {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash: await this.hashData(dto.password),
        },
      });

      const tokens = await this.getTokens(newUser.id, newUser.email);
      await this.updateRtHash(newUser.id, tokens.refresh_token);
      return tokens;
    } catch (error) {
      throw new Error('Not Able to Sign Up!');
    }
  }

  async logout(userId: string) {
    try {
      await this.prisma.user.updateMany({
        where: {
          id: userId,
          hashedRt: {
            not: null,
          },
        },
        data: {
          hashedRt: null,
        },
      });
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
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt,
      },
    });
  }

  async hashData(data: string) {
    return bcrypt.hash(data, 10);
  }

  async comparePassword(password: string, hasedPassword: string) {
    return bcrypt.compare(password, hasedPassword);
  }

  async refreshToken(userId: string, rt: string): Promise<Tokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    console.log(user);
    console.log(rt);
    if (!user || (await bcrypt.compare(rt, user.hashedRt)))
      throw new ForbiddenException('Access Denied!');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRtHash(user.id, tokens.refresh_token);
    return tokens;
  }
}

// TODO: Make sure the helper methods are better located
