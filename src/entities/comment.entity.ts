import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from './user.entity';

export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  // 游客评论
  @Column({ type: 'varchar', default: '' })
  nickname: string;

  @Column({ type: 'varchar', default: '' })
  visitorId: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'varchar', default: CommentStatus.PENDING })
  status: CommentStatus;

  @Column({ nullable: true })
  replyToId: number;

  @Column({ type: 'varchar', default: '' })
  replyToNickname: string;

  @CreateDateColumn()
  createdAt: Date;
}
