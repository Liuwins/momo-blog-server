import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1786353568233 implements MigrationInterface {
    name = 'Init1786353568233'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "comments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "postId" integer NOT NULL, "userId" integer, "nickname" varchar NOT NULL DEFAULT (''), "visitorId" varchar NOT NULL DEFAULT (''), "content" text NOT NULL DEFAULT (''), "status" varchar NOT NULL DEFAULT ('pending'), "replyToId" integer, "replyToNickname" varchar NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "likes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "visitorId" varchar NOT NULL DEFAULT (''), "postId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_f90c716efa5169a1ecd9cfae2b6" UNIQUE ("visitorId", "postId"), CONSTRAINT "UQ_74b9b8cd79a1014e50135f266fe" UNIQUE ("userId", "postId"))`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL DEFAULT (''), "images" text NOT NULL DEFAULT (''), "videos" text NOT NULL DEFAULT (''), "tags" text NOT NULL DEFAULT (''), "likeCount" integer NOT NULL DEFAULT (0), "commentCount" integer NOT NULL DEFAULT (0), "liked" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "receiverId" integer NOT NULL, "senderId" integer, "type" varchar NOT NULL DEFAULT ('like'), "isRead" boolean NOT NULL DEFAULT (0), "postId" integer, "content" text NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar(50) NOT NULL, "password" varchar(100) NOT NULL, "nickname" varchar(20) NOT NULL, "avatar" varchar NOT NULL DEFAULT (''), "signature" varchar NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"))`);
        await queryRunner.query(`CREATE TABLE "follows" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "followerId" integer NOT NULL, "followingId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_follow_pair" UNIQUE ("followerId", "followingId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fdb91868b03a2040db408a5333" ON "follows" ("followerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ef463dd9a2ce0d673350e36e0f" ON "follows" ("followingId") `);
        await queryRunner.query(`CREATE TABLE "temporary_comments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "postId" integer NOT NULL, "userId" integer, "nickname" varchar NOT NULL DEFAULT (''), "visitorId" varchar NOT NULL DEFAULT (''), "content" text NOT NULL DEFAULT (''), "status" varchar NOT NULL DEFAULT ('pending'), "replyToId" integer, "replyToNickname" varchar NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_e44ddaaa6d058cb4092f83ad61f" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_7e8d7c49f218ebb14314fdb3749" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_comments"("id", "postId", "userId", "nickname", "visitorId", "content", "status", "replyToId", "replyToNickname", "createdAt") SELECT "id", "postId", "userId", "nickname", "visitorId", "content", "status", "replyToId", "replyToNickname", "createdAt" FROM "comments"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`ALTER TABLE "temporary_comments" RENAME TO "comments"`);
        await queryRunner.query(`CREATE TABLE "temporary_likes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "visitorId" varchar NOT NULL DEFAULT (''), "postId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_f90c716efa5169a1ecd9cfae2b6" UNIQUE ("visitorId", "postId"), CONSTRAINT "UQ_74b9b8cd79a1014e50135f266fe" UNIQUE ("userId", "postId"), CONSTRAINT "FK_cfd8e81fac09d7339a32e57d904" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_e2fe567ad8d305fefc918d44f50" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_likes"("id", "userId", "visitorId", "postId", "createdAt") SELECT "id", "userId", "visitorId", "postId", "createdAt" FROM "likes"`);
        await queryRunner.query(`DROP TABLE "likes"`);
        await queryRunner.query(`ALTER TABLE "temporary_likes" RENAME TO "likes"`);
        await queryRunner.query(`CREATE TABLE "temporary_posts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL DEFAULT (''), "images" text NOT NULL DEFAULT (''), "videos" text NOT NULL DEFAULT (''), "tags" text NOT NULL DEFAULT (''), "likeCount" integer NOT NULL DEFAULT (0), "commentCount" integer NOT NULL DEFAULT (0), "liked" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_ae05faaa55c866130abef6e1fee" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_posts"("id", "userId", "content", "images", "videos", "tags", "likeCount", "commentCount", "liked", "createdAt", "updatedAt") SELECT "id", "userId", "content", "images", "videos", "tags", "likeCount", "commentCount", "liked", "createdAt", "updatedAt" FROM "posts"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`ALTER TABLE "temporary_posts" RENAME TO "posts"`);
        await queryRunner.query(`CREATE TABLE "temporary_notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "receiverId" integer NOT NULL, "senderId" integer, "type" varchar NOT NULL DEFAULT ('like'), "isRead" boolean NOT NULL DEFAULT (0), "postId" integer, "content" text NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_d1e9b2452666de3b9b4d271cca0" FOREIGN KEY ("receiverId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_ddb7981cf939fe620179bfea33a" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_notifications"("id", "receiverId", "senderId", "type", "isRead", "postId", "content", "createdAt") SELECT "id", "receiverId", "senderId", "type", "isRead", "postId", "content", "createdAt" FROM "notifications"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`ALTER TABLE "temporary_notifications" RENAME TO "notifications"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" RENAME TO "temporary_notifications"`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "receiverId" integer NOT NULL, "senderId" integer, "type" varchar NOT NULL DEFAULT ('like'), "isRead" boolean NOT NULL DEFAULT (0), "postId" integer, "content" text NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "notifications"("id", "receiverId", "senderId", "type", "isRead", "postId", "content", "createdAt") SELECT "id", "receiverId", "senderId", "type", "isRead", "postId", "content", "createdAt" FROM "temporary_notifications"`);
        await queryRunner.query(`DROP TABLE "temporary_notifications"`);
        await queryRunner.query(`ALTER TABLE "posts" RENAME TO "temporary_posts"`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "content" text NOT NULL DEFAULT (''), "images" text NOT NULL DEFAULT (''), "videos" text NOT NULL DEFAULT (''), "tags" text NOT NULL DEFAULT (''), "likeCount" integer NOT NULL DEFAULT (0), "commentCount" integer NOT NULL DEFAULT (0), "liked" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "posts"("id", "userId", "content", "images", "videos", "tags", "likeCount", "commentCount", "liked", "createdAt", "updatedAt") SELECT "id", "userId", "content", "images", "videos", "tags", "likeCount", "commentCount", "liked", "createdAt", "updatedAt" FROM "temporary_posts"`);
        await queryRunner.query(`DROP TABLE "temporary_posts"`);
        await queryRunner.query(`ALTER TABLE "likes" RENAME TO "temporary_likes"`);
        await queryRunner.query(`CREATE TABLE "likes" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer, "visitorId" varchar NOT NULL DEFAULT (''), "postId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_f90c716efa5169a1ecd9cfae2b6" UNIQUE ("visitorId", "postId"), CONSTRAINT "UQ_74b9b8cd79a1014e50135f266fe" UNIQUE ("userId", "postId"))`);
        await queryRunner.query(`INSERT INTO "likes"("id", "userId", "visitorId", "postId", "createdAt") SELECT "id", "userId", "visitorId", "postId", "createdAt" FROM "temporary_likes"`);
        await queryRunner.query(`DROP TABLE "temporary_likes"`);
        await queryRunner.query(`ALTER TABLE "comments" RENAME TO "temporary_comments"`);
        await queryRunner.query(`CREATE TABLE "comments" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "postId" integer NOT NULL, "userId" integer, "nickname" varchar NOT NULL DEFAULT (''), "visitorId" varchar NOT NULL DEFAULT (''), "content" text NOT NULL DEFAULT (''), "status" varchar NOT NULL DEFAULT ('pending'), "replyToId" integer, "replyToNickname" varchar NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "comments"("id", "postId", "userId", "nickname", "visitorId", "content", "status", "replyToId", "replyToNickname", "createdAt") SELECT "id", "postId", "userId", "nickname", "visitorId", "content", "status", "replyToId", "replyToNickname", "createdAt" FROM "temporary_comments"`);
        await queryRunner.query(`DROP TABLE "temporary_comments"`);
        await queryRunner.query(`DROP INDEX "IDX_ef463dd9a2ce0d673350e36e0f"`);
        await queryRunner.query(`DROP INDEX "IDX_fdb91868b03a2040db408a5333"`);
        await queryRunner.query(`DROP TABLE "follows"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TABLE "likes"`);
        await queryRunner.query(`DROP TABLE "comments"`);
    }

}
