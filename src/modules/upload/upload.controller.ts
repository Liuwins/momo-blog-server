import { Controller, Post, UseGuards, UploadedFiles, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 只允许图片类型
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(FilesInterceptor('files', 9))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new HttpException('没有收到文件', HttpStatus.BAD_REQUEST);
    }

    const uploadDir = process.env.UPLOAD_DIR || '/var/www/momo-blog/images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const urls: string[] = [];
    for (const file of files) {
      // 校验文件类型（白名单）
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        throw new HttpException(`不支持的文件类型: ${ext || '(无扩展名)'}`, HttpStatus.BAD_REQUEST);
      }
      // 随机文件名（防冲突）
      const name = `${crypto.randomBytes(8).toString('hex')}${ext}`;
      const dest = path.join(uploadDir, name);
      fs.writeFileSync(dest, file.buffer);
      urls.push(`/images/${name}`);
    }

    return { urls };
  }
}