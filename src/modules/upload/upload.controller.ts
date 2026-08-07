import { Controller, Post, UseGuards, UploadedFiles, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

// 只允许图片类型
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 多尺寸配置：缩略图（列表用）、中图（详情页）、原图（点击放大）
const SIZES = {
  thumb: 320,   // 列表/卡片缩略图
  mid: 750,     // 详情页中等尺寸
  // orig: 原图保存，不缩放
};

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

    const results: { url: string; thumb: string; mid: string }[] = [];
    for (const file of files) {
      // 校验文件类型（白名单）
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        throw new HttpException(`不支持的文件类型: ${ext || '(无扩展名)'}`, HttpStatus.BAD_REQUEST);
      }
      // 随机文件名（统一转 webp 格式，体积更小）
      const name = `${crypto.randomBytes(8).toString('hex')}`;
      const baseDir = path.join(uploadDir, name);

      // 确保目录存在
      fs.mkdirSync(baseDir, { recursive: true });

      // GIF 不压缩（sharp 不支持动图压缩），直接存原图
      if (ext === '.gif') {
        const origPath = path.join(baseDir, 'orig.gif');
        fs.writeFileSync(origPath, file.buffer);
        results.push({
          url: `/images/${name}/orig.gif`,
          thumb: `/images/${name}/orig.gif`,
          mid: `/images/${name}/orig.gif`,
        });
        continue;
      }

      // 用 sharp 生成多尺寸 webp
      const image = sharp(file.buffer, { failOn: 'none' });
      const meta = await image.metadata();

      // 原图（转 webp，质量 85）
      await image
        .webp({ quality: 85 })
        .toFile(path.join(baseDir, 'orig.webp'));

      // 中图（max 750px 宽）
      const midWidth = Math.min(meta.width || SIZES.mid, SIZES.mid);
      await image
        .resize({ width: midWidth, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(baseDir, 'mid.webp'));

      // 缩略图（max 320px 宽）
      const thumbWidth = Math.min(meta.width || SIZES.thumb, SIZES.thumb);
      await image
        .resize({ width: thumbWidth, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(path.join(baseDir, 'thumb.webp'));

      results.push({
        url: `/images/${name}/orig.webp`,
        mid: `/images/${name}/mid.webp`,
        thumb: `/images/${name}/thumb.webp`,
      });
    }

    // 返回多尺寸 URL，兼容旧前端（urls 字段保留原图 URL）
    return {
      urls: results.map((r) => r.url),
      images: results, // 新字段：含多尺寸
    };
  }
}
