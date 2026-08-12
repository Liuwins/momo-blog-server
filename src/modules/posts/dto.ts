import { IsOptional, IsString, MaxLength, IsArray, ArrayMaxSize, ArrayUnique, ValidateIf, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';

@ValidatorConstraint({ name: 'NotEmptyPost', async: false })
export class NotEmptyPostConstraint implements ValidatorConstraintInterface {
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as CreatePostDto;
    const content = (obj.content || '').trim();
    const images = obj.images || [];
    const videos = obj.videos || [];
    return content.length > 0 || images.length > 0 || videos.length > 0;
  }
  defaultMessage() {
    return '文章内容、图片或视频至少填写一个';
  }
}

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '视频最多 9 个' })
  videos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  music?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  tags?: string[];

  @Validate(NotEmptyPostConstraint)
  notEmpty: boolean = true;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9, { message: '视频最多 9 个' })
  videos?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  music?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '标签最多 5 个' })
  @ArrayUnique({ message: '标签不能重复' })
  tags?: string[];
}

export class QueryPostsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'latest' | 'hot';

  @IsOptional()
  @IsString()
  tag?: string;
}
