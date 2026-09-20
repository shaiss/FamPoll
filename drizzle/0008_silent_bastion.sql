ALTER TABLE "votes" ALTER COLUMN "cast_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "named_seats_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "link_seat" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "personal_link_token" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "seat_session_token" text;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_personal_link_token_unique" UNIQUE("personal_link_token");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_seat_session_token_unique" UNIQUE("seat_session_token");