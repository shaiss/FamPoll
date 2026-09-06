CREATE TYPE "public"."decision_format" AS ENUM('text', 'long_text', 'date');--> statement-breakpoint
CREATE TYPE "public"."vote_type" AS ENUM('ab', 'single', 'multi');--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "format" "decision_format" DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "vote_type" "vote_type" DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "votes_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "decisions" SET "format" = 'date' WHERE "sets_event_dates";--> statement-breakpoint
UPDATE "decisions" SET "vote_type" = 'multi' WHERE "plan" <> 'quick';
