import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 新增字段：
 * - users.bgImage（个人主页背景图）
 * - users.bgMusic（个人主页背景音乐）
 * - posts.music（文章配乐）
 */
export class AddMusicAndBgImage1786418900000 implements MigrationInterface {
  name = 'AddMusicAndBgImage1786418900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite 使用 ADD COLUMN（单条执行，不支持 IF NOT EXISTS 在所有版本）
    const userCols = await queryRunner.query(
      `PRAGMA table_info(users)`,
    );
    const hasBgImage = (userCols as any[]).some((c) => c.name === 'bgImage');
    const hasBgMusic = (userCols as any[]).some((c) => c.name === 'bgMusic');
    if (!hasBgImage) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "bgImage" varchar NOT NULL DEFAULT ''`);
    }
    if (!hasBgMusic) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "bgMusic" varchar NOT NULL DEFAULT ''`);
    }

    const postCols = await queryRunner.query(
      `PRAGMA table_info(posts)`,
    );
    const hasMusic = (postCols as any[]).some((c) => c.name === 'music');
    if (!hasMusic) {
      await queryRunner.query(`ALTER TABLE "posts" ADD COLUMN "music" varchar NOT NULL DEFAULT ''`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite 不支持 DROP COLUMN（3.35+ 支持），这里预留
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bgImage"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bgMusic"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "music"`);
  }
}
