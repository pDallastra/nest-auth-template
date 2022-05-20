import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthDTO } from './dto';
import { Tokens } from './types';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/local/signin')
  @HttpCode(HttpStatus.OK)
  singinLocal(@Body() dto: AuthDTO): Promise<Tokens> {
    return this.authService.singinLocal(dto);
  }

  @Post('/local/signup')
  @HttpCode(HttpStatus.CREATED)
  signupLocal(@Body() dto: AuthDTO): Promise<Tokens> {
    return this.authService.signupLocal(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    const user = req.user;
    return this.authService.logout(user['sub']);
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Req() req: Request): Promise<Tokens> {
    const user = req.user;
    return this.authService.refreshToken(user['sub'], user['refreshToken']);
  }
}
