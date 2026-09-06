import type { Locale } from "./locale";

/**
 * UI copy per language. English is the source of truth; the Spanish (es) and
 * Brazilian-Portuguese (pt-BR) strings are first drafts — have native speakers
 * in the family review them before launch. Interpolated strings carry
 * {placeholder} tokens; fill them with interpolate().
 */
export type Messages = {
  brandName: string;
  tagline: string;
  landingLede: string;
  feature1: string;
  feature2: string;
  feature3: string;
  inAppHint: string;
  continueCta: string;
  noPasswords: string;
  finishSetup: string;
  setupHint: string;
  authinAppBrowserNotice: string;
  authnotFoundTitle: string;
  authnotFoundBody: string;
  authgoToMyFamily: string;
  authhome: string;
  homeKindTrip: string;
  homeKindOuting: string;
  homeKindMeal: string;
  homeKindParty: string;
  homeKindEvent: string;
  homeRoundsOpen: string;
  homeGatheringIdeas: string;
  homeDecisionsWaiting: string;
  homeAllSettled: string;
  homeGreeting: string;
  homePeopleLink: string;
  homeNeedsYouLabel: string;
  homeOpenCount: string;
  homeNothingWaiting: string;
  homeReasonTie: string;
  homeReasonNoQuorum: string;
  homeReasonNothing: string;
  homeOnYouPill: string;
  homeSortItOut: string;
  homeIdeasWanted: string;
  homePickUpTo: string;
  homeAlsoFor: string;
  homeVotedCount: string;
  homeAddedIdeasCount: string;
  homeAddIdea: string;
  homeVote: string;
  homeSoloTitle: string;
  homeSoloBody: string;
  homeShareTitle: string;
  homeShareText: string;
  homeEventsLabel: string;
  homeSeePast: string;
  homeNoEventsTitle: string;
  homeNoEventsBody: string;
  homeDecidedCount: string;
  homeNoDecisions: string;
  homePastLabel: string;
  homeNewEventAria: string;
  homeAlsoVoteFor: string;
  homeErrorTitle: string;
  homeErrorBody: string;
  homeErrorReference: string;
  homeErrorTryAgain: string;
  homeErrorHome: string;
  eventsKindTrip: string;
  eventsKindOuting: string;
  eventsKindMeal: string;
  eventsKindParty: string;
  eventsKindOther: string;
  eventsBackHome: string;
  eventsNewTitle: string;
  eventsNewSubtitle: string;
  eventsFieldWhatIsIt: string;
  eventsTitlePlaceholder: string;
  eventsFieldKind: string;
  eventsFieldStarts: string;
  eventsStartsHintNew: string;
  eventsFieldEnds: string;
  eventsCreatePending: string;
  eventsCreateSubmit: string;
  eventsSummaryDecidedFallback: string;
  eventsShareHelpDecide: string;
  eventsSummarySetAside: string;
  eventsSummaryGatheringIdeas: string;
  eventsSummaryWaitingOrganizer: string;
  eventsSummarySeeItAll: string;
  eventsCopySummaryLabel: string;
  eventsEdit: string;
  eventsShareTitle: string;
  eventsDatesOpen: string;
  eventsDecidedOfTotal: string;
  eventsDecidedSoFar: string;
  eventsNothingSettled: string;
  eventsWhenLabel: string;
  eventsNightCount: string;
  eventsDecisionsInOrder: string;
  eventsDecisionsHeading: string;
  eventsVotedCount: string;
  eventsNotYouYet: string;
  eventsChange: string;
  eventsVote: string;
  eventsDecidedFallbackCap: string;
  eventsSetAsideCap: string;
  eventsGatheringIdeasCap: string;
  eventsIdeaCount: string;
  eventsSoFar: string;
  eventsWaitingOrganizerCap: string;
  eventsNotSettled: string;
  eventsSeeIdeas: string;
  eventsAddIdea: string;
  eventsReorderDecisions: string;
  eventsMoveUp: string;
  eventsMoveDown: string;
  eventsAddDecision: string;
  eventsEventStatusReopen: string;
  eventsHowWeGotHere: string;
  eventsSeeAll: string;
  eventsMarkDone: string;
  eventsReopenEvent: string;
  eventsEditTitle: string;
  eventsFieldName: string;
  eventsStartsHintEdit: string;
  eventsSaveChanges: string;
  eventsDeleteTitle: string;
  eventsDeleteWarning: string;
  eventsDeleteConfirm: string;
  eventsDeleteSubmit: string;
  eventsLogEntryCount: string;
  eventsLogNewestFirst: string;
  newDecisionHeading: string;
  decisionstepTiebreak: string;
  decisionpillWinner: string;
  decisionpillToFinal: string;
  decisionvotesFrom: string;
  decisionvoteCount: string;
  decisionpersonCount: string;
  decisionpicksUpToEach: string;
  decisionskippedCount: string;
  decisionskippedNames: string;
  decisionprivateVotesNote: string;
  decisionvoterLeft: string;
  decisionviaCaster: string;
  decisioncasterFallback: string;
  decisioneventClosedNote: string;
  decisiondecidedOn: string;
  decisioneventDatesSet: string;
  decisioncopyForMessenger: string;
  decisioncopyDecidedLine: string;
  decisionreopenChangedMinds: string;
  decisionsetAsideNote: string;
  decisionbringItBack: string;
  decisiondeleteForGood: string;
  decisiondeleteConfirmVotes: string;
  decisiondeleteDecision: string;
  decisionideasSoFar: string;
  decisionideaCount: string;
  decisionnoIdeasYet: string;
  decisionsomeoneFallback: string;
  decisionpersonsIdea: string;
  decisionanonymousIdea: string;
  decisiongotAllIdeas: string;
  decisionideasCloseHint: string;
  decisionstartTheFinal: string;
  decisionstartTheShortlist: string;
  decisionsuggestDates: string;
  decisionaddDateRange: string;
  decisionariaStart: string;
  decisionariaEnd: string;
  decisionaddAnIdea: string;
  decisionaddAnOption: string;
  decisionlongTextPlaceholder: string;
  decisiontitlePlaceholder: string;
  decisionwhyPlaceholder: string;
  decisionsuggestAnonymously: string;
  decisionaddButton: string;
  decisionorganizerCollectingIdeas: string;
  decisionstatusVotedHidden: string;
  decisionstatusVoted: string;
  decisionstatusSkipped: string;
  decisionstatusNotYet: string;
  decisionyourVote: string;
  decisionvotingFor: string;
  decisionvotedOfTotal: string;
  decisionwaitingOn: string;
  decisionideasCloseNote: string;
  decisionchangeMindNote: string;
  decisioncopyAddIdeas: string;
  decisioncopyVote: string;
  decisioncopyStillWaiting: string;
  decisiontieHeading: string;
  decisiontieEndedLevel: string;
  decisiontiedJoinAnd: string;
  decisiontieOrganizerHint: string;
  decisiontieMemberHint: string;
  decisiontiebreakRound: string;
  decisionjustTake: string;
  decisionnotEnoughVotes: string;
  decisiontimeRanOut: string;
  decisionnoQuorumOrganizerHint: string;
  decisionnoQuorumMemberHint: string;
  decisiongiveMoreTime: string;
  decisiongoWith: string;
  decisionsetAside: string;
  decisionnothingToVote: string;
  decisionnoIdeasCameIn: string;
  decisionclosedNoResult: string;
  decisionreopenOrSetAsideHint: string;
  decisionorganizerCanReopen: string;
  decisionreopenLastRound: string;
  decisionhowItWent: string;
  decisionearlierRounds: string;
  decisionroundClosed: string;
  decisioncloseEveryoneVoted: string;
  decisioncloseDeadline: string;
  decisioncloseNoQuorum: string;
  decisioncloseByOrganizer: string;
  decisionideasCameIn: string;
  decisionshowMyHand: string;
  decisionshowHand: string;
  decisionorganizerLabel: string;
  decisioncloseRoundNow: string;
  decisionreopenRoundN: string;
  decisionrenameLabel: string;
  decisionsaveTitle: string;
  decisionremoveOptionLabel: string;
  decisionremove: string;
  decisionfixOptionLabel: string;
  decisionariaTitle: string;
  decisionnotePlaceholder: string;
  decisionsaveOption: string;
  decisionjustCallIt: string;
  decisiondecide: string;
  decisionsetThisAside: string;
  decisiondeleteThisDots: string;
  decisiondeleteConfirmAll: string;
  decisionorganizerFooter: string;
  decisionpillAskedAnonymously: string;
  familybackHome: string;
  familyintroSubtitle: string;
  familyinviteLinkLabel: string;
  familyshareTitle: string;
  familyshareText: string;
  familyinviteJoinNote: string;
  familyrotateInvite: string;
  familymembersHeading: string;
  familyseatCount: string;
  familyyouSuffix: string;
  familyroleOrganizer: string;
  familyroleProxyDesc: string;
  familyroleMember: string;
  familymakeOrganizer: string;
  familymakeMember: string;
  familyremove: string;
  familyproxyPill: string;
  familyrenameToggle: string;
  familynameFieldAria: string;
  familysaveMember: string;
  familyvotePrivacyToggle: string;
  familyprivacyStatusMineHidden: string;
  familyprivacyStatusMineShown: string;
  familyprivacyStatusOtherHidden: string;
  familyprivacyStatusOtherShown: string;
  familyprivacyExplain: string;
  familyprivacyToggleMineShow: string;
  familyprivacyToggleMineHide: string;
  familyprivacyToggleOtherShow: string;
  familyprivacyToggleOtherHide: string;
  familyproxyManagerToggle: string;
  familyhandToAria: string;
  familyhandOver: string;
  familyaddProxyLabel: string;
  familyaddProxyHint: string;
  familyaddProxyPlaceholder: string;
  familyaddSeat: string;
  familynonOrganizerNote: string;
  familyleave: string;
  familyrenameFamilyLabel: string;
  familysaveName: string;
  familydeleteToggle: string;
  familydeleteConfirm: string;
  familydeleteButton: string;
  familynewTitle: string;
  familynewSubtitle: string;
  familynameFieldLabel: string;
  familynamePlaceholder: string;
  familystartButton: string;
  familyjoinCodeLabel: string;
  familyjoinCodeHint: string;
  familyjoinCodePlaceholder: string;
  familyjoinButton: string;
  pubMetaInviteTitle: string;
  pubMetaJoinFamilyTitle: string;
  pubMetaInviteBrandTitle: string;
  pubMetaJoinDescription: string;
  pubMetaInviteInvalidDescription: string;
  pubInvalidTitle: string;
  pubInvalidBody: string;
  pubGoToYourFamily: string;
  pubHome: string;
  pubInvitedToJoin: string;
  pubPeopleIn: string;
  pubInAppBrowserHint: string;
  pubContinueSocial: string;
  pubImNewHere: string;
  pubNoPasswords: string;
  pubAlreadyInFamily: string;
  pubGoToNamedFamily: string;
  pubJoiningPending: string;
  pubJoinAsName: string;
  pubMetaSummaryTitle: string;
  pubMetaDecidedCount: string;
  pubMetaOpenCount: string;
  pubMetaDecidedTitle: string;
  pubLinkDead: string;
  pubUpdatedTime: string;
  pubDecidedHeading: string;
  pubReadOnlyLink: string;
  pubDatesTBD: string;
  pubPeopleCount: string;
  pubNightsCount: string;
  pubNoDecisions: string;
  pubSetAside: string;
  pubGatheringIdeas: string;
  pubWaitingOrganizer: string;
  pubOnlyFamilyVotes: string;
  pubDecidedToGo: string;
  pubOpenAndVote: string;
  pubJoinToVote: string;
  pubHowWeGotHere: string;
  cmppickOne: string;
  cmppickUpTo: string;
  cmpchangeVote: string;
  cmpcastVote: string;
  cmpshowMore: string;
  cmpshowLess: string;
  cmphideVote: string;
  cmphideVoteHint: string;
  cmpskipDone: string;
  cmpskip: string;
  cmptonight: string;
  cmponeDay: string;
  cmpthreeDays: string;
  cmponeWeek: string;
  cmpround1Closes: string;
  cmptonightHint: string;
  cmpdeadlineHint: string;
  cmpformatHintText: string;
  cmpformatHintLongText: string;
  cmpformatHintDate: string;
  cmpplanBodyQuick: string;
  cmpplanBodyShortlist: string;
  cmpplanBodyIdeas: string;
  cmpcountHintIdeas: string;
  cmpcountHintExactly: string;
  cmpcountHintAtLeast: string;
  cmpcountHintPicks: string;
  cmptwoOptions: string;
  cmpoptionYes: string;
  cmpoptionNo: string;
  cmpyesNo: string;
  cmpoptionsOnePerLine: string;
  cmpoptionsPlaceholderText: string;
  cmpoptionsAParagraphEach: string;
  cmpoptionPlaceholderLong: string;
  cmpdateRangesToChoose: string;
  cmpdateRangeStart: string;
  cmpdateRangeEnd: string;
  cmpoptionN: string;
  cmpwhatDeciding: string;
  cmptitlePlaceholder: string;
  cmpsectionFormat: string;
  cmpsectionType: string;
  cmptypeHintAb: string;
  cmptypeHintSingle: string;
  cmptypeHintMulti: string;
  cmpeachPersonPicks: string;
  cmponeRoundAb: string;
  cmpsectionRounds: string;
  cmptoggleAddIdeasTitle: string;
  cmptoggleAddIdeasBody: string;
  cmptoggleWinnerDatesTitle: string;
  cmptoggleWinnerDatesBody: string;
  cmptoggleAnonTitle: string;
  cmptoggleAnonBody: string;
  cmpstartingPending: string;
  cmpstartRound1Ideas: string;
  cmpstartRound1: string;
  cmpcopyForMessenger: string;
  cmpcopied: string;
  cmptextToCopy: string;
  cmpcopyLink: string;
  cmpcopyThisLinkPrompt: string;
  cmplinkCopiedPaste: string;
  cmpshare: string;
  uibackLabel: string;
  fmtclosingNow: string;
  fmtclosesInMinutes: string;
  fmtclosesInHours: string;
  fmtclosesAt: string;
  fmtclosesInDays: string;
  fmtjustNow: string;
  fmtMinutesAgo: string;
  fmtHoursAgo: string;
  fmtDaysAgo: string;
  fmtnightsCount: string;
  fmtdateRangeTitle: string;
  errFamnameFamilyRequired: string;
  errFaminviteCodeInvalid: string;
  errFaminviteLinkExpired: string;
  errFamalreadyInFamily: string;
  errFamorganizerOnlyAddSeat: string;
  errFamnamePersonRequired: string;
  errFamduplicateNameAddInitial: string;
  errFamproxyLimitReached: string;
  errFamnotProxySeat: string;
  errFamremoveSeatNotAllowed: string;
  errFamorganizerOnlyRemovePeople: string;
  errFampersonNotInFamily: string;
  errFamcannotRemoveSelf: string;
  errFamcannotRemoveOrganizer: string;
  errFamorganizerOnlyGeneric: string;
  errFamorganizerNeedsAccount: string;
  errFamorganizerOnlyChangeInvite: string;
  errFammakeOrganizerBeforeLeaving: string;
  errFamnotAnOrganizer: string;
  errFamneedOneOrganizerDemote: string;
  errFamorganizerOnlyMoveSeat: string;
  errFamhandToOrganizer: string;
  errFamorganizerOnlyDeleteFamily: string;
  errFamconfirmDeleteRequired: string;
  errFamrenameNotAllowed: string;
  errFamduplicateName: string;
  errFamprivacyNotAllowed: string;
  errDecEventClosedAddDecisions: string;
  errDecTitleRequired: string;
  errDecDeadlineInvalid: string;
  errDecAbJustTwo: string;
  errDecTooManyOptions: string;
  errDecDateInvalid: string;
  errDecEndBeforeStart: string;
  errDecPickDatesFirst: string;
  errDecTypeIdeaFirst: string;
  errDecDecisionClosed: string;
  errDecEventClosed: string;
  errDecAbKeepsTwoOptions: string;
  errDecNoRoundOpenNow: string;
  errDecNoAddDuringFinal: string;
  errDecOnlyOrganizerAddShortlist: string;
  errDecOrganizerCollectingIdeas: string;
  errDecIdeaAlreadyListed: string;
  errDecAlreadySettled: string;
  errDecCantVoteFromSeat: string;
  errDecNoVoteIdeasRound: string;
  errDecPickOneOrSkip: string;
  errDecRoundJustClosed: string;
  errDecOptionNoLongerRunning: string;
  errDecPickOne: string;
  errDecPickUpTo: string;
  errDecOnlyOrganizerOrAsker: string;
  errDecNoRoundOpen: string;
  errDecNoRoundToExtend: string;
  errDecNothingToReopen: string;
  errDecOnlyLastClosedReopen: string;
  errDecAlreadySettledReopen: string;
  errDecOptionNotRunning: string;
  errDecNoTieToBreak: string;
  errDecAbKeepsTwoFixInstead: string;
  errDecRemoveOnlyWhileOpen: string;
  errDecNoRemoveDuringFinal: string;
  errDecGiveTitle: string;
  errDecTickToDelete: string;
  errDecNotSetAside: string;
  errDecNoRoundToBringBack: string;
  errDecGiveOptionTitle: string;
  errDecOptionNotHere: string;
  errDecOptionNameTaken: string;
  errDecShowHandAfterClose: string;
  errDecNotYourSeat: string;
  errDecNounOptions: string;
  errDecNounDateRanges: string;
  errDecAbNeedsTwo: string;
  errDecShortlistNeedsMin: string;
  errDecMultiNeedsMin: string;
  errDecQuickNeedsMin: string;
  errDecOnePerLine: string;
  errDecActorSomeone: string;
  errDecQuickVoteLabel: string;
  errDecRoundsCount: string;
  errDecLogOpened: string;
  errDecLogSuggested: string;
  errDecLogProxyVoted: string;
  errDecLogExtended: string;
  errDecLogReopened: string;
  errDecReopenClearedOutcome: string;
  errDecReopenVotesAgain: string;
  errDecLogDecided: string;
  errDecLogTiebreak: string;
  errDecAndJoiner: string;
  errDecAnOption: string;
  errDecLogSetAside: string;
  errDecLogRemoved: string;
  errDecLogRenamed: string;
  errDecLogOptionChanged: string;
  errDecLogBroughtBack: string;
  errDecEventNameRequired: string;
  errDecEventDateInvalid: string;
  errDecEventEndBeforeStart: string;
  errDecEventGone: string;
  errDecOnlyOrganizerChange: string;
  errDecOnlyOrganizerEdit: string;
  errDecOnlyOrganizerDeleteEvent: string;
  errDecTickToDeleteEvent: string;
  errDecLogEventStarted: string;
  errDecLogEventUpdated: string;
  errDecChangeRenamedTo: string;
  errDecChangeSetDates: string;
  errDecDateToRange: string;
  errDecChangeClearedDates: string;

};

