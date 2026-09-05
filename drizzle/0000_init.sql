CREATE TYPE "public"."decision_plan" AS ENUM('quick', 'shortlist_final', 'ideas_shortlist_final');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('open', 'decided', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('trip', 'outing', 'meal', 'party', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('planning', 'done', 'archived');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('organizer', 'member');--> statement-breakpoint
CREATE TYPE "public"."round_kind" AS ENUM('ideas', 'shortlist', 'final');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"decision_id" text,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"actor_member_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"plan" "decision_plan" DEFAULT 'quick' NOT NULL,
	"status" "decision_status" DEFAULT 'open' NOT NULL,
	"round_hours" integer DEFAULT 72 NOT NULL,
	"anyone_can_add_options" boolean DEFAULT true NOT NULL,
	"shortlist_picks" integer DEFAULT 2 NOT NULL,
	"advance_count" integer DEFAULT 2 NOT NULL,
	"outcome_option_id" text,
	"decided_at" timestamp with time zone,
	"created_by_member_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" "event_kind" DEFAULT 'other' NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"status" "event_status" DEFAULT 'planning' NOT NULL,
	"share_token" text NOT NULL,
	"created_by_member_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"user_id" text,
	"managed_by_user_id" text,
	"display_name" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"added_by_member_id" text,
	"added_in_round_id" text,
	"eliminated_in_round_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"decision_id" text NOT NULL,
	"number" integer NOT NULL,
	"kind" "round_kind" NOT NULL,
	"status" "round_status" DEFAULT 'open' NOT NULL,
	"max_picks" integer DEFAULT 1 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"tied" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"option_id" text NOT NULL,
	"member_id" text NOT NULL,
	"cast_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_member_id_members_id_fk" FOREIGN KEY ("actor_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_managed_by_user_id_users_id_fk" FOREIGN KEY ("managed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_added_by_member_id_members_id_fk" FOREIGN KEY ("added_by_member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_added_in_round_id_rounds_id_fk" FOREIGN KEY ("added_in_round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_eliminated_in_round_id_rounds_id_fk" FOREIGN KEY ("eliminated_in_round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_option_id_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_cast_by_user_id_users_id_fk" FOREIGN KEY ("cast_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_event_idx" ON "activity" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "decisions_event_idx" ON "decisions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_family_idx" ON "events" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_family_user_unique" ON "members" USING btree ("family_id","user_id") WHERE "members"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "members_family_idx" ON "members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "members_user_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "options_decision_idx" ON "options" USING btree ("decision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_decision_number_unique" ON "rounds" USING btree ("decision_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_round_option_member_unique" ON "votes" USING btree ("round_id","option_id","member_id");--> statement-breakpoint
CREATE INDEX "votes_round_idx" ON "votes" USING btree ("round_id");