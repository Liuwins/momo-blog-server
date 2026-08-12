import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  signature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bgImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bgMusic?: string;
}