const en: Messages = {
  brandName: "Quorum",
  tagline: "Family decisions, one round at a time.",
  landingLede: "Group the votes around the trip, the dinner, the party. Narrow it down in rounds. Keep track of what you decided.",
  feature1: "Every decision lives inside its event",
  feature2: "Ideas, shortlist, final: rounds that close themselves",
  feature3: "One link back to the family chat with what you decided",
  inAppHint: "Sign-in works best in your browser. Tap the menu and choose “Open in browser”, then come back to this link.",
  continueCta: "Continue with Google, Apple or Facebook",
  noPasswords: "No passwords. We only keep your name and photo so the family knows who voted.",
  finishSetup: "Finish setup",
  setupHint: "Sign-in turns on once Clerk is connected.",
  authinAppBrowserNotice: "Sign-in works best in your browser. Tap the menu and choose “Open in browser”, then come back to this link.",
  authnotFoundTitle: "That page isn’t here.",
  authnotFoundBody: "The link may be old, or the event it pointed to was removed.",
  authgoToMyFamily: "Go to my family",
  authhome: "Home",
  homeKindTrip: "Trip",
  homeKindOuting: "Outing",
  homeKindMeal: "Meal",
  homeKindParty: "Party",
  homeKindEvent: "Event",
  homeRoundsOpen: "{count} rounds open",
  homeGatheringIdeas: "gathering ideas",
  homeDecisionsWaiting: "{count} decisions waiting",
  homeAllSettled: "all settled",
  homeGreeting: "Hi, {name}",
  homePeopleLink: "People",
  homeNeedsYouLabel: "Needs you",
  homeOpenCount: "{count} open",
  homeNothingWaiting: "Nothing waiting on you right now.",
  homeReasonTie: "ended in a tie",
  homeReasonNoQuorum: "closed with too few votes",
  homeReasonNothing: "closed with nothing to decide",
  homeOnYouPill: "On you",
  homeSortItOut: "Sort it out",
  homeIdeasWanted: "Ideas wanted",
  homePickUpTo: "pick up to {count}",
  homeAlsoFor: "also for {names}",
  homeVotedCount: "{count} of {total} voted",
  homeAddedIdeasCount: "{count} of {total} added ideas",
  homeAddIdea: "Add idea",
  homeVote: "Vote",
  homeSoloTitle: "It’s just you so far",
  homeSoloBody: "Send the invite link so the family can vote too. You can also add a seat for a kid or grandparent on the People page.",
  homeShareTitle: "Join {family} on {brand}",
  homeShareText: "Vote with us on {brand}",
  homeEventsLabel: "Events",
  homeSeePast: "See past",
  homeNoEventsTitle: "No events yet",
  homeNoEventsBody: "Start with the next thing you need to decide together: a trip, a birthday, Friday dinner.",
  homeDecidedCount: "{decided} of {total} decided",
  homeNoDecisions: "No decisions yet · add the first one",
  homePastLabel: "Past",
  homeNewEventAria: "New event",
  homeAlsoVoteFor: "You also vote for {names}",
  homeErrorTitle: "Something went sideways.",
  homeErrorBody: "That didn’t go through. Try again in a moment; if it keeps happening, go home and come back.",
  homeErrorReference: "Reference {digest}",
  homeErrorTryAgain: "Try again",
  homeErrorHome: "Home",
  eventsKindTrip: "Trip",
  eventsKindOuting: "Day out",
  eventsKindMeal: "Meal",
  eventsKindParty: "Party",
  eventsKindOther: "Something else",
  eventsBackHome: "Home",
  eventsNewTitle: "New event",
  eventsNewSubtitle: "The thing you’re deciding about. Decisions come next.",
  eventsFieldWhatIsIt: "What is it?",
  eventsTitlePlaceholder: "Summer ’27 Trip",
  eventsFieldKind: "Kind",
  eventsFieldStarts: "Starts",
  eventsStartsHintNew: "Optional. Leave blank if the dates are still up in the air.",
  eventsFieldEnds: "Ends",
  eventsCreatePending: "Creating…",
  eventsCreateSubmit: "Create event",
  eventsSummaryDecidedFallback: "decided",
  eventsShareHelpDecide: "Help us decide: {event}",
  eventsSummarySetAside: "set aside",
  eventsSummaryGatheringIdeas: "gathering ideas",
  eventsSummaryWaitingOrganizer: "waiting on the organizer",
  eventsSummarySeeItAll: "See it all: {url}",
  eventsCopySummaryLabel: "Copy summary for Messenger",
  eventsEdit: "Edit",
  eventsShareTitle: "{event} · what we’ve decided",
  eventsDatesOpen: "Dates open",
  eventsDecidedOfTotal: "{decided} of {decisions}",
  eventsDecidedSoFar: "Decided so far",
  eventsNothingSettled: "Nothing settled yet. The first decision usually goes fast.",
  eventsWhenLabel: "When",
  eventsNightCount: "{count} night",
  eventsDecisionsInOrder: "In order",
  eventsDecisionsHeading: "Decisions",
  eventsVotedCount: "{voted} of {total} voted",
  eventsNotYouYet: "not you yet",
  eventsChange: "Change",
  eventsVote: "Vote",
  eventsDecidedFallbackCap: "Decided",
  eventsSetAsideCap: "Set aside",
  eventsGatheringIdeasCap: "Gathering ideas",
  eventsIdeaCount: "{count} idea",
  eventsSoFar: "so far",
  eventsWaitingOrganizerCap: "Waiting on the organizer",
  eventsNotSettled: "Not settled",
  eventsSeeIdeas: "See ideas",
  eventsAddIdea: "Add idea",
  eventsReorderDecisions: "Reorder decisions",
  eventsMoveUp: "Move up",
  eventsMoveDown: "Move down",
  eventsAddDecision: "Add a decision",
  eventsEventStatusReopen: "This event is {status}. Reopen it to keep deciding.",
  eventsHowWeGotHere: "How we got here",
  eventsSeeAll: "See all",
  eventsMarkDone: "Mark this event done",
  eventsReopenEvent: "Reopen this event",
  eventsEditTitle: "Edit event",
  eventsFieldName: "Name",
  eventsStartsHintEdit: "Clear both to leave the dates open.",
  eventsSaveChanges: "Save changes",
  eventsDeleteTitle: "Delete this event",
  eventsDeleteWarning: "Removes every decision, vote and log line under it. There is no undo. Marking it done instead keeps the record.",
  eventsDeleteConfirm: "Yes, delete “{event}” for everyone",
  eventsDeleteSubmit: "Delete event",
  eventsLogEntryCount: "{count} entries",
  eventsLogNewestFirst: "Everything, newest first",
  newDecisionHeading: "New decision",
  decisionstepTiebreak: "Tiebreak",
  decisionpillWinner: "Winner",
  decisionpillToFinal: "To the final",
  decisionvotesFrom: "{votes} from {people}",
  decisionvoteCount: "{count} vote",
  decisionpersonCount: "{count} person",
  decisionpicksUpToEach: "up to {cap} each",
  decisionskippedCount: "{count} skipped",
  decisionskippedNames: "skipped: {names}",
  decisionprivateVotesNote: "{hidden} of {voters} voted privately, so this round shows counts only.",
  decisionvoterLeft: "someone who left",
  decisionviaCaster: "{name} (via {caster})",
  decisioncasterFallback: "someone",
  decisioneventClosedNote: "This event is {status}, so voting is closed here.",
  decisiondecidedOn: "Decided {date}",
  decisioneventDatesSet: "These are now the event’s dates.",
  decisioncopyForMessenger: "Copy for Messenger",
  decisioncopyDecidedLine: "Decided: {outcome}{tally}.",
  decisionreopenChangedMinds: "Changed your minds? Reopen the last round",
  decisionsetAsideNote: "This decision was set aside.",
  decisionbringItBack: "Bring it back",
  decisiondeleteForGood: "Delete for good…",
  decisiondeleteConfirmVotes: "Delete this decision and its votes for good.",
  decisiondeleteDecision: "Delete decision",
  decisionideasSoFar: "Ideas so far",
  decisionideaCount: "{count} idea",
  decisionnoIdeasYet: "No ideas yet. Be the first.",
  decisionsomeoneFallback: "Someone",
  decisionpersonsIdea: "{name}’s idea",
  decisionanonymousIdea: "Anonymous idea",
  decisiongotAllIdeas: "Got all the ideas?",
  decisionideasCloseHint: "Ideas rounds only close on their deadline. Start the next round whenever the list looks complete.",
  decisionstartTheFinal: "Start the final",
  decisionstartTheShortlist: "Start the shortlist",
  decisionsuggestDates: "Suggest dates",
  decisionaddDateRange: "Add a date range",
  decisionariaStart: "Start",
  decisionariaEnd: "End",
  decisionaddAnIdea: "Add an idea",
  decisionaddAnOption: "Add an option",
  decisionlongTextPlaceholder: "A paragraph: the plan, the place, the why",
  decisiontitlePlaceholder: "Beach house in Cascais",
  decisionwhyPlaceholder: "Why? (optional)",
  decisionsuggestAnonymously: "Suggest anonymously",
  decisionaddButton: "Add",
  decisionorganizerCollectingIdeas: "The organizer is collecting ideas for this one.",
  decisionstatusVotedHidden: "voted · hidden",
  decisionstatusVoted: "voted",
  decisionstatusSkipped: "skipped",
  decisionstatusNotYet: "not yet",
  decisionyourVote: "Your vote",
  decisionvotingFor: "Voting for {name}",
  decisionvotedOfTotal: "{voted} of {total} voted",
  decisionwaitingOn: "waiting on {names}",
  decisionideasCloseNote: "Ideas {closes}.",
  decisionchangeMindNote: "You can change your mind until the round closes. It {closes}, or as soon as everyone has voted.",
  decisioncopyAddIdeas: "Add your ideas, {closes}:",
  decisioncopyVote: "{round}. Vote, {closes}:",
  decisioncopyStillWaiting: "Still waiting on {names}.",
  decisiontieHeading: "It’s a tie",
  decisiontieEndedLevel: "{options} ended level.",
  decisiontiedJoinAnd: "and",
  decisiontieOrganizerHint: "Run one more round between them, or just call it.",
  decisiontieMemberHint: "The organizer will break the tie.",
  decisiontiebreakRound: "Tiebreak round",
  decisionjustTake: "Just take {option}",
  decisionnotEnoughVotes: "Not enough votes",
  decisiontimeRanOut: "Time ran out with {turnout} of {members} voting.",
  decisionnoQuorumOrganizerHint: "Nothing was decided. Give it more time, go with the leader, or set it aside.",
  decisionnoQuorumMemberHint: "Nothing was decided yet. The organizer will give it more time or call it.",
  decisiongiveMoreTime: "Give it more time",
  decisiongoWith: "Go with {option}",
  decisionsetAside: "Set aside",
  decisionnothingToVote: "Nothing to vote on.",
  decisionnoIdeasCameIn: "No ideas came in before the round closed.",
  decisionclosedNoResult: "The round closed without a result.",
  decisionreopenOrSetAsideHint: "Reopen the last round, or set this decision aside.",
  decisionorganizerCanReopen: "The organizer can reopen it.",
  decisionreopenLastRound: "Reopen the last round",
  decisionhowItWent: "How it went",
  decisionearlierRounds: "Earlier rounds",
  decisionroundClosed: "{round} closed",
  decisioncloseEveryoneVoted: "everyone voted, so it closed early",
  decisioncloseDeadline: "time was up",
  decisioncloseNoQuorum: "time was up, too few voted",
  decisioncloseByOrganizer: "closed by the organizer",
  decisionideasCameIn: "{ideas} came in.",
  decisionshowMyHand: "Show my hand",
  decisionshowHand: "Show {name}’s hand",
  decisionorganizerLabel: "Organizer",
  decisioncloseRoundNow: "Close this round now",
  decisionreopenRoundN: "Reopen round {number}",
  decisionrenameLabel: "Rename",
  decisionsaveTitle: "Save title",
  decisionremoveOptionLabel: "Remove an option",
  decisionremove: "Remove",
  decisionfixOptionLabel: "Fix an option",
  decisionariaTitle: "Title",
  decisionnotePlaceholder: "Note (optional)",
  decisionsaveOption: "Save option",
  decisionjustCallIt: "Just call it",
  decisiondecide: "Decide",
  decisionsetThisAside: "Set this decision aside",
  decisiondeleteThisDots: "Delete this decision…",
  decisiondeleteConfirmAll: "Delete it and all its votes for good.",
  decisionorganizerFooter: "These are for you and whoever asked the question. Everything here is written to the event’s log.",
  decisionpillAskedAnonymously: "Asked anonymously",
  familybackHome: "Home",
  familyintroSubtitle: "Everyone here can vote on every event.",
  familyinviteLinkLabel: "Invite link",
  familyshareTitle: "Join {family} on {brand}",
  familyshareText: "Vote with us on {brand}",
  familyinviteJoinNote: "Anyone with the link can join after signing in.",
  familyrotateInvite: "Make a new link (old one stops working)",
  familymembersHeading: "Members",
  familyseatCount: "{count} seats",
  familyyouSuffix: " (you)",
  familyroleOrganizer: "Organizer",
  familyroleProxyDesc: "No account · someone votes for them",
  familyroleMember: "Member",
  familymakeOrganizer: "Make organizer",
  familymakeMember: "Make member",
  familyremove: "Remove",
  familyproxyPill: "proxy",
  familyrenameToggle: "Rename",
  familynameFieldAria: "Name",
  familysaveMember: "Save",
  familyvotePrivacyToggle: "Vote privacy",
  familyprivacyStatusMineHidden: "Your votes start hidden.",
  familyprivacyStatusMineShown: "Your votes are shown by name.",
  familyprivacyStatusOtherHidden: "{name}'s votes start hidden.",
  familyprivacyStatusOtherShown: "{name}'s votes are shown by name.",
  familyprivacyExplain: "Hidden votes are counted, and still recorded under the name. If anyone hides, that round shows counts only. You can show your hand on any decision.",
  familyprivacyToggleMineShow: "Show my votes by name",
  familyprivacyToggleMineHide: "Hide my votes by default",
  familyprivacyToggleOtherShow: "Show {name}'s votes by name",
  familyprivacyToggleOtherHide: "Hide {name}'s votes by default",
  familyproxyManagerToggle: "Who votes for them",
  familyhandToAria: "Hand to",
  familyhandOver: "Hand over",
  familyaddProxyLabel: "Add someone without a phone",
  familyaddProxyHint: "A kid or a grandparent. You cast their vote from your screen, and it counts like everyone else's. Up to four per organizer.",
  familyaddProxyPlaceholder: "Ruby",
  familyaddSeat: "Add a seat",
  familynonOrganizerNote: "Organizers add seats for kids and relatives without accounts, and can make another adult an organizer.",
  familyleave: "Leave this family",
  familyrenameFamilyLabel: "Rename the family",
  familysaveName: "Save name",
  familydeleteToggle: "Delete this family…",
  familydeleteConfirm: "Delete {family} and every event, decision and vote in it. This can't be undone.",
  familydeleteButton: "Delete the whole family",
  familynewTitle: "Who's deciding together?",
  familynewSubtitle: "Start your family, then send everyone one invite link.",
  familynameFieldLabel: "Family name",
  familynamePlaceholder: "The Kalmans",
  familystartButton: "Start the family",
  familyjoinCodeLabel: "Have an invite code?",
  familyjoinCodeHint: "It's the last part of the invite link someone sent you.",
  familyjoinCodePlaceholder: "abcd2345",
  familyjoinButton: "Join a family",
  pubMetaInviteTitle: "Invite",
  pubMetaJoinFamilyTitle: "Join {family} on {brand}",
  pubMetaInviteBrandTitle: "Invite · {brand}",
  pubMetaJoinDescription: "{count} people in. Sign in with Google, Apple or Facebook to vote with them.",
  pubMetaInviteInvalidDescription: "This invite link is no longer valid.",
  pubInvalidTitle: "That invite link isn’t valid.",
  pubInvalidBody: "It may have been replaced. Ask whoever sent it for a fresh one.",
  pubGoToYourFamily: "Go to your family",
  pubHome: "Home",
  pubInvitedToJoin: "You’re invited to join",
  pubPeopleIn: "{count} people in",
  pubInAppBrowserHint: "Sign-in works best in your browser. Tap the menu and choose “Open in browser”, then come back to this link.",
  pubContinueSocial: "Continue with Google, Apple or Facebook",
  pubImNewHere: "I’m new here",
  pubNoPasswords: "No passwords. We only keep your name and photo so the family knows who voted.",
  pubAlreadyInFamily: "You’re already in {family}. One family per person for now.",
  pubGoToNamedFamily: "Go to {family}",
  pubJoiningPending: "Joining…",
  pubJoinAsName: "Join as {name}",
  pubMetaSummaryTitle: "Summary",
  pubMetaDecidedCount: "{decided} of {total} decided",
  pubMetaOpenCount: "{count} open",
  pubMetaDecidedTitle: "{event} · what we’ve decided",
  pubLinkDead: "This link doesn’t point to anything any more.",
  pubUpdatedTime: "Updated {time}",
  pubDecidedHeading: "What we’ve decided",
  pubReadOnlyLink: "{family} · read-only link",
  pubDatesTBD: "Dates to be decided",
  pubPeopleCount: "{count} people",
  pubNightsCount: "{count} night",
  pubNoDecisions: "No decisions yet.",
  pubSetAside: "Set aside",
  pubGatheringIdeas: "Gathering ideas",
  pubWaitingOrganizer: "Waiting on the organizer",
  pubOnlyFamilyVotes: "Only the family can vote",
  pubDecidedToGo: "{decided} decided · {remaining} to go",
  pubOpenAndVote: "Open it and vote",
  pubJoinToVote: "Join {family} to vote",
  pubHowWeGotHere: "How we got here",
  cmppickOne: "Pick one",
  cmppickUpTo: "Pick up to {max}",
  cmpchangeVote: "Change my vote · {count} picked",
  cmpcastVote: "Cast my vote · {count} picked",
  cmpshowMore: "Show more",
  cmpshowLess: "Show less",
  cmphideVote: "Hide my vote",
  cmphideVoteHint: "Still recorded under your name, just not shown to the family. If anyone hides, this round shows counts only.",
  cmpskipDone: "Skipped · whatever you all pick",
  cmpskip: "Skip this one · whatever you all pick",
  cmptonight: "Tonight",
  cmponeDay: "1 day",
  cmpthreeDays: "3 days",
  cmponeWeek: "1 week",
  cmpround1Closes: "Round 1 closes",
  cmptonightHint: "8pm your time. Later rounds get a day each.",
  cmpdeadlineHint: "Later rounds get the same. A round also closes as soon as everyone has voted or skipped.",
  cmpformatHintText: "A short line each.",
  cmpformatHintLongText: "A paragraph each: a plan, a place, the why.",
  cmpformatHintDate: "Date ranges. The winner can set the event’s dates.",
  cmpplanBodyQuick: "One round. Tonight’s dinner.",
  cmpplanBodyShortlist: "Two rounds. Narrow it down, then pick.",
  cmpplanBodyIdeas: "Three rounds. Gather ideas first.",
  cmpcountHintIdeas: "Starting with ideas? Leave these empty and everyone adds their own.",
  cmpcountHintExactly: "Exactly {min}.",
  cmpcountHintAtLeast: "At least {min}.",
  cmpcountHintPicks: " With {count} options everyone picks up to {picks}.",
  cmptwoOptions: "The two options",
  cmpoptionYes: "Yes",
  cmpoptionNo: "No",
  cmpyesNo: "Yes / No",
  cmpoptionsOnePerLine: "Options, one per line",
  cmpoptionsPlaceholderText: "Apartment in Alfama\nBeach house in Cascais\nHotel near Belém",
  cmpoptionsAParagraphEach: "Options, a paragraph each",
  cmpoptionPlaceholderLong: "Apartment in Alfama. Walkable, near the tram, and the terrace fits all of us for dinner.",
  cmpdateRangesToChoose: "Date ranges to choose from",
  cmpdateRangeStart: "{label} start",
  cmpdateRangeEnd: "{label} end",
  cmpoptionN: "Option {n}",
  cmpwhatDeciding: "What are we deciding?",
  cmptitlePlaceholder: "Where do we stay?",
  cmpsectionFormat: "Format",
  cmpsectionType: "Type",
  cmptypeHintAb: "Two options, pick one. Settled in one round.",
  cmptypeHintSingle: "Pick one of several.",
  cmptypeHintMulti: "Everyone picks up to {picks}; the most picks wins.",
  cmpeachPersonPicks: "Each person picks up to",
  cmponeRoundAb: "One round: A or B is settled in one vote.",
  cmpsectionRounds: "Rounds",
  cmptoggleAddIdeasTitle: "Anyone can add ideas",
  cmptoggleAddIdeasBody: "Turn off to keep it to you",
  cmptoggleWinnerDatesTitle: "Winner sets the event’s dates",
  cmptoggleWinnerDatesBody: "The winning range becomes the event’s dates",
  cmptoggleAnonTitle: "Ask anonymously",
  cmptoggleAnonBody: "Your name stays off the question and its options. It’s still recorded.",
  cmpstartingPending: "Starting…",
  cmpstartRound1Ideas: "Start round 1 · gather ideas",
  cmpstartRound1: "Start round 1",
  cmpcopyForMessenger: "Copy for Messenger",
  cmpcopied: "Copied",
  cmptextToCopy: "Text to copy",
  cmpcopyLink: "Copy link",
  cmpcopyThisLinkPrompt: "Copy this link",
  cmplinkCopiedPaste: "Link copied. Paste it into Messenger.",
  cmpshare: "Share",
  uibackLabel: "Back",
  fmtclosingNow: "closing now",
  fmtclosesInMinutes: "closes in {n} min",
  fmtclosesInHours: "closes in {n}h",
  fmtclosesAt: "closes {when}",
  fmtclosesInDays: "closes in {n} days",
  fmtjustNow: "just now",
  fmtMinutesAgo: "{n} min ago",
  fmtHoursAgo: "{n}h ago",
  fmtDaysAgo: "{n}d ago",
  fmtnightsCount: "{n} night",
  fmtdateRangeTitle: "{range} · {nights}",
  errFamnameFamilyRequired: "Give the family a name.",
  errFaminviteCodeInvalid: "That invite code doesn't look right.",
  errFaminviteLinkExpired: "That invite link is not valid any more. Ask for a fresh one.",
  errFamalreadyInFamily: "You're already in {family}. One family per person for now.",
  errFamorganizerOnlyAddSeat: "Only an organizer can add a seat for someone. Ask them to make you an organizer.",
  errFamnamePersonRequired: "Give them a name.",
  errFamduplicateNameAddInitial: "There is already a {name} here. Add a last initial.",
  errFamproxyLimitReached: "You can vote for up to {max} people. Ask another adult to add the rest.",
  errFamnotProxySeat: "That seat is not a proxy seat.",
  errFamremoveSeatNotAllowed: "Only the person who added them, or an organizer, can remove a seat.",
  errFamorganizerOnlyRemovePeople: "Only an organizer can remove people.",
  errFampersonNotInFamily: "That person is not in this family.",
  errFamcannotRemoveSelf: "You can't remove yourself.",
  errFamcannotRemoveOrganizer: "Organizers can't be removed here.",
  errFamorganizerOnlyGeneric: "Only an organizer can do that.",
  errFamorganizerNeedsAccount: "Only someone with an account can be an organizer.",
  errFamorganizerOnlyChangeInvite: "Only an organizer can change the invite link.",
  errFammakeOrganizerBeforeLeaving: "Make someone else an organizer before you leave.",
  errFamnotAnOrganizer: "They aren't an organizer.",
  errFamneedOneOrganizerDemote: "Make someone else an organizer first — a family needs one.",
  errFamorganizerOnlyMoveSeat: "Only an organizer can move a seat.",
  errFamhandToOrganizer: "Hand it to another organizer.",
  errFamorganizerOnlyDeleteFamily: "Only an organizer can delete the family.",
  errFamconfirmDeleteRequired: "Tick the box to confirm you want to delete everything.",
  errFamrenameNotAllowed: "You can rename yourself; an organizer can rename anyone.",
  errFamduplicateName: "There is already a {name} here.",
  errFamprivacyNotAllowed: "Only that person, or whoever votes for them, can change this.",
  errDecEventClosedAddDecisions: "This event is closed. Reopen it to add decisions.",
  errDecTitleRequired: "What are we deciding? Give it a title.",
  errDecDeadlineInvalid: "That deadline doesn't look right.",
  errDecAbJustTwo: "A or B is just two options. Use multiple choice for more.",
  errDecTooManyOptions: "Too many options.",
  errDecDateInvalid: "One of the dates doesn't look right.",
  errDecEndBeforeStart: "An end date is before its start date.",
  errDecPickDatesFirst: "Pick the dates first.",
  errDecTypeIdeaFirst: "Type the idea first.",
  errDecDecisionClosed: "This decision is closed.",
  errDecEventClosed: "This event is closed.",
  errDecAbKeepsTwoOptions: "This is an A or B question, so it keeps its two options.",
  errDecNoRoundOpenNow: "No round is open right now.",
  errDecNoAddDuringFinal: "Options can't be added during the final. Reopen the previous round instead.",
  errDecOnlyOrganizerAddShortlist: "Only the organizer can add options once the shortlist has started.",
  errDecOrganizerCollectingIdeas: "The organizer is collecting ideas for this one.",
  errDecIdeaAlreadyListed: "That idea is already on the list.",
  errDecAlreadySettled: "This decision is already settled.",
  errDecCantVoteFromSeat: "You can't vote from that seat.",
  errDecNoVoteIdeasRound: "Nobody votes during the ideas round.",
  errDecPickOneOrSkip: "Pick at least one, or skip.",
  errDecRoundJustClosed: "That round just closed.",
  errDecOptionNoLongerRunning: "One of those options is no longer in the running.",
  errDecPickOne: "Pick one.",
  errDecPickUpTo: "Pick up to {cap}.",
  errDecOnlyOrganizerOrAsker: "Only the organizer, or whoever asked this, can do that.",
  errDecNoRoundOpen: "No round is open.",
  errDecNoRoundToExtend: "No round is open to extend.",
  errDecNothingToReopen: "Nothing to reopen yet.",
  errDecOnlyLastClosedReopen: "Only the last closed round can be reopened.",
  errDecAlreadySettledReopen: "This decision is already settled. Reopen it first.",
  errDecOptionNotRunning: "That option isn't in the running.",
  errDecNoTieToBreak: "There is no tie to break.",
  errDecAbKeepsTwoFixInstead: "An A or B question keeps its two options. Fix one instead.",
  errDecRemoveOnlyWhileOpen: "Options can only be removed while a round is open.",
  errDecNoRemoveDuringFinal: "Options can't be removed during the final. Reopen the previous round instead.",
  errDecGiveTitle: "Give it a title.",
  errDecTickToDelete: "Tick the box to delete this decision for good.",
  errDecNotSetAside: "This decision isn't set aside.",
  errDecNoRoundToBringBack: "There is no round to bring back.",
  errDecGiveOptionTitle: "Give the option a title.",
  errDecOptionNotHere: "That option isn't here.",
  errDecOptionNameTaken: "Another option already has that name.",
  errDecShowHandAfterClose: "You can show your hand once the round has closed.",
  errDecNotYourSeat: "That isn't your seat.",
  errDecNounOptions: "options",
  errDecNounDateRanges: "date ranges",
  errDecAbNeedsTwo: "A or B needs exactly two different {noun}.",
  errDecShortlistNeedsMin: "A shortlist needs at least {count} {noun}, or use a quick vote.",
  errDecMultiNeedsMin: "Pick several needs at least {count} {noun}, or switch to multiple choice.",
  errDecQuickNeedsMin: "A quick vote needs at least {count} {noun}.",
  errDecOnePerLine: ", one per line",
  errDecActorSomeone: "Someone",
  errDecQuickVoteLabel: "quick vote",
  errDecRoundsCount: "{count} rounds",
  errDecLogOpened: "{actor} opened \"{title}\" ({summary}).",
  errDecLogSuggested: "{actor} suggested \"{title}\".",
  errDecLogProxyVoted: "{voter} voted for {seat}.",
  errDecLogExtended: "{actor} gave round {number} more time.",
  errDecLogReopened: "{actor} reopened round {number}{clearedOutcome}{votesAgain}.",
  errDecReopenClearedOutcome: " and cleared the outcome",
  errDecReopenVotesAgain: "; everyone votes again",
  errDecLogDecided: "{title} decided: {option}. {actor} called it.",
  errDecLogTiebreak: "{actor} started a tiebreak between {options}.",
  errDecAndJoiner: " and ",
  errDecAnOption: "an option",
  errDecLogSetAside: "{actor} set \"{title}\" aside.",
  errDecLogRemoved: "{actor} removed \"{option}\".",
  errDecLogRenamed: "{actor} renamed \"{oldTitle}\" to \"{newTitle}\".",
  errDecLogOptionChanged: "{actor} changed \"{oldTitle}\" to \"{newTitle}\".",
  errDecLogBroughtBack: "{actor} brought \"{title}\" back.",
  errDecEventNameRequired: "Give the event a name.",
  errDecEventDateInvalid: "That date doesn't look right.",
  errDecEventEndBeforeStart: "The end date is before the start date.",
  errDecEventGone: "That event is gone.",
  errDecOnlyOrganizerChange: "Only the organizer can change this.",
  errDecOnlyOrganizerEdit: "Only the organizer can edit this.",
  errDecOnlyOrganizerDeleteEvent: "Only an organizer can delete an event.",
  errDecTickToDeleteEvent: "Tick the box to confirm you want to delete it.",
  errDecLogEventStarted: "{actor} started {title}.",
  errDecLogEventUpdated: "{actor} {changes}.",
  errDecChangeRenamedTo: "renamed it to \"{title}\"",
  errDecChangeSetDates: "set the dates to {startsOn}{endRange}",
  errDecDateToRange: " to {endsOn}",
  errDecChangeClearedDates: "cleared the dates",

};

