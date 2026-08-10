import { Controller, Post, UseGuards, UploadedFiles, UploadedFile, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

// 只允许的图片 MIME 类型
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// 允许的视频 MIME 类型
const ALLOWED_VIDEO_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

// 文件大小限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 总计 30MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 单个视频 50MB

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
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      limits: {
        fileSize: MAX_FILE_SIZE,
        files: 9,
      },
      fileFilter: (req, file, cb) => {
        // 校验 MIME 类型（比扩展名更可靠）
        if (ALLOWED_MIME[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new HttpException(`不支持的文件类型: ${file.mimetype}`, HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new HttpException('没有收到文件', HttpStatus.BAD_REQUEST);
    }

    // 校验总大小
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new HttpException('文件总大小超过 30MB 限制', HttpStatus.BAD_REQUEST);
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const results: { url: string; thumb: string; mid: string }[] = [];
    for (const file of files) {
      // 再次校验 MIME（防御性）
      const ext = ALLOWED_MIME[file.mimetype];
      if (!ext) {
        throw new HttpException(`不支持的文件类型: ${file.mimetype}`, HttpStatus.BAD_REQUEST);
      }

      // 校验文件是否为有效图片（通过 sharp 解码）
      try {
        await sharp(file.buffer).metadata();
      } catch {
        throw new HttpException('文件不是有效的图片或已损坏', HttpStatus.BAD_REQUEST);
      }

      // 随机文件名（统一转 webp 格式，体积更小）
      const name = `${crypto.randomBytes(8).toString('hex')}`;
      const baseDir = path.join(uploadDir, name);

      // 确保目录存在
      fs.mkdirSync(baseDir, { recursive: true });

      // GIF 不压缩（sharp 不支持动图压缩），直接存原图
      if (file.mimetype === 'image/gif') {
        // GIF 仍需校验大小（已在 limits 中完成）
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

  // 视频上传：单文件，限 50MB，仅校验 MIME + 扩展名（不走 sharp）
  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_VIDEO_SIZE },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_VIDEO_MIME[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new HttpException(`不支持的视频类型: ${file.mimetype}`, HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('没有收到视频文件', HttpStatus.BAD_REQUEST);
    }

    // 防御性二次校验
    const ext = ALLOWED_VIDEO_MIME[file.mimetype];
    if (!ext) {
      throw new HttpException(`不支持的视频类型: ${file.mimetype}`, HttpStatus.BAD_REQUEST);
    }

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 随机文件名，存到 images/<hash>/video.<ext>
    const name = crypto.randomBytes(8).toString('hex');
    const baseDir = path.join(uploadDir, name);
    fs.mkdirSync(baseDir, { recursive: true });

    const filename = `video${ext}`;
    fs.writeFileSync(path.join(baseDir, filename), file.buffer);

    return { url: `/images/${name}/${filename}` };
  }
}
