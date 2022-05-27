import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUser } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async getUserByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async getUserById(id: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async updateRtHash(id: string, hashedRt): Promise<void> {
    await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        hashedRt,
      },
    });
  }

  async setUserHashedRtNull(id: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: {
        id,
        hashedRt: {
          not: null,
        },
      },
      data: {
        hashedRt: null,
      },
    });
  }

  async create(data: IUser): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
}