const es: Messages = {
  brandName: "Cuórum",
  tagline: "Decisiones en familia, ronda a ronda.",
  landingLede: "Junta los votos en torno al viaje, la cena, la fiesta. Ve reduciendo las opciones por rondas. Guarda lo que decidieron.",
  feature1: "Cada decisión vive dentro de su evento",
  feature2: "Ideas, finalistas y ronda final: rondas que se cierran solas",
  feature3: "Un enlace de vuelta al chat de la familia con lo que decidieron",
  inAppHint: "El inicio de sesión funciona mejor en tu navegador. Abre el menú y elige «Abrir en el navegador», y vuelve a este enlace.",
  continueCta: "Continuar con Google, Apple o Facebook",
  noPasswords: "Sin contraseñas. Solo guardamos tu nombre y foto para que la familia sepa quién votó.",
  finishSetup: "Terminar la configuración",
  setupHint: "El inicio de sesión se activa cuando Clerk esté conectado.",
  authinAppBrowserNotice: "El inicio de sesión funciona mejor en tu navegador. Toca el menú y elige «Abrir en el navegador»; luego vuelve a este enlace.",
  authnotFoundTitle: "Esa página no está aquí.",
  authnotFoundBody: "Puede que el enlace sea antiguo o que se haya eliminado el evento al que apuntaba.",
  authgoToMyFamily: "Ir a mi familia",
  authhome: "Inicio",
  homeKindTrip: "Viaje",
  homeKindOuting: "Salida",
  homeKindMeal: "Comida",
  homeKindParty: "Fiesta",
  homeKindEvent: "Evento",
  homeRoundsOpen: "{count} rondas abiertas",
  homeGatheringIdeas: "recopilando ideas",
  homeDecisionsWaiting: "{count} decisiones pendientes",
  homeAllSettled: "todo decidido",
  homeGreeting: "Hola, {name}",
  homePeopleLink: "Personas",
  homeNeedsYouLabel: "Te toca a ti",
  homeOpenCount: "{count} pendientes",
  homeNothingWaiting: "No hay nada pendiente para ti ahora.",
  homeReasonTie: "terminó en empate",
  homeReasonNoQuorum: "cerró con muy pocos votos",
  homeReasonNothing: "cerró sin nada que decidir",
  homeOnYouPill: "Depende de ti",
  homeSortItOut: "Resuélvelo",
  homeIdeasWanted: "Se buscan ideas",
  homePickUpTo: "elige hasta {count}",
  homeAlsoFor: "también por {names}",
  homeVotedCount: "{count} de {total} votaron",
  homeAddedIdeasCount: "{count} de {total} aportaron ideas",
  homeAddIdea: "Agregar idea",
  homeVote: "Votar",
  homeSoloTitle: "Por ahora estás tú nada más",
  homeSoloBody: "Comparte el enlace de invitación para que la familia también pueda votar. También puedes agregar un lugar para un niño o un abuelo en la página de Personas.",
  homeShareTitle: "Únete a {family} en {brand}",
  homeShareText: "Vota con nosotros en {brand}",
  homeEventsLabel: "Eventos",
  homeSeePast: "Ver anteriores",
  homeNoEventsTitle: "Aún no hay eventos",
  homeNoEventsBody: "Empieza con lo próximo que tengan que decidir juntos: un viaje, un cumpleaños, la cena del viernes.",
  homeDecidedCount: "{decided} de {total} decididas",
  homeNoDecisions: "Aún no hay decisiones · agrega la primera",
  homePastLabel: "Anteriores",
  homeNewEventAria: "Nuevo evento",
  homeAlsoVoteFor: "También votas por {names}",
  homeErrorTitle: "Algo salió mal.",
  homeErrorBody: "No se pudo completar. Inténtalo de nuevo en un momento; si sigue pasando, vuelve al inicio y regresa.",
  homeErrorReference: "Referencia {digest}",
  homeErrorTryAgain: "Intentar de nuevo",
  homeErrorHome: "Inicio",
  eventsKindTrip: "Viaje",
  eventsKindOuting: "Salida",
  eventsKindMeal: "Comida",
  eventsKindParty: "Fiesta",
  eventsKindOther: "Otra cosa",
  eventsBackHome: "Inicio",
  eventsNewTitle: "Nuevo evento",
  eventsNewSubtitle: "Aquello sobre lo que van a decidir. Las decisiones vienen después.",
  eventsFieldWhatIsIt: "¿Qué es?",
  eventsTitlePlaceholder: "Viaje de verano ’27",
  eventsFieldKind: "Tipo",
  eventsFieldStarts: "Empieza",
  eventsStartsHintNew: "Opcional. Déjalo en blanco si las fechas aún no están claras.",
  eventsFieldEnds: "Termina",
  eventsCreatePending: "Creando…",
  eventsCreateSubmit: "Crear evento",
  eventsSummaryDecidedFallback: "decidido",
  eventsShareHelpDecide: "Ayúdanos a decidir: {event}",
  eventsSummarySetAside: "omitida",
  eventsSummaryGatheringIdeas: "reuniendo ideas",
  eventsSummaryWaitingOrganizer: "esperando al organizador",
  eventsSummarySeeItAll: "Míralo todo: {url}",
  eventsCopySummaryLabel: "Copiar resumen para Messenger",
  eventsEdit: "Editar",
  eventsShareTitle: "{event} · lo que decidimos",
  eventsDatesOpen: "Fechas por definir",
  eventsDecidedOfTotal: "{decided} de {decisions}",
  eventsDecidedSoFar: "Decidido hasta ahora",
  eventsNothingSettled: "Nada decidido todavía. La primera decisión suele ser rápida.",
  eventsWhenLabel: "Cuándo",
  eventsNightCount: "{count} noche",
  eventsDecisionsInOrder: "En orden",
  eventsDecisionsHeading: "Decisiones",
  eventsVotedCount: "{voted} de {total} votaron",
  eventsNotYouYet: "tú todavía no",
  eventsChange: "Cambiar",
  eventsVote: "Votar",
  eventsDecidedFallbackCap: "Decidido",
  eventsSetAsideCap: "Omitida",
  eventsGatheringIdeasCap: "Reuniendo ideas",
  eventsIdeaCount: "{count} idea",
  eventsSoFar: "hasta ahora",
  eventsWaitingOrganizerCap: "Esperando al organizador",
  eventsNotSettled: "Sin decidir",
  eventsSeeIdeas: "Ver ideas",
  eventsAddIdea: "Agregar idea",
  eventsReorderDecisions: "Reordenar decisiones",
  eventsMoveUp: "Subir",
  eventsMoveDown: "Bajar",
  eventsAddDecision: "Agregar una decisión",
  eventsEventStatusReopen: "Este evento está {status}. Reábrelo para seguir decidiendo.",
  eventsHowWeGotHere: "Cómo llegamos aquí",
  eventsSeeAll: "Ver todo",
  eventsMarkDone: "Marcar este evento como terminado",
  eventsReopenEvent: "Reabrir este evento",
  eventsEditTitle: "Editar evento",
  eventsFieldName: "Nombre",
  eventsStartsHintEdit: "Borra ambas para dejar las fechas sin definir.",
  eventsSaveChanges: "Guardar cambios",
  eventsDeleteTitle: "Eliminar este evento",
  eventsDeleteWarning: "Elimina todas las decisiones, votos y entradas del registro que contiene. No hay vuelta atrás. Si prefieres, márcalo como terminado para conservar el registro.",
  eventsDeleteConfirm: "Sí, eliminar «{event}» para todos",
  eventsDeleteSubmit: "Eliminar evento",
  eventsLogEntryCount: "{count} entradas",
  eventsLogNewestFirst: "Todo, lo más reciente primero",
  newDecisionHeading: "Nueva decisión",
  decisionstepTiebreak: "Desempate",
  decisionpillWinner: "Ganadora",
  decisionpillToFinal: "A la final",
  decisionvotesFrom: "{votes} de {people}",
  decisionvoteCount: "{count} voto",
  decisionpersonCount: "{count} persona",
  decisionpicksUpToEach: "hasta {cap} cada uno",
  decisionskippedCount: "{count} omitieron",
  decisionskippedNames: "omitieron: {names}",
  decisionprivateVotesNote: "{hidden} de {voters} votaron en privado, así que esta ronda solo muestra los totales.",
  decisionvoterLeft: "alguien que se fue",
  decisionviaCaster: "{name} (por {caster})",
  decisioncasterFallback: "alguien",
  decisioneventClosedNote: "Este evento está {status}, así que la votación está cerrada aquí.",
  decisiondecidedOn: "Decidido {date}",
  decisioneventDatesSet: "Estas son ahora las fechas del evento.",
  decisioncopyForMessenger: "Copiar para Messenger",
  decisioncopyDecidedLine: "Decidido: {outcome}{tally}.",
  decisionreopenChangedMinds: "¿Cambiaron de opinión? Reabre la última ronda",
  decisionsetAsideNote: "Esta decisión se dejó de lado.",
  decisionbringItBack: "Recuperarla",
  decisiondeleteForGood: "Eliminar definitivamente…",
  decisiondeleteConfirmVotes: "Eliminar esta decisión y sus votos definitivamente.",
  decisiondeleteDecision: "Eliminar decisión",
  decisionideasSoFar: "Ideas hasta ahora",
  decisionideaCount: "{count} idea",
  decisionnoIdeasYet: "Aún no hay ideas. Sé el primero.",
  decisionsomeoneFallback: "Alguien",
  decisionpersonsIdea: "idea de {name}",
  decisionanonymousIdea: "Idea anónima",
  decisiongotAllIdeas: "¿Ya están todas las ideas?",
  decisionideasCloseHint: "Las rondas de ideas solo cierran en su fecha límite. Inicia la siguiente ronda cuando la lista se vea completa.",
  decisionstartTheFinal: "Iniciar la final",
  decisionstartTheShortlist: "Iniciar la ronda de finalistas",
  decisionsuggestDates: "Sugiere fechas",
  decisionaddDateRange: "Agrega un rango de fechas",
  decisionariaStart: "Inicio",
  decisionariaEnd: "Fin",
  decisionaddAnIdea: "Agrega una idea",
  decisionaddAnOption: "Agrega una opción",
  decisionlongTextPlaceholder: "Un párrafo: el plan, el lugar, el porqué",
  decisiontitlePlaceholder: "Casa en la playa en Cascais",
  decisionwhyPlaceholder: "¿Por qué? (opcional)",
  decisionsuggestAnonymously: "Sugerir de forma anónima",
  decisionaddButton: "Agregar",
  decisionorganizerCollectingIdeas: "El organizador está recogiendo ideas para esta.",
  decisionstatusVotedHidden: "votó · oculto",
  decisionstatusVoted: "votó",
  decisionstatusSkipped: "omitió",
  decisionstatusNotYet: "todavía no",
  decisionyourVote: "Tu voto",
  decisionvotingFor: "Votando por {name}",
  decisionvotedOfTotal: "{voted} de {total} votaron",
  decisionwaitingOn: "esperando a {names}",
  decisionideasCloseNote: "Las ideas {closes}.",
  decisionchangeMindNote: "Puedes cambiar de opinión hasta que cierre la ronda. {closes}, o en cuanto todos hayan votado.",
  decisioncopyAddIdeas: "Agrega tus ideas, {closes}:",
  decisioncopyVote: "{round}. Vota, {closes}:",
  decisioncopyStillWaiting: "Aún esperando a {names}.",
  decisiontieHeading: "Hay empate",
  decisiontieEndedLevel: "{options} quedaron empatadas.",
  decisiontiedJoinAnd: "y",
  decisiontieOrganizerHint: "Haz una ronda más entre ellas, o simplemente decídelo.",
  decisiontieMemberHint: "El organizador desempatará.",
  decisiontiebreakRound: "Ronda de desempate",
  decisionjustTake: "Quédate con {option}",
  decisionnotEnoughVotes: "No hay suficientes votos",
  decisiontimeRanOut: "Se acabó el tiempo con {turnout} de {members} votando.",
  decisionnoQuorumOrganizerHint: "No se decidió nada. Dale más tiempo, elige al que va ganando o déjalo de lado.",
  decisionnoQuorumMemberHint: "Aún no se decidió nada. El organizador le dará más tiempo o lo decidirá.",
  decisiongiveMoreTime: "Dale más tiempo",
  decisiongoWith: "Elige {option}",
  decisionsetAside: "Dejar de lado",
  decisionnothingToVote: "Nada que votar.",
  decisionnoIdeasCameIn: "No llegaron ideas antes de que cerrara la ronda.",
  decisionclosedNoResult: "La ronda cerró sin resultado.",
  decisionreopenOrSetAsideHint: "Reabre la última ronda o deja de lado esta decisión.",
  decisionorganizerCanReopen: "El organizador puede reabrirla.",
  decisionreopenLastRound: "Reabrir la última ronda",
  decisionhowItWent: "Cómo quedó",
  decisionearlierRounds: "Rondas anteriores",
  decisionroundClosed: "{round} cerrada",
  decisioncloseEveryoneVoted: "todos votaron, así que cerró antes",
  decisioncloseDeadline: "se acabó el tiempo",
  decisioncloseNoQuorum: "se acabó el tiempo, votaron muy pocos",
  decisioncloseByOrganizer: "cerrada por el organizador",
  decisionideasCameIn: "Llegaron {ideas}.",
  decisionshowMyHand: "Mostrar mi voto",
  decisionshowHand: "Mostrar el voto de {name}",
  decisionorganizerLabel: "Organizador",
  decisioncloseRoundNow: "Cerrar esta ronda ahora",
  decisionreopenRoundN: "Reabrir la ronda {number}",
  decisionrenameLabel: "Cambiar nombre",
  decisionsaveTitle: "Guardar título",
  decisionremoveOptionLabel: "Quitar una opción",
  decisionremove: "Quitar",
  decisionfixOptionLabel: "Corregir una opción",
  decisionariaTitle: "Título",
  decisionnotePlaceholder: "Nota (opcional)",
  decisionsaveOption: "Guardar opción",
  decisionjustCallIt: "Decídelo tú",
  decisiondecide: "Decidir",
  decisionsetThisAside: "Dejar de lado esta decisión",
  decisiondeleteThisDots: "Eliminar esta decisión…",
  decisiondeleteConfirmAll: "Eliminarla junto con todos sus votos definitivamente.",
  decisionorganizerFooter: "Estas opciones son para ti y para quien hizo la pregunta. Todo lo que pasa aquí queda registrado en el historial del evento.",
  decisionpillAskedAnonymously: "Preguntado de forma anónima",
  familybackHome: "Inicio",
  familyintroSubtitle: "Todos aquí pueden votar en cada evento.",
  familyinviteLinkLabel: "Enlace de invitación",
  familyshareTitle: "Únete a {family} en {brand}",
  familyshareText: "Vota con nosotros en {brand}",
  familyinviteJoinNote: "Cualquiera con el enlace puede unirse después de iniciar sesión.",
  familyrotateInvite: "Crear un enlace nuevo (el anterior deja de funcionar)",
  familymembersHeading: "Miembros",
  familyseatCount: "{count} lugares",
  familyyouSuffix: " (tú)",
  familyroleOrganizer: "Organizador",
  familyroleProxyDesc: "Sin cuenta · alguien vota por ese lugar",
  familyroleMember: "Miembro",
  familymakeOrganizer: "Hacer organizador",
  familymakeMember: "Hacer miembro",
  familyremove: "Quitar",
  familyproxyPill: "delegado",
  familyrenameToggle: "Cambiar nombre",
  familynameFieldAria: "Nombre",
  familysaveMember: "Guardar",
  familyvotePrivacyToggle: "Privacidad del voto",
  familyprivacyStatusMineHidden: "Tus votos empiezan ocultos.",
  familyprivacyStatusMineShown: "Tus votos se muestran con tu nombre.",
  familyprivacyStatusOtherHidden: "Los votos de {name} empiezan ocultos.",
  familyprivacyStatusOtherShown: "Los votos de {name} se muestran con su nombre.",
  familyprivacyExplain: "Los votos ocultos se cuentan y se registran igual con el nombre. Si alguien los oculta, esa ronda muestra solo los totales. Puedes mostrar tu voto en cualquier decisión.",
  familyprivacyToggleMineShow: "Mostrar mis votos con mi nombre",
  familyprivacyToggleMineHide: "Ocultar mis votos por defecto",
  familyprivacyToggleOtherShow: "Mostrar los votos de {name} con su nombre",
  familyprivacyToggleOtherHide: "Ocultar los votos de {name} por defecto",
  familyproxyManagerToggle: "Quién vota por este lugar",
  familyhandToAria: "Pasar a",
  familyhandOver: "Pasar",
  familyaddProxyLabel: "Agregar a alguien sin teléfono",
  familyaddProxyHint: "Un niño o un abuelo. Tú emites su voto desde tu pantalla y cuenta igual que el de los demás. Hasta cuatro por organizador.",
  familyaddProxyPlaceholder: "Lucía",
  familyaddSeat: "Agregar un lugar",
  familynonOrganizerNote: "Los organizadores agregan lugares para niños y familiares sin cuenta, y pueden hacer organizador a otro adulto.",
  familyleave: "Salir de esta familia",
  familyrenameFamilyLabel: "Cambiar el nombre de la familia",
  familysaveName: "Guardar nombre",
  familydeleteToggle: "Eliminar esta familia…",
  familydeleteConfirm: "Eliminar {family} y todos sus eventos, decisiones y votos. Esto no se puede deshacer.",
  familydeleteButton: "Eliminar toda la familia",
  familynewTitle: "¿Quiénes deciden juntos?",
  familynewSubtitle: "Crea tu familia y luego envíale a todos un solo enlace de invitación.",
  familynameFieldLabel: "Nombre de la familia",
  familynamePlaceholder: "Los García",
  familystartButton: "Crear la familia",
  familyjoinCodeLabel: "¿Tienes un código de invitación?",
  familyjoinCodeHint: "Es la última parte del enlace de invitación que alguien te envió.",
  familyjoinCodePlaceholder: "abcd2345",
  familyjoinButton: "Unirte a una familia",
  pubMetaInviteTitle: "Invitación",
  pubMetaJoinFamilyTitle: "Únete a {family} en {brand}",
  pubMetaInviteBrandTitle: "Invitación · {brand}",
  pubMetaJoinDescription: "{count} personas dentro. Inicia sesión con Google, Apple o Facebook para votar con ellos.",
  pubMetaInviteInvalidDescription: "Este enlace de invitación ya no es válido.",
  pubInvalidTitle: "Ese enlace de invitación no es válido.",
  pubInvalidBody: "Puede que lo hayan reemplazado. Pídele uno nuevo a quien te lo envió.",
  pubGoToYourFamily: "Ir a tu familia",
  pubHome: "Inicio",
  pubInvitedToJoin: "Te invitaron a unirte a",
  pubPeopleIn: "{count} personas dentro",
  pubInAppBrowserHint: "El inicio de sesión funciona mejor en tu navegador. Abre el menú y elige «Abrir en el navegador», y vuelve a este enlace.",
  pubContinueSocial: "Continuar con Google, Apple o Facebook",
  pubImNewHere: "Soy nuevo aquí",
  pubNoPasswords: "Sin contraseñas. Solo guardamos tu nombre y foto para que la familia sepa quién votó.",
  pubAlreadyInFamily: "Ya estás en {family}. Por ahora, una familia por persona.",
  pubGoToNamedFamily: "Ir a {family}",
  pubJoiningPending: "Uniéndote…",
  pubJoinAsName: "Unirte como {name}",
  pubMetaSummaryTitle: "Resumen",
  pubMetaDecidedCount: "{decided} de {total} decididas",
  pubMetaOpenCount: "{count} abiertas",
  pubMetaDecidedTitle: "{event} · lo que decidimos",
  pubLinkDead: "Este enlace ya no lleva a ninguna parte.",
  pubUpdatedTime: "Actualizado {time}",
  pubDecidedHeading: "Lo que decidimos",
  pubReadOnlyLink: "{family} · enlace de solo lectura",
  pubDatesTBD: "Fechas por decidir",
  pubPeopleCount: "{count} personas",
  pubNightsCount: "{count} noche",
  pubNoDecisions: "Aún no hay decisiones.",
  pubSetAside: "Dejada de lado",
  pubGatheringIdeas: "Reuniendo ideas",
  pubWaitingOrganizer: "Esperando al organizador",
  pubOnlyFamilyVotes: "Solo la familia puede votar",
  pubDecidedToGo: "{decided} decididas · faltan {remaining}",
  pubOpenAndVote: "Ábrelo y vota",
  pubJoinToVote: "Únete a {family} para votar",
  pubHowWeGotHere: "Cómo llegamos aquí",
  cmppickOne: "Elige una",
  cmppickUpTo: "Elige hasta {max}",
  cmpchangeVote: "Cambiar mi voto · {count} elegidas",
  cmpcastVote: "Emitir mi voto · {count} elegidas",
  cmpshowMore: "Ver más",
  cmpshowLess: "Ver menos",
  cmphideVote: "Ocultar mi voto",
  cmphideVoteHint: "Igual queda registrado con tu nombre, solo que no se muestra a la familia. Si alguien lo oculta, esta ronda muestra solo los conteos.",
  cmpskipDone: "Omitido · lo que decidan entre todos",
  cmpskip: "Omitir esta · lo que decidan entre todos",
  cmptonight: "Esta noche",
  cmponeDay: "1 día",
  cmpthreeDays: "3 días",
  cmponeWeek: "1 semana",
  cmpround1Closes: "La ronda 1 cierra",
  cmptonightHint: "8 de la noche en tu horario. Las rondas siguientes tienen un día cada una.",
  cmpdeadlineHint: "Las rondas siguientes tienen lo mismo. Una ronda también cierra en cuanto todos hayan votado u omitido.",
  cmpformatHintText: "Una línea corta cada una.",
  cmpformatHintLongText: "Un párrafo cada una: un plan, un lugar, el porqué.",
  cmpformatHintDate: "Rangos de fechas. La ganadora puede fijar las fechas del evento.",
  cmpplanBodyQuick: "Una ronda. La cena de esta noche.",
  cmpplanBodyShortlist: "Dos rondas. Reduce las opciones y luego elige.",
  cmpplanBodyIdeas: "Tres rondas. Primero junta ideas.",
  cmpcountHintIdeas: "¿Empiezas con ideas? Deja esto vacío y cada quien agrega las suyas.",
  cmpcountHintExactly: "Exactamente {min}.",
  cmpcountHintAtLeast: "Al menos {min}.",
  cmpcountHintPicks: " Con {count} opciones cada quien elige hasta {picks}.",
  cmptwoOptions: "Las dos opciones",
  cmpoptionYes: "Sí",
  cmpoptionNo: "No",
  cmpyesNo: "Sí / No",
  cmpoptionsOnePerLine: "Opciones, una por línea",
  cmpoptionsPlaceholderText: "Departamento en Alfama\nCasa de playa en Cascais\nHotel cerca de Belém",
  cmpoptionsAParagraphEach: "Opciones, un párrafo cada una",
  cmpoptionPlaceholderLong: "Departamento en Alfama. Se llega a pie, cerca del tranvía, y la terraza nos acomoda a todos para cenar.",
  cmpdateRangesToChoose: "Rangos de fechas para elegir",
  cmpdateRangeStart: "{label} inicio",
  cmpdateRangeEnd: "{label} fin",
  cmpoptionN: "Opción {n}",
  cmpwhatDeciding: "¿Qué vamos a decidir?",
  cmptitlePlaceholder: "¿Dónde nos quedamos?",
  cmpsectionFormat: "Formato",
  cmpsectionType: "Tipo",
  cmptypeHintAb: "Dos opciones, elige una. Se resuelve en una ronda.",
  cmptypeHintSingle: "Elige una entre varias.",
  cmptypeHintMulti: "Cada quien elige hasta {picks}; gana la más elegida.",
  cmpeachPersonPicks: "Cada persona elige hasta",
  cmponeRoundAb: "Una ronda: A o B se resuelve en un solo voto.",
  cmpsectionRounds: "Rondas",
  cmptoggleAddIdeasTitle: "Cualquiera puede agregar ideas",
  cmptoggleAddIdeasBody: "Desactívalo para dejarlo solo para ti",
  cmptoggleWinnerDatesTitle: "La ganadora fija las fechas del evento",
  cmptoggleWinnerDatesBody: "El rango ganador se convierte en las fechas del evento",
  cmptoggleAnonTitle: "Preguntar de forma anónima",
  cmptoggleAnonBody: "Tu nombre no aparece en la pregunta ni en sus opciones. Igual queda registrado.",
  cmpstartingPending: "Empezando…",
  cmpstartRound1Ideas: "Empezar la ronda 1 · juntar ideas",
  cmpstartRound1: "Empezar la ronda 1",
  cmpcopyForMessenger: "Copiar para Messenger",
  cmpcopied: "Copiado",
  cmptextToCopy: "Texto para copiar",
  cmpcopyLink: "Copiar enlace",
  cmpcopyThisLinkPrompt: "Copia este enlace",
  cmplinkCopiedPaste: "Enlace copiado. Pégalo en Messenger.",
  cmpshare: "Compartir",
  uibackLabel: "Atrás",
  fmtclosingNow: "cierra ahora",
  fmtclosesInMinutes: "cierra en {n} min",
  fmtclosesInHours: "cierra en {n}h",
  fmtclosesAt: "cierra {when}",
  fmtclosesInDays: "cierra en {n} días",
  fmtjustNow: "ahora mismo",
  fmtMinutesAgo: "hace {n} min",
  fmtHoursAgo: "hace {n}h",
  fmtDaysAgo: "hace {n}d",
  fmtnightsCount: "{n} noche",
  fmtdateRangeTitle: "{range} · {nights}",
  errFamnameFamilyRequired: "Ponle un nombre a la familia.",
  errFaminviteCodeInvalid: "Ese código de invitación no parece correcto.",
  errFaminviteLinkExpired: "Ese enlace de invitación ya no es válido. Pide uno nuevo.",
  errFamalreadyInFamily: "Ya estás en {family}. Por ahora, una familia por persona.",
  errFamorganizerOnlyAddSeat: "Solo un organizador puede agregar un lugar para alguien. Pídele que te haga organizador.",
  errFamnamePersonRequired: "Ponle un nombre.",
  errFamduplicateNameAddInitial: "Ya hay un {name} aquí. Agrega la inicial del apellido.",
  errFamproxyLimitReached: "Puedes votar por hasta {max} personas. Pídele a otro adulto que agregue a los demás.",
  errFamnotProxySeat: "Ese lugar no es un lugar delegado.",
  errFamremoveSeatNotAllowed: "Solo quien lo agregó, o un organizador, puede quitar un lugar.",
  errFamorganizerOnlyRemovePeople: "Solo un organizador puede quitar personas.",
  errFampersonNotInFamily: "Esa persona no está en esta familia.",
  errFamcannotRemoveSelf: "No puedes quitarte a ti mismo.",
  errFamcannotRemoveOrganizer: "Los organizadores no se pueden quitar aquí.",
  errFamorganizerOnlyGeneric: "Solo un organizador puede hacer eso.",
  errFamorganizerNeedsAccount: "Solo alguien con una cuenta puede ser organizador.",
  errFamorganizerOnlyChangeInvite: "Solo un organizador puede cambiar el enlace de invitación.",
  errFammakeOrganizerBeforeLeaving: "Haz organizador a otra persona antes de irte.",
  errFamnotAnOrganizer: "Esa persona no es organizadora.",
  errFamneedOneOrganizerDemote: "Primero haz organizador a otra persona: una familia necesita uno.",
  errFamorganizerOnlyMoveSeat: "Solo un organizador puede mover un lugar.",
  errFamhandToOrganizer: "Pásalo a otro organizador.",
  errFamorganizerOnlyDeleteFamily: "Solo un organizador puede eliminar la familia.",
  errFamconfirmDeleteRequired: "Marca la casilla para confirmar que quieres eliminar todo.",
  errFamrenameNotAllowed: "Puedes cambiar tu propio nombre; un organizador puede cambiar el de cualquiera.",
  errFamduplicateName: "Ya hay un {name} aquí.",
  errFamprivacyNotAllowed: "Solo esa persona, o quien vota por ella, puede cambiar esto.",
  errDecEventClosedAddDecisions: "Este evento está cerrado. Vuelve a abrirlo para agregar decisiones.",
  errDecTitleRequired: "¿Qué vamos a decidir? Ponle un título.",
  errDecDeadlineInvalid: "Esa fecha límite no parece correcta.",
  errDecAbJustTwo: "A o B son solo dos opciones. Usa opción múltiple si quieres más.",
  errDecTooManyOptions: "Demasiadas opciones.",
  errDecDateInvalid: "Una de las fechas no parece correcta.",
  errDecEndBeforeStart: "Una fecha de término es anterior a su fecha de inicio.",
  errDecPickDatesFirst: "Elige primero las fechas.",
  errDecTypeIdeaFirst: "Escribe primero la idea.",
  errDecDecisionClosed: "Esta decisión está cerrada.",
  errDecEventClosed: "Este evento está cerrado.",
  errDecAbKeepsTwoOptions: "Esta es una pregunta A o B, así que se queda con sus dos opciones.",
  errDecNoRoundOpenNow: "Ahora mismo no hay ninguna ronda abierta.",
  errDecNoAddDuringFinal: "No se pueden agregar opciones durante la ronda final. Vuelve a abrir la ronda anterior.",
  errDecOnlyOrganizerAddShortlist: "Solo el organizador puede agregar opciones una vez que empezó la ronda de finalistas.",
  errDecOrganizerCollectingIdeas: "El organizador está juntando ideas para esta decisión.",
  errDecIdeaAlreadyListed: "Esa idea ya está en la lista.",
  errDecAlreadySettled: "Esta decisión ya está resuelta.",
  errDecCantVoteFromSeat: "No puedes votar desde ese lugar.",
  errDecNoVoteIdeasRound: "Nadie vota durante la ronda de ideas.",
  errDecPickOneOrSkip: "Elige al menos una, u omite.",
  errDecRoundJustClosed: "Esa ronda acaba de cerrarse.",
  errDecOptionNoLongerRunning: "Una de esas opciones ya no está en juego.",
  errDecPickOne: "Elige una.",
  errDecPickUpTo: "Elige hasta {cap}.",
  errDecOnlyOrganizerOrAsker: "Solo el organizador, o quien hizo esta pregunta, puede hacer eso.",
  errDecNoRoundOpen: "No hay ninguna ronda abierta.",
  errDecNoRoundToExtend: "No hay ninguna ronda abierta para extender.",
  errDecNothingToReopen: "Todavía no hay nada que reabrir.",
  errDecOnlyLastClosedReopen: "Solo se puede reabrir la última ronda cerrada.",
  errDecAlreadySettledReopen: "Esta decisión ya está resuelta. Vuelve a abrirla primero.",
  errDecOptionNotRunning: "Esa opción no está en juego.",
  errDecNoTieToBreak: "No hay ningún empate que desempatar.",
  errDecAbKeepsTwoFixInstead: "Una pregunta A o B se queda con sus dos opciones. Mejor edita una.",
  errDecRemoveOnlyWhileOpen: "Las opciones solo se pueden quitar mientras hay una ronda abierta.",
  errDecNoRemoveDuringFinal: "No se pueden quitar opciones durante la ronda final. Vuelve a abrir la ronda anterior.",
  errDecGiveTitle: "Ponle un título.",
  errDecTickToDelete: "Marca la casilla para eliminar esta decisión de forma definitiva.",
  errDecNotSetAside: "Esta decisión no está apartada.",
  errDecNoRoundToBringBack: "No hay ninguna ronda que recuperar.",
  errDecGiveOptionTitle: "Ponle un título a la opción.",
  errDecOptionNotHere: "Esa opción no está aquí.",
  errDecOptionNameTaken: "Otra opción ya tiene ese nombre.",
  errDecShowHandAfterClose: "Puedes descubrir tu voto una vez que la ronda haya cerrado.",
  errDecNotYourSeat: "Ese no es tu lugar.",
  errDecNounOptions: "opciones",
  errDecNounDateRanges: "rangos de fechas",
  errDecAbNeedsTwo: "A o B necesita exactamente dos {noun} diferentes.",
  errDecShortlistNeedsMin: "Una ronda de finalistas necesita al menos {count} {noun}, o usa un voto rápido.",
  errDecMultiNeedsMin: "«Elegir varias» necesita al menos {count} {noun}, o cambia a opción múltiple.",
  errDecQuickNeedsMin: "Un voto rápido necesita al menos {count} {noun}.",
  errDecOnePerLine: ", una por línea",
  errDecActorSomeone: "Alguien",
  errDecQuickVoteLabel: "voto rápido",
  errDecRoundsCount: "{count} rondas",
  errDecLogOpened: "{actor} abrió «{title}» ({summary}).",
  errDecLogSuggested: "{actor} sugirió «{title}».",
  errDecLogProxyVoted: "{voter} votó por {seat}.",
  errDecLogExtended: "{actor} le dio más tiempo a la ronda {number}.",
  errDecLogReopened: "{actor} volvió a abrir la ronda {number}{clearedOutcome}{votesAgain}.",
  errDecReopenClearedOutcome: " y borró el resultado",
  errDecReopenVotesAgain: "; todos votan de nuevo",
  errDecLogDecided: "{title} decidido: {option}. {actor} lo decidió.",
  errDecLogTiebreak: "{actor} empezó un desempate entre {options}.",
  errDecAndJoiner: " y ",
  errDecAnOption: "una opción",
  errDecLogSetAside: "{actor} dejó «{title}» de lado.",
  errDecLogRemoved: "{actor} quitó «{option}».",
  errDecLogRenamed: "{actor} cambió el nombre de «{oldTitle}» a «{newTitle}».",
  errDecLogOptionChanged: "{actor} cambió «{oldTitle}» por «{newTitle}».",
  errDecLogBroughtBack: "{actor} recuperó «{title}».",
  errDecEventNameRequired: "Ponle un nombre al evento.",
  errDecEventDateInvalid: "Esa fecha no parece correcta.",
  errDecEventEndBeforeStart: "La fecha de término es anterior a la de inicio.",
  errDecEventGone: "Ese evento ya no existe.",
  errDecOnlyOrganizerChange: "Solo el organizador puede cambiar esto.",
  errDecOnlyOrganizerEdit: "Solo el organizador puede editar esto.",
  errDecOnlyOrganizerDeleteEvent: "Solo un organizador puede eliminar un evento.",
  errDecTickToDeleteEvent: "Marca la casilla para confirmar que quieres eliminarlo.",
  errDecLogEventStarted: "{actor} empezó {title}.",
  errDecLogEventUpdated: "{actor} {changes}.",
  errDecChangeRenamedTo: "le cambió el nombre a «{title}»",
  errDecChangeSetDates: "definió las fechas: {startsOn}{endRange}",
  errDecDateToRange: " a {endsOn}",
  errDecChangeClearedDates: "quitó las fechas",

};

