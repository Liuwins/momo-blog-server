import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PostsService } from '../posts/posts.service';

/**
 * HTML 实体转义，防止存储型 XSS
 * 转义所有可能破坏 HTML 结构的字符
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

@Controller('og')
export class OgController {
  constructor(private postsService: PostsService) {}

  // 爬虫/分享链接抓取时返回带 OpenGraph meta 的静态 HTML
  @Get('post/:id')
  async postCard(@Param('id') id: number, @Res() res: Response) {
    const site = 'https://blog.codx.top';
    try {
      const data = await this.postsService.findById(id);
      const post = data || null;

      // 所有用户内容必须转义后才能拼入 HTML
      const title = post ? `${escapeHtml(post.user?.nickname || '博主')} 的动态` : 'MomoBlog';
      const desc = post ? escapeHtml((post.content || '').replace(/\s+/g, ' ').slice(0, 100)) : '朋友圈式个人博客';
      // 取第一张图做分享卡片，没有则用默认封面
      const img = post?.images?.length
        ? `${site}${escapeHtml(post.images[0])}`
        : `${site}/images/og-cover.webp`;
      const url = `${site}/post/${id}`;

      const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<meta property="og:site_name" content="MomoBlog" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${img}" />
<meta property="og:url" content="${url}" />
<meta name="description" content="${desc}" />
<meta itemprop="name" content="${title}" />
<meta itemprop="description" content="${desc}" />
<meta itemprop="image" content="${img}" />
</head>
<body>
<p><a href="${url}">${title}</a></p>
</body>
</html>`;

      res.type('html').send(html);
    } catch (e) {
      res.type('html').send(`<!DOCTYPE html><html><head><title>MomoBlog</title></head><body><p><a href="${site}/">MomoBlog</a></p></body></html>`);
    }
  }
}
