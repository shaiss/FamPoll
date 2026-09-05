ALTER TABLE "decisions" ADD COLUMN "sets_event_dates" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "ends_on" date;