const ptBR: Messages = {
  brandName: "Quórum",
  tagline: "Decisões em família, uma rodada de cada vez.",
  landingLede: "Junte os votos em torno da viagem, do jantar, da festa. Vá afunilando em rodadas. Guarde o que ficou decidido.",
  feature1: "Cada decisão vive dentro do seu evento",
  feature2: "Ideias, finalistas e rodada final: rodadas que se fecham sozinhas",
  feature3: "Um link de volta para o chat da família com o que vocês decidiram",
  inAppHint: "O login funciona melhor no seu navegador. Toque no menu e escolha “Abrir no navegador”, depois volte para este link.",
  continueCta: "Continuar com Google, Apple ou Facebook",
  noPasswords: "Sem senhas. Guardamos apenas seu nome e foto para a família saber quem votou.",
  finishSetup: "Concluir a configuração",
  setupHint: "O login é ativado assim que o Clerk estiver conectado.",
  authinAppBrowserNotice: "O login funciona melhor no seu navegador. Toque no menu e escolha “Abrir no navegador” e depois volte para este link.",
  authnotFoundTitle: "Essa página não está aqui.",
  authnotFoundBody: "O link pode estar antigo, ou o evento para o qual ele apontava foi removido.",
  authgoToMyFamily: "Ir para minha família",
  authhome: "Início",
  homeKindTrip: "Viagem",
  homeKindOuting: "Passeio",
  homeKindMeal: "Refeição",
  homeKindParty: "Festa",
  homeKindEvent: "Evento",
  homeRoundsOpen: "{count} rodadas abertas",
  homeGatheringIdeas: "reunindo ideias",
  homeDecisionsWaiting: "{count} decisões aguardando",
  homeAllSettled: "tudo decidido",
  homeGreeting: "Oi, {name}",
  homePeopleLink: "Pessoas",
  homeNeedsYouLabel: "É com você",
  homeOpenCount: "{count} pendentes",
  homeNothingWaiting: "Nada esperando por você agora.",
  homeReasonTie: "terminou em empate",
  homeReasonNoQuorum: "fechou com poucos votos",
  homeReasonNothing: "fechou sem nada a decidir",
  homeOnYouPill: "Depende de você",
  homeSortItOut: "Resolva",
  homeIdeasWanted: "Buscando ideias",
  homePickUpTo: "escolha até {count}",
  homeAlsoFor: "também por {names}",
  homeVotedCount: "{count} de {total} votaram",
  homeAddedIdeasCount: "{count} de {total} enviaram ideias",
  homeAddIdea: "Adicionar ideia",
  homeVote: "Votar",
  homeSoloTitle: "Por enquanto só tem você",
  homeSoloBody: "Compartilhe o link de convite para a família também poder votar. Você também pode adicionar um lugar para uma criança ou avô na página de Pessoas.",
  homeShareTitle: "Junte-se a {family} no {brand}",
  homeShareText: "Vote com a gente no {brand}",
  homeEventsLabel: "Eventos",
  homeSeePast: "Ver anteriores",
  homeNoEventsTitle: "Ainda não há eventos",
  homeNoEventsBody: "Comece com a próxima coisa que vocês precisam decidir juntos: uma viagem, um aniversário, o jantar de sexta.",
  homeDecidedCount: "{decided} de {total} decididas",
  homeNoDecisions: "Ainda não há decisões · adicione a primeira",
  homePastLabel: "Anteriores",
  homeNewEventAria: "Novo evento",
  homeAlsoVoteFor: "Você também vota por {names}",
  homeErrorTitle: "Algo deu errado.",
  homeErrorBody: "Não deu certo. Tente de novo em um instante; se continuar acontecendo, volte ao início e retorne.",
  homeErrorReference: "Referência {digest}",
  homeErrorTryAgain: "Tentar de novo",
  homeErrorHome: "Início",
  eventsKindTrip: "Viagem",
  eventsKindOuting: "Passeio",
  eventsKindMeal: "Refeição",
  eventsKindParty: "Festa",
  eventsKindOther: "Outra coisa",
  eventsBackHome: "Início",
  eventsNewTitle: "Novo evento",
  eventsNewSubtitle: "Aquilo sobre o que vão decidir. As decisões vêm depois.",
  eventsFieldWhatIsIt: "O que é?",
  eventsTitlePlaceholder: "Viagem de verão ’27",
  eventsFieldKind: "Tipo",
  eventsFieldStarts: "Começa",
  eventsStartsHintNew: "Opcional. Deixe em branco se as datas ainda não estão definidas.",
  eventsFieldEnds: "Termina",
  eventsCreatePending: "Criando…",
  eventsCreateSubmit: "Criar evento",
  eventsSummaryDecidedFallback: "decidido",
  eventsShareHelpDecide: "Nos ajude a decidir: {event}",
  eventsSummarySetAside: "pulada",
  eventsSummaryGatheringIdeas: "reunindo ideias",
  eventsSummaryWaitingOrganizer: "esperando o organizador",
  eventsSummarySeeItAll: "Veja tudo: {url}",
  eventsCopySummaryLabel: "Copiar resumo para o Messenger",
  eventsEdit: "Editar",
  eventsShareTitle: "{event} · o que decidimos",
  eventsDatesOpen: "Datas em aberto",
  eventsDecidedOfTotal: "{decided} de {decisions}",
  eventsDecidedSoFar: "Decidido até agora",
  eventsNothingSettled: "Nada decidido ainda. A primeira decisão costuma ser rápida.",
  eventsWhenLabel: "Quando",
  eventsNightCount: "{count} noite",
  eventsDecisionsInOrder: "Em ordem",
  eventsDecisionsHeading: "Decisões",
  eventsVotedCount: "{voted} de {total} votaram",
  eventsNotYouYet: "você ainda não",
  eventsChange: "Alterar",
  eventsVote: "Votar",
  eventsDecidedFallbackCap: "Decidido",
  eventsSetAsideCap: "Pulada",
  eventsGatheringIdeasCap: "Reunindo ideias",
  eventsIdeaCount: "{count} ideia",
  eventsSoFar: "até agora",
  eventsWaitingOrganizerCap: "Esperando o organizador",
  eventsNotSettled: "Sem decisão",
  eventsSeeIdeas: "Ver ideias",
  eventsAddIdea: "Adicionar ideia",
  eventsReorderDecisions: "Reordenar decisões",
  eventsMoveUp: "Mover para cima",
  eventsMoveDown: "Mover para baixo",
  eventsAddDecision: "Adicionar uma decisão",
  eventsEventStatusReopen: "Este evento está {status}. Reabra para continuar decidindo.",
  eventsHowWeGotHere: "Como chegamos aqui",
  eventsSeeAll: "Ver tudo",
  eventsMarkDone: "Marcar este evento como concluído",
  eventsReopenEvent: "Reabrir este evento",
  eventsEditTitle: "Editar evento",
  eventsFieldName: "Nome",
  eventsStartsHintEdit: "Apague as duas para deixar as datas em aberto.",
  eventsSaveChanges: "Salvar alterações",
  eventsDeleteTitle: "Excluir este evento",
  eventsDeleteWarning: "Remove todas as decisões, votos e entradas do registro dele. Não há como desfazer. Se preferir, marque como concluído para manter o registro.",
  eventsDeleteConfirm: "Sim, excluir “{event}” para todos",
  eventsDeleteSubmit: "Excluir evento",
  eventsLogEntryCount: "{count} entradas",
  eventsLogNewestFirst: "Tudo, mais recente primeiro",
  newDecisionHeading: "Nova decisão",
  decisionstepTiebreak: "Desempate",
  decisionpillWinner: "Vencedora",
  decisionpillToFinal: "Para a final",
  decisionvotesFrom: "{votes} de {people}",
  decisionvoteCount: "{count} voto",
  decisionpersonCount: "{count} pessoa",
  decisionpicksUpToEach: "até {cap} cada um",
  decisionskippedCount: "{count} pularam",
  decisionskippedNames: "pularam: {names}",
  decisionprivateVotesNote: "{hidden} de {voters} votaram em modo privado, então esta rodada mostra apenas as contagens.",
  decisionvoterLeft: "alguém que saiu",
  decisionviaCaster: "{name} (por {caster})",
  decisioncasterFallback: "alguém",
  decisioneventClosedNote: "Este evento está {status}, então a votação está encerrada aqui.",
  decisiondecidedOn: "Decidido {date}",
  decisioneventDatesSet: "Estas são agora as datas do evento.",
  decisioncopyForMessenger: "Copiar para o Messenger",
  decisioncopyDecidedLine: "Decidido: {outcome}{tally}.",
  decisionreopenChangedMinds: "Mudaram de ideia? Reabra a última rodada",
  decisionsetAsideNote: "Esta decisão foi deixada de lado.",
  decisionbringItBack: "Trazer de volta",
  decisiondeleteForGood: "Excluir de vez…",
  decisiondeleteConfirmVotes: "Excluir esta decisão e seus votos de vez.",
  decisiondeleteDecision: "Excluir decisão",
  decisionideasSoFar: "Ideias até agora",
  decisionideaCount: "{count} ideia",
  decisionnoIdeasYet: "Ainda não há ideias. Seja o primeiro.",
  decisionsomeoneFallback: "Alguém",
  decisionpersonsIdea: "ideia de {name}",
  decisionanonymousIdea: "Ideia anônima",
  decisiongotAllIdeas: "Já tem todas as ideias?",
  decisionideasCloseHint: "As rodadas de ideias só fecham no prazo. Comece a próxima rodada quando a lista parecer completa.",
  decisionstartTheFinal: "Começar a final",
  decisionstartTheShortlist: "Começar a rodada de finalistas",
  decisionsuggestDates: "Sugira datas",
  decisionaddDateRange: "Adicione um intervalo de datas",
  decisionariaStart: "Início",
  decisionariaEnd: "Fim",
  decisionaddAnIdea: "Adicione uma ideia",
  decisionaddAnOption: "Adicione uma opção",
  decisionlongTextPlaceholder: "Um parágrafo: o plano, o lugar, o porquê",
  decisiontitlePlaceholder: "Casa de praia em Cascais",
  decisionwhyPlaceholder: "Por quê? (opcional)",
  decisionsuggestAnonymously: "Sugerir anonimamente",
  decisionaddButton: "Adicionar",
  decisionorganizerCollectingIdeas: "O organizador está reunindo ideias para esta.",
  decisionstatusVotedHidden: "votou · oculto",
  decisionstatusVoted: "votou",
  decisionstatusSkipped: "pulou",
  decisionstatusNotYet: "ainda não",
  decisionyourVote: "Seu voto",
  decisionvotingFor: "Votando por {name}",
  decisionvotedOfTotal: "{voted} de {total} votaram",
  decisionwaitingOn: "esperando por {names}",
  decisionideasCloseNote: "As ideias {closes}.",
  decisionchangeMindNote: "Você pode mudar de ideia até a rodada fechar. {closes}, ou assim que todos votarem.",
  decisioncopyAddIdeas: "Adicione suas ideias, {closes}:",
  decisioncopyVote: "{round}. Vote, {closes}:",
  decisioncopyStillWaiting: "Ainda esperando por {names}.",
  decisiontieHeading: "Deu empate",
  decisiontieEndedLevel: "{options} terminaram empatadas.",
  decisiontiedJoinAnd: "e",
  decisiontieOrganizerHint: "Faça mais uma rodada entre elas, ou simplesmente decida.",
  decisiontieMemberHint: "O organizador vai desempatar.",
  decisiontiebreakRound: "Rodada de desempate",
  decisionjustTake: "Fique com {option}",
  decisionnotEnoughVotes: "Votos insuficientes",
  decisiontimeRanOut: "O tempo acabou com {turnout} de {members} votando.",
  decisionnoQuorumOrganizerHint: "Nada foi decidido. Dê mais tempo, vá com o líder ou deixe de lado.",
  decisionnoQuorumMemberHint: "Nada foi decidido ainda. O organizador vai dar mais tempo ou decidir.",
  decisiongiveMoreTime: "Dar mais tempo",
  decisiongoWith: "Vá com {option}",
  decisionsetAside: "Deixar de lado",
  decisionnothingToVote: "Nada para votar.",
  decisionnoIdeasCameIn: "Nenhuma ideia chegou antes de a rodada fechar.",
  decisionclosedNoResult: "A rodada fechou sem resultado.",
  decisionreopenOrSetAsideHint: "Reabra a última rodada ou deixe esta decisão de lado.",
  decisionorganizerCanReopen: "O organizador pode reabri-la.",
  decisionreopenLastRound: "Reabrir a última rodada",
  decisionhowItWent: "Como ficou",
  decisionearlierRounds: "Rodadas anteriores",
  decisionroundClosed: "{round} fechada",
  decisioncloseEveryoneVoted: "todos votaram, então fechou mais cedo",
  decisioncloseDeadline: "o tempo acabou",
  decisioncloseNoQuorum: "o tempo acabou, poucos votaram",
  decisioncloseByOrganizer: "fechada pelo organizador",
  decisionideasCameIn: "Chegaram {ideas}.",
  decisionshowMyHand: "Mostrar meu voto",
  decisionshowHand: "Mostrar o voto de {name}",
  decisionorganizerLabel: "Organizador",
  decisioncloseRoundNow: "Fechar esta rodada agora",
  decisionreopenRoundN: "Reabrir a rodada {number}",
  decisionrenameLabel: "Renomear",
  decisionsaveTitle: "Salvar título",
  decisionremoveOptionLabel: "Remover uma opção",
  decisionremove: "Remover",
  decisionfixOptionLabel: "Corrigir uma opção",
  decisionariaTitle: "Título",
  decisionnotePlaceholder: "Nota (opcional)",
  decisionsaveOption: "Salvar opção",
  decisionjustCallIt: "Decida você",
  decisiondecide: "Decidir",
  decisionsetThisAside: "Deixar esta decisão de lado",
  decisiondeleteThisDots: "Excluir esta decisão…",
  decisiondeleteConfirmAll: "Excluí-la e todos os seus votos de vez.",
  decisionorganizerFooter: "Estas opções são para você e para quem fez a pergunta. Tudo aqui fica registrado no histórico do evento.",
  decisionpillAskedAnonymously: "Perguntado anonimamente",
  familybackHome: "Início",
  familyintroSubtitle: "Todo mundo aqui pode votar em cada evento.",
  familyinviteLinkLabel: "Link de convite",
  familyshareTitle: "Entre em {family} no {brand}",
  familyshareText: "Vote com a gente no {brand}",
  familyinviteJoinNote: "Qualquer pessoa com o link pode entrar depois de fazer login.",
  familyrotateInvite: "Criar um link novo (o antigo para de funcionar)",
  familymembersHeading: "Membros",
  familyseatCount: "{count} lugares",
  familyyouSuffix: " (você)",
  familyroleOrganizer: "Organizador",
  familyroleProxyDesc: "Sem conta · alguém vota por esse lugar",
  familyroleMember: "Membro",
  familymakeOrganizer: "Tornar organizador",
  familymakeMember: "Tornar membro",
  familyremove: "Remover",
  familyproxyPill: "tutelado",
  familyrenameToggle: "Renomear",
  familynameFieldAria: "Nome",
  familysaveMember: "Salvar",
  familyvotePrivacyToggle: "Privacidade do voto",
  familyprivacyStatusMineHidden: "Seus votos começam ocultos.",
  familyprivacyStatusMineShown: "Seus votos aparecem com seu nome.",
  familyprivacyStatusOtherHidden: "Os votos de {name} começam ocultos.",
  familyprivacyStatusOtherShown: "Os votos de {name} aparecem com o nome.",
  familyprivacyExplain: "Os votos ocultos são contados e ainda ficam registrados com o nome. Se alguém ocultar, essa rodada mostra só os totais. Você pode revelar seu voto em qualquer decisão.",
  familyprivacyToggleMineShow: "Mostrar meus votos com meu nome",
  familyprivacyToggleMineHide: "Ocultar meus votos por padrão",
  familyprivacyToggleOtherShow: "Mostrar os votos de {name} com o nome",
  familyprivacyToggleOtherHide: "Ocultar os votos de {name} por padrão",
  familyproxyManagerToggle: "Quem vota por este lugar",
  familyhandToAria: "Passar para",
  familyhandOver: "Passar",
  familyaddProxyLabel: "Adicionar alguém sem celular",
  familyaddProxyHint: "Uma criança ou um avô. Você registra o voto dela pela sua tela, e ele conta como o de todo mundo. Até quatro por organizador.",
  familyaddProxyPlaceholder: "Alice",
  familyaddSeat: "Adicionar um lugar",
  familynonOrganizerNote: "Os organizadores adicionam lugares para crianças e parentes sem conta, e podem tornar outro adulto organizador.",
  familyleave: "Sair desta família",
  familyrenameFamilyLabel: "Renomear a família",
  familysaveName: "Salvar nome",
  familydeleteToggle: "Excluir esta família…",
  familydeleteConfirm: "Excluir {family} e todos os eventos, decisões e votos dela. Isso não pode ser desfeito.",
  familydeleteButton: "Excluir a família inteira",
  familynewTitle: "Quem decide junto?",
  familynewSubtitle: "Comece sua família e depois envie a todos um único link de convite.",
  familynameFieldLabel: "Nome da família",
  familynamePlaceholder: "Os Silva",
  familystartButton: "Começar a família",
  familyjoinCodeLabel: "Tem um código de convite?",
  familyjoinCodeHint: "É a última parte do link de convite que alguém te enviou.",
  familyjoinCodePlaceholder: "abcd2345",
  familyjoinButton: "Entrar em uma família",
  pubMetaInviteTitle: "Convite",
  pubMetaJoinFamilyTitle: "Junte-se a {family} no {brand}",
  pubMetaInviteBrandTitle: "Convite · {brand}",
  pubMetaJoinDescription: "{count} pessoas dentro. Entre com Google, Apple ou Facebook para votar com eles.",
  pubMetaInviteInvalidDescription: "Este link de convite não é mais válido.",
  pubInvalidTitle: "Esse link de convite não é válido.",
  pubInvalidBody: "Ele pode ter sido substituído. Peça um novo para quem te enviou.",
  pubGoToYourFamily: "Ir para sua família",
  pubHome: "Início",
  pubInvitedToJoin: "Você foi convidado para entrar em",
  pubPeopleIn: "{count} pessoas dentro",
  pubInAppBrowserHint: "O login funciona melhor no seu navegador. Toque no menu e escolha “Abrir no navegador”, depois volte para este link.",
  pubContinueSocial: "Continuar com Google, Apple ou Facebook",
  pubImNewHere: "Sou novo por aqui",
  pubNoPasswords: "Sem senhas. Guardamos apenas seu nome e foto para a família saber quem votou.",
  pubAlreadyInFamily: "Você já está em {family}. Por enquanto, uma família por pessoa.",
  pubGoToNamedFamily: "Ir para {family}",
  pubJoiningPending: "Entrando…",
  pubJoinAsName: "Entrar como {name}",
  pubMetaSummaryTitle: "Resumo",
  pubMetaDecidedCount: "{decided} de {total} decididas",
  pubMetaOpenCount: "{count} abertas",
  pubMetaDecidedTitle: "{event} · o que decidimos",
  pubLinkDead: "Este link não leva mais a lugar nenhum.",
  pubUpdatedTime: "Atualizado {time}",
  pubDecidedHeading: "O que decidimos",
  pubReadOnlyLink: "{family} · link somente leitura",
  pubDatesTBD: "Datas a definir",
  pubPeopleCount: "{count} pessoas",
  pubNightsCount: "{count} noite",
  pubNoDecisions: "Ainda não há decisões.",
  pubSetAside: "Deixada de lado",
  pubGatheringIdeas: "Reunindo ideias",
  pubWaitingOrganizer: "Aguardando o organizador",
  pubOnlyFamilyVotes: "Só a família pode votar",
  pubDecidedToGo: "{decided} decididas · faltam {remaining}",
  pubOpenAndVote: "Abra e vote",
  pubJoinToVote: "Junte-se a {family} para votar",
  pubHowWeGotHere: "Como chegamos aqui",
  cmppickOne: "Escolha uma",
  cmppickUpTo: "Escolha até {max}",
  cmpchangeVote: "Mudar meu voto · {count} escolhidas",
  cmpcastVote: "Enviar meu voto · {count} escolhidas",
  cmpshowMore: "Ver mais",
  cmpshowLess: "Ver menos",
  cmphideVote: "Ocultar meu voto",
  cmphideVoteHint: "Mesmo assim fica registrado com seu nome, só não aparece para a família. Se alguém ocultar, esta rodada mostra só as contagens.",
  cmpskipDone: "Pulado · o que vocês decidirem",
  cmpskip: "Pular esta · o que vocês decidirem",
  cmptonight: "Hoje à noite",
  cmponeDay: "1 dia",
  cmpthreeDays: "3 dias",
  cmponeWeek: "1 semana",
  cmpround1Closes: "A rodada 1 fecha",
  cmptonightHint: "20h no seu horário. As próximas rodadas têm um dia cada.",
  cmpdeadlineHint: "As próximas rodadas têm o mesmo. Uma rodada também fecha assim que todos tiverem votado ou pulado.",
  cmpformatHintText: "Uma linha curta para cada uma.",
  cmpformatHintLongText: "Um parágrafo cada uma: um plano, um lugar, o porquê.",
  cmpformatHintDate: "Períodos de datas. A vencedora pode definir as datas do evento.",
  cmpplanBodyQuick: "Uma rodada. O jantar de hoje à noite.",
  cmpplanBodyShortlist: "Duas rodadas. Reduza as opções e depois escolha.",
  cmpplanBodyIdeas: "Três rodadas. Primeiro junte ideias.",
  cmpcountHintIdeas: "Começando com ideias? Deixe isto vazio e cada um adiciona as suas.",
  cmpcountHintExactly: "Exatamente {min}.",
  cmpcountHintAtLeast: "Pelo menos {min}.",
  cmpcountHintPicks: " Com {count} opções cada um escolhe até {picks}.",
  cmptwoOptions: "As duas opções",
  cmpoptionYes: "Sim",
  cmpoptionNo: "Não",
  cmpyesNo: "Sim / Não",
  cmpoptionsOnePerLine: "Opções, uma por linha",
  cmpoptionsPlaceholderText: "Apartamento em Alfama\nCasa de praia em Cascais\nHotel perto de Belém",
  cmpoptionsAParagraphEach: "Opções, um parágrafo cada uma",
  cmpoptionPlaceholderLong: "Apartamento em Alfama. Dá para ir a pé, perto do bonde, e o terraço acomoda todos nós no jantar.",
  cmpdateRangesToChoose: "Períodos de datas para escolher",
  cmpdateRangeStart: "{label} início",
  cmpdateRangeEnd: "{label} fim",
  cmpoptionN: "Opção {n}",
  cmpwhatDeciding: "O que vamos decidir?",
  cmptitlePlaceholder: "Onde vamos ficar?",
  cmpsectionFormat: "Formato",
  cmpsectionType: "Tipo",
  cmptypeHintAb: "Duas opções, escolha uma. Resolvido em uma rodada.",
  cmptypeHintSingle: "Escolha uma entre várias.",
  cmptypeHintMulti: "Cada um escolhe até {picks}; vence a mais escolhida.",
  cmpeachPersonPicks: "Cada pessoa escolhe até",
  cmponeRoundAb: "Uma rodada: A ou B é resolvido em um só voto.",
  cmpsectionRounds: "Rodadas",
  cmptoggleAddIdeasTitle: "Qualquer um pode adicionar ideias",
  cmptoggleAddIdeasBody: "Desative para deixar só com você",
  cmptoggleWinnerDatesTitle: "A vencedora define as datas do evento",
  cmptoggleWinnerDatesBody: "O período vencedor vira as datas do evento",
  cmptoggleAnonTitle: "Perguntar de forma anônima",
  cmptoggleAnonBody: "Seu nome não aparece na pergunta nem nas opções. Mesmo assim fica registrado.",
  cmpstartingPending: "Começando…",
  cmpstartRound1Ideas: "Começar a rodada 1 · juntar ideias",
  cmpstartRound1: "Começar a rodada 1",
  cmpcopyForMessenger: "Copiar para o Messenger",
  cmpcopied: "Copiado",
  cmptextToCopy: "Texto para copiar",
  cmpcopyLink: "Copiar link",
  cmpcopyThisLinkPrompt: "Copie este link",
  cmplinkCopiedPaste: "Link copiado. Cole no Messenger.",
  cmpshare: "Compartilhar",
  uibackLabel: "Voltar",
  fmtclosingNow: "fecha agora",
  fmtclosesInMinutes: "fecha em {n} min",
  fmtclosesInHours: "fecha em {n}h",
  fmtclosesAt: "fecha {when}",
  fmtclosesInDays: "fecha em {n} dias",
  fmtjustNow: "agora mesmo",
  fmtMinutesAgo: "há {n} min",
  fmtHoursAgo: "há {n}h",
  fmtDaysAgo: "há {n}d",
  fmtnightsCount: "{n} noite",
  fmtdateRangeTitle: "{range} · {nights}",
  errFamnameFamilyRequired: "Dê um nome à família.",
  errFaminviteCodeInvalid: "Esse código de convite não parece certo.",
  errFaminviteLinkExpired: "Esse link de convite não é mais válido. Peça um novo.",
  errFamalreadyInFamily: "Você já está em {family}. Por enquanto, uma família por pessoa.",
  errFamorganizerOnlyAddSeat: "Só um organizador pode adicionar um lugar para alguém. Peça para te tornarem organizador.",
  errFamnamePersonRequired: "Dê um nome a essa pessoa.",
  errFamduplicateNameAddInitial: "Já tem um {name} aqui. Adicione a inicial do sobrenome.",
  errFamproxyLimitReached: "Você pode votar por até {max} pessoas. Peça a outro adulto para adicionar o restante.",
  errFamnotProxySeat: "Esse lugar não é um lugar tutelado.",
  errFamremoveSeatNotAllowed: "Só quem adicionou, ou um organizador, pode remover um lugar.",
  errFamorganizerOnlyRemovePeople: "Só um organizador pode remover pessoas.",
  errFampersonNotInFamily: "Essa pessoa não está nesta família.",
  errFamcannotRemoveSelf: "Você não pode remover a si mesmo.",
  errFamcannotRemoveOrganizer: "Organizadores não podem ser removidos aqui.",
  errFamorganizerOnlyGeneric: "Só um organizador pode fazer isso.",
  errFamorganizerNeedsAccount: "Só alguém com uma conta pode ser organizador.",
  errFamorganizerOnlyChangeInvite: "Só um organizador pode alterar o link de convite.",
  errFammakeOrganizerBeforeLeaving: "Torne outra pessoa organizadora antes de sair.",
  errFamnotAnOrganizer: "Essa pessoa não é organizadora.",
  errFamneedOneOrganizerDemote: "Primeiro torne outra pessoa organizadora — toda família precisa de um.",
  errFamorganizerOnlyMoveSeat: "Só um organizador pode mover um lugar.",
  errFamhandToOrganizer: "Passe para outro organizador.",
  errFamorganizerOnlyDeleteFamily: "Só um organizador pode excluir a família.",
  errFamconfirmDeleteRequired: "Marque a caixa para confirmar que você quer excluir tudo.",
  errFamrenameNotAllowed: "Você pode alterar seu próprio nome; um organizador pode alterar o de qualquer pessoa.",
  errFamduplicateName: "Já tem um {name} aqui.",
  errFamprivacyNotAllowed: "Só essa pessoa, ou quem vota por ela, pode alterar isso.",
  errDecEventClosedAddDecisions: "Este evento está fechado. Reabra-o para adicionar decisões.",
  errDecTitleRequired: "O que vamos decidir? Dê um título.",
  errDecDeadlineInvalid: "Esse prazo não parece certo.",
  errDecAbJustTwo: "A ou B são apenas duas opções. Use múltipla escolha para mais.",
  errDecTooManyOptions: "Opções demais.",
  errDecDateInvalid: "Uma das datas não parece certa.",
  errDecEndBeforeStart: "Uma data de término é anterior à data de início.",
  errDecPickDatesFirst: "Escolha as datas primeiro.",
  errDecTypeIdeaFirst: "Digite a ideia primeiro.",
  errDecDecisionClosed: "Esta decisão está fechada.",
  errDecEventClosed: "Este evento está fechado.",
  errDecAbKeepsTwoOptions: "Esta é uma pergunta A ou B, então ela mantém suas duas opções.",
  errDecNoRoundOpenNow: "Nenhuma rodada está aberta agora.",
  errDecNoAddDuringFinal: "Não dá para adicionar opções durante a rodada final. Em vez disso, reabra a rodada anterior.",
  errDecOnlyOrganizerAddShortlist: "Só o organizador pode adicionar opções depois que a rodada de finalistas começou.",
  errDecOrganizerCollectingIdeas: "O organizador está recolhendo as ideias desta decisão.",
  errDecIdeaAlreadyListed: "Essa ideia já está na lista.",
  errDecAlreadySettled: "Esta decisão já está resolvida.",
  errDecCantVoteFromSeat: "Você não pode votar por esse lugar.",
  errDecNoVoteIdeasRound: "Ninguém vota durante a rodada de ideias.",
  errDecPickOneOrSkip: "Escolha pelo menos uma, ou pule.",
  errDecRoundJustClosed: "Essa rodada acabou de fechar.",
  errDecOptionNoLongerRunning: "Uma dessas opções não está mais na disputa.",
  errDecPickOne: "Escolha uma.",
  errDecPickUpTo: "Escolha até {cap}.",
  errDecOnlyOrganizerOrAsker: "Só o organizador, ou quem fez esta pergunta, pode fazer isso.",
  errDecNoRoundOpen: "Nenhuma rodada está aberta.",
  errDecNoRoundToExtend: "Nenhuma rodada aberta para estender.",
  errDecNothingToReopen: "Ainda não há nada para reabrir.",
  errDecOnlyLastClosedReopen: "Só a última rodada fechada pode ser reaberta.",
  errDecAlreadySettledReopen: "Esta decisão já está resolvida. Reabra-a primeiro.",
  errDecOptionNotRunning: "Essa opção não está na disputa.",
  errDecNoTieToBreak: "Não há empate para desempatar.",
  errDecAbKeepsTwoFixInstead: "Uma pergunta A ou B mantém suas duas opções. Edite uma, em vez disso.",
  errDecRemoveOnlyWhileOpen: "As opções só podem ser removidas enquanto uma rodada está aberta.",
  errDecNoRemoveDuringFinal: "Não dá para remover opções durante a rodada final. Em vez disso, reabra a rodada anterior.",
  errDecGiveTitle: "Dê um título.",
  errDecTickToDelete: "Marque a caixa para excluir esta decisão de vez.",
  errDecNotSetAside: "Esta decisão não foi deixada de lado.",
  errDecNoRoundToBringBack: "Não há rodada para trazer de volta.",
  errDecGiveOptionTitle: "Dê um título à opção.",
  errDecOptionNotHere: "Essa opção não está aqui.",
  errDecOptionNameTaken: "Outra opção já tem esse nome.",
  errDecShowHandAfterClose: "Você pode revelar seu voto depois que a rodada fechar.",
  errDecNotYourSeat: "Esse lugar não é seu.",
  errDecNounOptions: "opções",
  errDecNounDateRanges: "períodos de datas",
  errDecAbNeedsTwo: "A ou B precisa de exatamente duas {noun} diferentes.",
  errDecShortlistNeedsMin: "Uma rodada de finalistas precisa de pelo menos {count} {noun}, ou use um voto rápido.",
  errDecMultiNeedsMin: "«Escolher várias» precisa de pelo menos {count} {noun}, ou mude para múltipla escolha.",
  errDecQuickNeedsMin: "Um voto rápido precisa de pelo menos {count} {noun}.",
  errDecOnePerLine: ", uma por linha",
  errDecActorSomeone: "Alguém",
  errDecQuickVoteLabel: "voto rápido",
  errDecRoundsCount: "{count} rodadas",
  errDecLogOpened: "{actor} abriu \"{title}\" ({summary}).",
  errDecLogSuggested: "{actor} sugeriu \"{title}\".",
  errDecLogProxyVoted: "{voter} votou por {seat}.",
  errDecLogExtended: "{actor} deu mais tempo para a rodada {number}.",
  errDecLogReopened: "{actor} reabriu a rodada {number}{clearedOutcome}{votesAgain}.",
  errDecReopenClearedOutcome: " e limpou o resultado",
  errDecReopenVotesAgain: "; todo mundo vota de novo",
  errDecLogDecided: "{title} decidido: {option}. {actor} bateu o martelo.",
  errDecLogTiebreak: "{actor} começou um desempate entre {options}.",
  errDecAndJoiner: " e ",
  errDecAnOption: "uma opção",
  errDecLogSetAside: "{actor} deixou \"{title}\" de lado.",
  errDecLogRemoved: "{actor} removeu \"{option}\".",
  errDecLogRenamed: "{actor} renomeou \"{oldTitle}\" para \"{newTitle}\".",
  errDecLogOptionChanged: "{actor} mudou \"{oldTitle}\" para \"{newTitle}\".",
  errDecLogBroughtBack: "{actor} trouxe \"{title}\" de volta.",
  errDecEventNameRequired: "Dê um nome ao evento.",
  errDecEventDateInvalid: "Essa data não parece certa.",
  errDecEventEndBeforeStart: "A data de término é anterior à data de início.",
  errDecEventGone: "Esse evento não existe mais.",
  errDecOnlyOrganizerChange: "Só o organizador pode alterar isso.",
  errDecOnlyOrganizerEdit: "Só o organizador pode editar isso.",
  errDecOnlyOrganizerDeleteEvent: "Só um organizador pode excluir um evento.",
  errDecTickToDeleteEvent: "Marque a caixa para confirmar que quer excluí-lo.",
  errDecLogEventStarted: "{actor} começou {title}.",
  errDecLogEventUpdated: "{actor} {changes}.",
  errDecChangeRenamedTo: "renomeou para \"{title}\"",
  errDecChangeSetDates: "definiu as datas: {startsOn}{endRange}",
  errDecDateToRange: " a {endsOn}",
  errDecChangeClearedDates: "limpou as datas",

};

const DICTS: Record<Locale, Messages> = { en, es, "pt-BR": ptBR };

export function messages(locale: Locale): Messages {
  return DICTS[locale] ?? en;
}

/** Fill {placeholder} tokens in a catalog string: interpolate(t.homeGreeting, { name }). */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
