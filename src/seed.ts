import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';

async function seed() {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const postRepo = AppDataSource.getRepository(Post);
  const commentRepo = AppDataSource.getRepository(Comment);
  const likeRepo = AppDataSource.getRepository(Like);

  // Ensure clean start (delete existing data)
  await likeRepo.clear();
  await commentRepo.clear();
  await postRepo.clear();
  await userRepo.clear();

  // Create single user: admin / admin123
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await userRepo.save(
    userRepo.create({
      username: 'admin',
      password: hashedPassword,
      nickname: '博主',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      signature: '记录生活，分享美好',
    }),
  );

  const postsData = [
    {
      content: '今天终于把困扰了我三天的 bug 修好了！原来是一个异步竞态条件导致的，调试了好久才发现。分享一个小技巧：遇到异步问题，先画个时序图理清思路，比盲目打断点高效多了 💪',
      images: [],
    },
    {
      content: '周末去了趟西湖，天气特别好，拍了好多照片。断桥残雪虽然没有雪，但夕阳下的湖面真的太美了。推荐大家秋天来杭州，人少景美 🍂',
      images: ['https://images.unsplash.com/photo-1598887142487-3c854d51eabb?w=400', 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=400'],
    },
    {
      content: '最近在学 Vue 3 的 Composition API，感觉比 Options API 灵活很多。特别是 useRoute 和 useRouter 的组合使用，代码组织清晰多了。推荐大家看看 Vue 官方的教程，写得很棒 👍',
      images: [],
    },
    {
      content: '今天做了一道超好吃的红烧肉！秘诀是先用冰糖炒糖色，小火慢炖两个小时，最后大火收汁。入口即化，肥而不腻 🤤',
      images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=400', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400'],
    },
    {
      content: '分享一下我的读书笔记：《人类简史》里说，人类之所以能统治地球，是因为我们能进行大规模灵活合作。这个观点让我重新思考了团队协作的重要性。推荐这本书，真的很有启发 📚',
      images: [],
    },
    {
      content: '周末去爬了黄山，虽然累得不行，但看到云海的那一刻觉得一切都值了！大自然的鬼斧神工真的让人叹为观止。下次还要来，争取看到日出 🏔️',
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400'],
    },
    {
      content: '今天团队完成了一个大项目的上线，连续加班两周终于有了成果。感谢团队里每一个小伙伴的付出！今晚请大家吃火锅庆祝 🎉',
      images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'],
    },
    {
      content: '最近开始学习吉他，手指按弦按得生疼，但能弹出简单的旋律了。学新技能的过程虽然辛苦，但每一次进步都让人充满成就感 🎸',
      images: [],
    },
    {
      content: '今天在公司楼下偶遇一只超可爱的橘猫，胖乎乎的，特别亲人。蹲下来摸它，它就蹭过来呼噜呼噜的。养猫的冲动又上来了 😻',
      images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400', 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400'],
    },
    {
      content: '分享一个前端开发小技巧：用 CSS 的 aspect-ratio 属性可以轻松实现图片等比例缩放，不用再 hack padding-bottom 了。浏览器支持已经很好了，赶紧用起来吧 🚀',
      images: [],
    },
    {
      content: '今天去了一家超赞的咖啡馆，手冲咖啡的味道真的很棒。店主是个咖啡爱好者，给我讲了很多关于咖啡豆产地和烘焙的知识。原来咖啡的世界这么丰富 ☕',
      images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'],
    },
    {
      content: '终于把家里的阳台改造成了小花园，种了多肉、绿萝和薄荷。每天早上起来浇浇水，看看绿色，心情都变好了 🌱',
      images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400'],
    },
  ];

  // Save posts with images as arrays (TypeORM simple-array handles conversion)
  // Spread createdAt across recent times (newest first)
  const now = Date.now();
  const savedPosts: Post[] = [];
  for (let i = 0; i < postsData.length; i++) {
    const p = postsData[i];
    const hoursAgo = (postsData.length - i) * 3;
    const createdAt = new Date(now - hoursAgo * 3600 * 1000);
    const post = await postRepo.save(
      postRepo.create({
        userId: user.id,
        content: p.content,
        images: p.images,
        likeCount: 0,
        commentCount: 0,
        createdAt,
        updatedAt: createdAt,
      }),
    );
    savedPosts.push(post);
  }

  // Add some likes (self-liked a few)
  for (let i = 0; i < savedPosts.length; i++) {
    if (i % 3 === 0) {
      await likeRepo.save(
        likeRepo.create({ userId: user.id, postId: savedPosts[i].id }),
      );
      savedPosts[i].likeCount += 1;
      await postRepo.save(savedPosts[i]);
    }
  }

  // Add a few self-comments
  const commentsData = [
    { postIdx: 0, content: '后来又发现了一个类似的问题，用同样的方法很快就解决了' },
    { postIdx: 3, content: '菜谱已整理，下次再分享详细步骤' },
    { postIdx: 5, content: '下次一定要去看日出！' },
    { postIdx: 8, content: '后来又去看了好几次，橘猫还在那里' },
  ];

  for (const c of commentsData) {
    const post = savedPosts[c.postIdx];
    await commentRepo.save(
      commentRepo.create({
        postId: post.id,
        userId: user.id,
        content: c.content,
        replyToId: null,
        replyToNickname: '',
      }),
    );
    post.commentCount += 1;
    await postRepo.save(post);
  }

  console.log('Seed data inserted successfully!');
  console.log(`User: admin (password: admin123)`);
  console.log(`Posts: ${savedPosts.length}`);

  // Verify images are stored correctly as arrays
  const sample = await postRepo.findOne({ where: { images: undefined } });
  const allPosts = await postRepo.find({ order: { id: 'DESC' }, take: 3 });
  for (const p of allPosts) {
    console.log(`post ${p.id}: images=${JSON.stringify(p.images)}`);
  }

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});