import { IsEmail, IsNotEmpty, IsString, isString } from 'class-validator';

export class AuthDTO {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
