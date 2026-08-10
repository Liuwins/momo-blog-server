import { IsInt, IsString, MaxLength, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  postId: number;

  @IsNotEmpty({ message: '评论内容不能为空' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @IsOptional()
  @IsInt()
  replyToId?: number;

  @IsOptional()
  @IsString()
  replyToNickname?: string;
}
