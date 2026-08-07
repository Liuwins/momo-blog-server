import { IsInt, IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  postId: number;

  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsInt()
  replyToId?: number;

  @IsOptional()
  @IsString()
  replyToNickname?: string;
}
