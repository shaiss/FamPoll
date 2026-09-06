ALTER TABLE "votes" DROP CONSTRAINT "votes_member_id_members_id_fk";
--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "member_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;