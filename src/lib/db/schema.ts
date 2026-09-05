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
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("members_family_user_unique")
      .on(t.familyId, t.userId)
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
    status: decisionStatus("status").notNull().default("open"),
    /** How long each round stays open before it closes on its own. */
    roundHours: integer("round_hours").notNull().default(72),
    anyoneCanAddOptions: boolean("anyone_can_add_options").notNull().default(true),
    /** Picks per person in a shortlist round. */
    shortlistPicks: integer("shortlist_picks").notNull().default(2),
    /** How many options advance from a shortlist round to the final. */
    advanceCount: integer("advance_count").notNull().default(2),
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
    /** 0 for an ideas round, N for a shortlist, 1 for a final. */
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
    addedByMemberId: text("added_by_member_id").references(() => members.id),
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
    optionId: text("option_id")
      .notNull()
      .references(() => options.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    /** The signed-in person who physically cast it (differs from the member for proxies). */
    castByUserId: text("cast_by_user_id")
      .notNull()
      .references(() => users.id),
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
