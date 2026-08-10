import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';

// 关注关系：follower 关注 following
@Entity('follows')
@Unique('UQ_follow_pair', ['followerId', 'followingId'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  followerId: number;

  @Column()
  @Index()
  followingId: number;

  @CreateDateColumn()
  createdAt: Date;
}
