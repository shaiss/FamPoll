CREATE TYPE "public"."eligibility_scope" AS ENUM('all', 'adults');--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "eligibility_scope" "eligibility_scope" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "ranked_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "remind_organizer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_guest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "rank" integer;