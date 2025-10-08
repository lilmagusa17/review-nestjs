import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsBoolean() isSold?: boolean;
}