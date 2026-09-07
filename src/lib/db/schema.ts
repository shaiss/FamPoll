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
/** Who counts on a decision: everyone, or adults only (proxy/kid seats are advisory). */
export const eligibilityScope = pgEnum("eligibility_scope", ["all", "adults"]);

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
    /** A one-event guest an organizer can clear out afterwards (removeGuests). Counts and votes like anyone while present. */
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    // One seat per signed-in person per group; the database enforces it so two
    // concurrent joins of the same group cannot both succeed. A person may hold
    // a seat in many groups, so there is no unique index on user_id alone.
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
    /** Who counts on this decision: 'all' seats, or 'adults' only (proxy/kid seats advisory). */
    eligibilityScope: eligibilityScope("eligibility_scope").notNull().default("all"),
    /** When true, the final round is ranked (instant-runoff) instead of pick-one. */
    rankedFinal: boolean("ranked_final").notNull().default(false),
    /** The organizer opted in to email reminders for this decision's open rounds (sent only if a mail provider is configured). */
    remindOrganizer: boolean("remind_organizer").notNull().default(false),
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
    /** When the organizer was last emailed about this round closing (dedupe for reminders). Null = never. */
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
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
    /** Position on a ranked ballot (1 = first choice). Null for ordinary pick-one / pick-several ballots. */
    rank: integer("rank"),
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

/**
 * In-app feature requests and feedback, on their way to becoming public GitHub
 * issues. Nothing here is posted automatically: a row lands `queued`, the app
 * owner reviews the exact text on a gated page, and only an approval posts it —
 * authored by one machine identity, carrying no reporter information. The
 * columns that name the submitter (`createdByUserId`, `familyId`) are kept for
 * rights only — rate-limiting, de-duplication, abuse response — and never enter
 * the issue payload, the same "recorded under the seat, never attributed" split
 * the app already applies to hidden votes. Both null out when the person leaves,
 * mirroring `votes.member_id` (migration 0004), so the record survives them.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    familyId: text("family_id").references(() => families.id, { onDelete: "set null" }),
    /** bug | idea | other. Plain text validated in the action, like activity.kind. */
    kind: text("kind").notNull().default("other"),
    /** Server-sanitized text: what a reviewer sees and, once approved, what becomes public. */
    message: text("message").notNull(),
    /** queued | posted | rejected | failed. Public only once an owner review moves it to "posted". */
    status: text("status").notNull().default("queued"),
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_status_idx").on(t.status), index("feedback_user_idx").on(t.createdByUserId)],
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

export const feedbackRelations = relations(feedback, ({ one }) => ({
  createdBy: one(users, { fields: [feedback.createdByUserId], references: [users.id] }),
  family: one(families, { fields: [feedback.familyId], references: [families.id] }),
  reviewedBy: one(users, { fields: [feedback.reviewedByUserId], references: [users.id] }),
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
export type Feedback = typeof feedback.$inferSelect;
