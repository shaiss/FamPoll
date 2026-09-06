import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["organizer", "member"]);
export const eventKind = pgEnum("event_kind", ["trip", "outing", "meal", "party", "other"]);
export const eventStatus = pgEnum("event_status", ["planning", "done", "archived"]);
export const decisionPlan = pgEnum("decision_plan", ["quick", "shortlist_final", "ideas_shortlist_final"]);
/** What an option is: a short line, a paragraph, or a date range. One per decision. */
export const decisionFormat = pgEnum("decision_format", ["text", "long_text", "date"]);
/** How each voting round is voted: A or B, pick one of several, or pick up to N. */
export const voteType = pgEnum("vote_type", ["ab", "single", "multi"]);
export const decisionStatus = pgEnum("decision_status", ["open", "decided", "skipped"]);
export const roundKind = pgEnum("round_kind", ["ideas", "shortlist", "final"]);
export const roundStatus = pgEnum("round_status", ["open", "closed"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** One row per signed-in person. `id` is the Clerk user id. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  email: text("email"),
  createdAt: createdAt(),
});

export const families = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdByUserId: text("created_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

/**
 * A member is a seat at the family table. Signed-in people have `userId`.
 * Kids or relatives without an account are proxy members: `userId` is null and
 * `managedByUserId` names the adult who votes on their behalf.
 */
export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id),
    managedByUserId: text("managed_by_user_id").references(() => users.id),
    displayName: text("display_name").notNull(),
    role: memberRole("role").notNull().default("member"),
    /** Seat preference: every ballot this seat casts starts with "hide my vote" ticked. */
    votesHidden: boolean("votes_hidden").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("members_family_user_unique")
      .on(t.familyId, t.userId)
      .where(sql`${t.userId} is not null`),
    // One family per signed-in person for now; the database enforces it so two
    // concurrent joins cannot both succeed.
    uniqueIndex("members_user_unique")
      .on(t.userId)
      .where(sql`${t.userId} is not null`),
    index("members_family_idx").on(t.familyId),
    index("members_user_idx").on(t.userId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: eventKind("kind").notNull().default("other"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    status: eventStatus("status").notNull().default("planning"),
    shareToken: text("share_token").notNull().unique(),
    createdByMemberId: text("created_by_member_id")
      .notNull()
      .references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [index("events_family_idx").on(t.familyId)],
);

export const decisions = pgTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    plan: decisionPlan("plan").notNull().default("quick"),
    format: decisionFormat("format").notNull().default("text"),
    voteType: voteType("vote_type").notNull().default("single"),
    status: decisionStatus("status").notNull().default("open"),
    /** How long each round stays open before it closes on its own. */
    roundHours: integer("round_hours").notNull().default(72),
    anyoneCanAddOptions: boolean("anyone_can_add_options").notNull().default(true),
    /** Picks per person when the vote type is "pick several" (column name is historical). */
    picks: integer("shortlist_picks").notNull().default(2),
    /** How many options advance from a shortlist round to the final. */
    advanceCount: integer("advance_count").notNull().default(2),
    /** Date format only: when true, the winning option's date range becomes the event's dates. */
    setsEventDates: boolean("sets_event_dates").notNull().default(false),
    /** Asked anonymously: the asker is recorded but never named in the UI or the log. */
    anonymous: boolean("anonymous").notNull().default(false),
    outcomeOptionId: text("outcome_option_id"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdByMemberId: text("created_by_member_id")
      .notNull()
      .references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [index("decisions_event_idx").on(t.eventId)],
);

export const rounds = pgTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    kind: roundKind("kind").notNull(),
    status: roundStatus("status").notNull().default("open"),
    /** Nominal picks at open time: 0 for ideas, 1 for A/B and pick-one, N for pick-several. The live cap is effectivePicks(). */
    maxPicks: integer("max_picks").notNull().default(1),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** deadline | everyone_voted | organizer */
    closeReason: text("close_reason"),
    /** Set when a final round ended in a tie that the organizer must resolve. */
    tied: boolean("tied").notNull().default(false),
  },
  (t) => [uniqueIndex("rounds_decision_number_unique").on(t.decisionId, t.number)],
);

export const options = pgTable(
  "options",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    note: text("note"),
    /** Set on options of a dates decision; the title is derived from them. */
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    addedByMemberId: text("added_by_member_id").references(() => members.id),
    /** Suggested anonymously: the adder is recorded but never named. */
    anonymous: boolean("anonymous").notNull().default(false),
    addedInRoundId: text("added_in_round_id").references(() => rounds.id),
    /** Null while the option is still alive. */
    eliminatedInRoundId: text("eliminated_in_round_id").references(() => rounds.id),
    createdAt: createdAt(),
  },
  (t) => [index("options_decision_idx").on(t.decisionId)],
);

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    /** Null means the seat skipped: "whatever you all pick". Counts as taking part. */
    optionId: text("option_id").references(() => options.id, { onDelete: "cascade" }),
    /**
     * Null once the seat has left the family: a closed round keeps its ballots
     * so its counts (and any hidden vote in it) never shift after the fact.
     */
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    /** The signed-in person who physically cast it (differs from the member for proxies). */
    castByUserId: text("cast_by_user_id")
      .notNull()
      .references(() => users.id),
    /** A hidden ballot: counted like any other, never attributed in the UI. */
    anonymous: boolean("anonymous").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("votes_round_option_member_unique").on(t.roundId, t.optionId, t.memberId),
    index("votes_round_idx").on(t.roundId),
  ],
);

/** The decision log: what happened, in plain words, for the event summary. */
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    decisionId: text("decision_id").references(() => decisions.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    actorMemberId: text("actor_member_id").references(() => members.id),
    createdAt: createdAt(),
  },
  (t) => [index("activity_event_idx").on(t.eventId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(members),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(members),
  events: many(events),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  family: one(families, { fields: [members.familyId], references: [families.id] }),
  user: one(users, { fields: [members.userId], references: [users.id] }),
  votes: many(votes),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  family: one(families, { fields: [events.familyId], references: [families.id] }),
  decisions: many(decisions),
  activity: many(activity),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  event: one(events, { fields: [decisions.eventId], references: [events.id] }),
  rounds: many(rounds),
  options: many(options),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  decision: one(decisions, { fields: [rounds.decisionId], references: [decisions.id] }),
  votes: many(votes),
}));

export const optionsRelations = relations(options, ({ one, many }) => ({
  decision: one(decisions, { fields: [options.decisionId], references: [decisions.id] }),
  addedBy: one(members, { fields: [options.addedByMemberId], references: [members.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  round: one(rounds, { fields: [votes.roundId], references: [rounds.id] }),
  option: one(options, { fields: [votes.optionId], references: [options.id] }),
  member: one(members, { fields: [votes.memberId], references: [members.id] }),
}));

export const activityRelations = relations(activity, ({ one }) => ({
  event: one(events, { fields: [activity.eventId], references: [events.id] }),
  actor: one(members, { fields: [activity.actorMemberId], references: [members.id] }),
}));

export type User = typeof users.$inferSelect;
export type Family = typeof families.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Option = typeof options.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Activity = typeof activity.$inferSelect;
