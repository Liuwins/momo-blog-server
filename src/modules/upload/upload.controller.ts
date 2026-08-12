import { Controller, Post, UseGuards, UploadedFiles, UploadedFile, UseInterceptors, HttpException, HttpStatus, Logger, Catch, ExceptionFilter, ArgumentsHost, PayloadTooLargeException, UseFilters } from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminGuard } from '../auth/admin.guard';
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

// 允许的音频 MIME 类型（覆盖各浏览器上报差异：m4a 常上报为 audio/mp4 或 audio/x-m4a）
const ALLOWED_AUDIO_MIME: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/ogg': '.ogg',
  'audio/aac': '.aac',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/webm': '.webm',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
};

// 文件大小限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 总计 30MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 单个视频 50MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 单个音频 20MB

// 多尺寸配置：缩略图（列表用）、中图（详情页）、原图（点击放大）
const SIZES = {
  thumb: 320,   // 列表/卡片缩略图
  mid: 750,     // 详情页中等尺寸
  // orig: 原图保存，不缩放
};

// Multer 超限会抛 PayloadTooLargeException（默认英文 "File too large"），转成明确的中文提示
@Catch(PayloadTooLargeException)
export class UploadSizeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: '文件超过大小限制（图片单张 5MB / 音频 20MB / 视频 50MB）',
    });
  }
}

@Controller('upload')
// 单用户系统：所有上传（图片/视频/音频/封面）仅管理员可用
@UseGuards(JwtAuthGuard, AdminGuard)
@UseFilters(UploadSizeFilter)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  // 确保上传目录存在且可写，失败时抛出带明确原因的异常
  private ensureUploadDir(): string {
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'images');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.accessSync(uploadDir, fs.constants.W_OK);
    } catch (err) {
      this.logger.error(`上传目录不可用: ${uploadDir}, 原因: ${err.message}`);
      throw new HttpException(
        `服务器存储目录不可写，请联系管理员检查 UPLOAD_DIR 配置`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return uploadDir;
  }

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

    const uploadDir = this.ensureUploadDir();

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

    const uploadDir = this.ensureUploadDir();

    // 随机文件名，存到 images/<hash>/video.<ext>
    const name = crypto.randomBytes(8).toString('hex');
    const baseDir = path.join(uploadDir, name);
    fs.mkdirSync(baseDir, { recursive: true });

    const filename = `video${ext}`;
    fs.writeFileSync(path.join(baseDir, filename), file.buffer);

    return { url: `/images/${name}/${filename}` };
  }

  // 音频上传：单文件，限 20MB，仅校验 MIME
  @Post('audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AUDIO_SIZE },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_AUDIO_MIME[file.mimetype]) {
          cb(null, true);
        } else {
          cb(new HttpException(`不支持的音频类型: ${file.mimetype}（支持 mp3/wav/ogg/aac/m4a/flac/webm）`, HttpStatus.BAD_REQUEST), false);
        }
      },
    }),
  )
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('音频上传失败：请求中没有文件（字段名必须为 file）');
      throw new HttpException('没有收到音频文件', HttpStatus.BAD_REQUEST);
    }

    const ext = ALLOWED_AUDIO_MIME[file.mimetype];
    if (!ext) {
      this.logger.warn(`音频上传失败：不支持的类型 ${file.mimetype}`);
      throw new HttpException(`不支持的音频类型: ${file.mimetype}`, HttpStatus.BAD_REQUEST);
    }

    const uploadDir = this.ensureUploadDir();

    try {
      const name = crypto.randomBytes(8).toString('hex');
      const baseDir = path.join(uploadDir, name);
      fs.mkdirSync(baseDir, { recursive: true });

      // 保留原始文件名（去除扩展名后做安全过滤），让播放器能显示真实歌名
      const originalBase = path.parse(file.originalname).name || 'audio';
      const safeName = originalBase
        .replace(/[/\\:*?"<>|]/g, '_')  // 去除危险字符
        .replace(/\s+/g, ' ')            // 合并空白
        .trim()
        .substring(0, 60) || 'audio';
      const filename = `${safeName}${ext}`;
      fs.writeFileSync(path.join(baseDir, filename), file.buffer);

      this.logger.log(`音频上传成功: ${filename}, 大小 ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return { url: `/images/${name}/${filename}`, name: safeName };
    } catch (err) {
      this.logger.error(`音频写入磁盘失败: ${err.message}`, err.stack);
      throw new HttpException(
        `音频保存失败: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
