// Mock data for the Onboarding Lifecycle view.
// Mirrors the actual Salesforce structure:
//   Account.Onboarding_Status__c (picklist, manual update, weekly cadence)
//   Account.Hypercare__c — captured separately for clarity here
//   Project__c records: one active Project per Account in onboarding
//   Project__c.Stage__c (picklist with Hypercare among values)
//   Project tasks (related Task records): Review Training, Test Patients,
//     Connect Devices, Enroll Team Members, etc.
//   Project__c.Migration_Questionnaire_Status__c, Kickoff_Requested__c

export type Bucket = "B1" | "B2" | "B3" | "B4" | "B5" | "B6" | "B7";

export const bucketLabels: Record<Bucket, string> = {
  B1: "Hand-Raised 2.0 Migration",
  B2: "Deferred 2.0 Migration",
  B3: "Pre-Kickoff Active",
  B4: "Post-Kickoff STUCK",
  B5: "Mid-Journey Working",
  B6: "Near-Launch",
  B7: "Launched",
};

export const bucketShort: Record<Bucket, string> = {
  B1: "Hand-Raised",
  B2: "Deferred",
  B3: "Pre-Kickoff",
  B4: "Post-Kickoff STUCK",
  B5: "Mid-Journey",
  B6: "Near-Launch",
  B7: "Launched",
};

// April 30 baseline from the playbook
export const bucketBaseline: Record<Bucket, number> = {
  B1: 23,
  B2: 68,
  B3: 68,
  B4: 55,
  B5: 108,
  B6: 22,
  B7: 23,
};

// CSMs running the May operation
export const csms = [
  { id: "elaine", name: "Elaine Peters", region: "Premier/Enterprise + escalations + US Central/West", total: 148, hypercare: 16 },
  { id: "jillian", name: "Jillian Ramos", region: "Mid-tier Professional, US-wide, fresh onboardings", total: 147, hypercare: 6 },
  { id: "varsha", name: "Varsha Yaddala", region: "EMEA + APAC-ANZ + 12 US East Coast", total: 72, hypercare: 13 },
];

// CSM × Bucket grid — pulled directly from playbook Part 3
export const csmByBucket: Array<{ csm: string; B1: number; B2: number; B3: number; B4: number; B5: number; B6: number; B7: number; total: number }> = [
  { csm: "Elaine Peters", B1: 4, B2: 8, B3: 36, B4: 24, B5: 55, B6: 11, B7: 10, total: 148 },
  { csm: "Jillian Ramos", B1: 18, B2: 49, B3: 20, B4: 7, B5: 34, B6: 7, B7: 12, total: 147 },
  { csm: "Varsha Yaddala", B1: 1, B2: 11, B3: 12, B4: 24, B5: 19, B6: 4, B7: 1, total: 72 },
];

// The standup metric — net Review Training + Test Patients completions, trailing 7 days, per CSM.
// Targets per playbook: W1 baseline (5-8), W2 12-15, W3 10-12, W4 8-10. Total May target 120+.
// Showing W2 mid-week numbers as the "current" snapshot for the dashboard.
export interface StandupMetric {
  csm: string;
  thisWeek: number;
  lastWeek: number;
  weekTarget: number;
  totalMay: number;
  monthTarget: number;
  // Source bucket breakdown for completions this week
  fromB4: number;
  fromB5: number;
}

export const standupMetrics: StandupMetric[] = [
  { csm: "Elaine Peters", thisWeek: 13, lastWeek: 7, weekTarget: 14, totalMay: 20, monthTarget: 45, fromB4: 4, fromB5: 9 },
  { csm: "Jillian Ramos", thisWeek: 11, lastWeek: 6, weekTarget: 14, totalMay: 17, monthTarget: 40, fromB4: 2, fromB5: 9 },
  { csm: "Varsha Yaddala", thisWeek: 9, lastWeek: 5, weekTarget: 13, totalMay: 14, monthTarget: 35, fromB4: 5, fromB5: 4 },
];

// Subtask velocity — the May goal is 120+ team total. From baseline:
// Review Training: 133 done → target 200+
// Test Patients: 111 done → target 165+
export const subtaskVelocity = [
  { task: "Review Training", baseline: 133, current: 158, target: 200 },
  { task: "Test Patients", baseline: 111, current: 134, target: 165 },
  { task: "Enroll Team Members", baseline: 198, current: 218, target: 250 },
  { task: "Connect Devices", baseline: 89, current: 102, target: 140 },
];

// Bucket movement — week-over-week.
// W18 (current) is the snapshot; show movement from W17 last Friday update.
// Per the playbook: "with parity now live and demo patients seeded, we expect
// material movement out of B4 and B5 within 2-3 weeks."
export const bucketMovement: Array<{ bucket: Bucket; baseline: number; lastWeek: number; thisWeek: number }> = [
  { bucket: "B1", baseline: 23, lastWeek: 23, thisWeek: 18 }, // 5 moved to B3 (kicked off)
  { bucket: "B2", baseline: 68, lastWeek: 68, thisWeek: 64 }, // 4 hand-raised → B1
  { bucket: "B3", baseline: 68, lastWeek: 71, thisWeek: 73 }, // gained 5 from B1, lost 0 to B4 yet
  { bucket: "B4", baseline: 55, lastWeek: 52, thisWeek: 47 }, // 5 moved through Enroll Team
  { bucket: "B5", baseline: 108, lastWeek: 108, thisWeek: 103 }, // 5 moved to B6 in W2 sprint
  { bucket: "B6", baseline: 22, lastWeek: 23, thisWeek: 26 }, // gained 5 from B5
  { bucket: "B7", baseline: 23, lastWeek: 25, thisWeek: 28 }, // 3 launches in W2
];

// Active Onboarding Lifecycle accounts — one Project per Account in onboarding
export interface OnboardingAccount {
  id: string;
  accountName: string;
  bucket: Bucket;
  csmOwner: string;
  hypercare: boolean;
  projectStage: string; // Project__c.Stage__c picklist value
  arr: number;
  createdDaysAgo: number;
  daysInBucket: number;
  goLiveDate: string | null;
  // Task completion ratio
  tasksCompleted: number;
  tasksTotal: number;
  // Next blocking task (string label)
  nextBlockingTask: string | null;
  // Hand-raise signals (B2 only)
  questionnaireComplete: boolean;
  kickoffRequested: boolean;
  // Recent completions feeding standup metric
  reviewTrainingCompletedThisWeek: boolean;
  testPatientsCompletedThisWeek: boolean;
  // Champion confirmation
  championLastConfirmed: number; // days ago
}

export const onboardingAccounts: OnboardingAccount[] = [
  // B1 hand-raised (sample of 23) — recently raised hand to migrate
  { id: "ACC-201", accountName: "Westshore Wellness Group", bucket: "B1", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Re-Launch Scheduled", arr: 32000, createdDaysAgo: 8, daysInBucket: 6, goLiveDate: null, tasksCompleted: 0, tasksTotal: 12, nextBlockingTask: "Schedule kickoff", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 4 },
  { id: "ACC-202", accountName: "Apex Longevity Center", bucket: "B1", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Re-Launch Scheduled", arr: 64000, createdDaysAgo: 5, daysInBucket: 5, goLiveDate: null, tasksCompleted: 0, tasksTotal: 12, nextBlockingTask: "Schedule kickoff", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 2 },

  // B3 pre-kickoff
  { id: "ACC-301", accountName: "Solstice Health", bucket: "B3", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Pre-Kickoff", arr: 38000, createdDaysAgo: 18, daysInBucket: 18, goLiveDate: null, tasksCompleted: 1, tasksTotal: 12, nextBlockingTask: "Kickoff", questionnaireComplete: false, kickoffRequested: false, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 21 },
  { id: "ACC-302", accountName: "Northwood Functional Med", bucket: "B3", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Pre-Kickoff", arr: 28000, createdDaysAgo: 11, daysInBucket: 11, goLiveDate: "2026-06-15", tasksCompleted: 0, tasksTotal: 12, nextBlockingTask: "Kickoff", questionnaireComplete: true, kickoffRequested: false, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 11 },

  // B4 post-kickoff STUCK — pre Enroll Team
  { id: "ACC-401", accountName: "Catalyst Longevity", bucket: "B4", csmOwner: "Varsha Yaddala", hypercare: true, projectStage: "Hypercare", arr: 78000, createdDaysAgo: 42, daysInBucket: 28, goLiveDate: "2026-05-30", tasksCompleted: 2, tasksTotal: 12, nextBlockingTask: "Enroll Team Members", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 12 },
  { id: "ACC-402", accountName: "Florence Guild", bucket: "B4", csmOwner: "Varsha Yaddala", hypercare: true, projectStage: "Hypercare", arr: 94000, createdDaysAgo: 38, daysInBucket: 24, goLiveDate: "2026-06-05", tasksCompleted: 3, tasksTotal: 12, nextBlockingTask: "Enroll Team Members", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 8 },
  { id: "ACC-403", accountName: "Ridgeline Concierge", bucket: "B4", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Post-Kickoff", arr: 56000, createdDaysAgo: 35, daysInBucket: 21, goLiveDate: "2026-06-10", tasksCompleted: 2, tasksTotal: 12, nextBlockingTask: "Enroll Team Members", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 14 },
  { id: "ACC-404", accountName: "Bayside Sports Med", bucket: "B4", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Post-Kickoff", arr: 24000, createdDaysAgo: 45, daysInBucket: 32, goLiveDate: null, tasksCompleted: 2, tasksTotal: 12, nextBlockingTask: "Enroll Team Members", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 28 },

  // B5 mid-journey — past Enroll Team but stalled at Review Training / Test Patients
  { id: "ACC-501", accountName: "Synergy Longevity", bucket: "B5", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Mid-Journey", arr: 36000, createdDaysAgo: 60, daysInBucket: 38, goLiveDate: "2026-06-20", tasksCompleted: 5, tasksTotal: 12, nextBlockingTask: "Review Training", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: true, testPatientsCompletedThisWeek: false, championLastConfirmed: 18 },
  { id: "ACC-502", accountName: "Metabolic Centre Australia", bucket: "B5", csmOwner: "Varsha Yaddala", hypercare: true, projectStage: "Hypercare", arr: 96000, createdDaysAgo: 95, daysInBucket: 62, goLiveDate: "2026-05-28", tasksCompleted: 6, tasksTotal: 12, nextBlockingTask: "Test Patients", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: true, testPatientsCompletedThisWeek: true, championLastConfirmed: 6 },
  { id: "ACC-503", accountName: "Nova Wellness", bucket: "B5", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Mid-Journey", arr: 24000, createdDaysAgo: 72, daysInBucket: 41, goLiveDate: null, tasksCompleted: 4, tasksTotal: 12, nextBlockingTask: "Review Training", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 35 },
  { id: "ACC-504", accountName: "YOUR.Life Functional Medicine", bucket: "B5", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Mid-Journey", arr: 72000, createdDaysAgo: 58, daysInBucket: 30, goLiveDate: "2026-06-15", tasksCompleted: 6, tasksTotal: 12, nextBlockingTask: "Connect Devices", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: true, testPatientsCompletedThisWeek: false, championLastConfirmed: 9 },
  { id: "ACC-505", accountName: "Bloom Women's Wellness", bucket: "B5", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Mid-Journey", arr: 28000, createdDaysAgo: 54, daysInBucket: 28, goLiveDate: "2026-06-22", tasksCompleted: 5, tasksTotal: 12, nextBlockingTask: "Test Patients", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: true, championLastConfirmed: 14 },

  // B6 near-launch
  { id: "ACC-601", accountName: "Reborne Longevity", bucket: "B6", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Patient Pilot", arr: 28000, createdDaysAgo: 88, daysInBucket: 12, goLiveDate: "2026-05-20", tasksCompleted: 10, tasksTotal: 12, nextBlockingTask: "Internal Pilot", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 7 },
  { id: "ACC-602", accountName: "Thrive Concierge MD", bucket: "B6", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Internal Pilot", arr: 156000, createdDaysAgo: 76, daysInBucket: 14, goLiveDate: "2026-05-22", tasksCompleted: 10, tasksTotal: 12, nextBlockingTask: "Launch Prep", questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 4 },

  // B7 launched
  { id: "ACC-701", accountName: "Apex Performance Clinic", bucket: "B7", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Launched", arr: 18000, createdDaysAgo: 110, daysInBucket: 8, goLiveDate: "2026-04-22", tasksCompleted: 12, tasksTotal: 12, nextBlockingTask: null, questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 5 },
  { id: "ACC-702", accountName: "Northstar Longevity Institute", bucket: "B7", csmOwner: "Elaine Peters", hypercare: false, projectStage: "Launched", arr: 198000, createdDaysAgo: 145, daysInBucket: 14, goLiveDate: "2026-04-16", tasksCompleted: 12, tasksTotal: 12, nextBlockingTask: null, questionnaireComplete: true, kickoffRequested: true, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 2 },

  // B2 deferred — watch for hand-raise signals
  { id: "ACC-021", accountName: "Lakeside Wellness 1.0", bucket: "B2", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Deferred", arr: 22000, createdDaysAgo: 380, daysInBucket: 95, goLiveDate: null, tasksCompleted: 0, tasksTotal: 12, nextBlockingTask: "Hand-raise to migrate", questionnaireComplete: false, kickoffRequested: false, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 65 },
  { id: "ACC-022", accountName: "Pinecrest Functional Med 1.0", bucket: "B2", csmOwner: "Jillian Ramos", hypercare: false, projectStage: "Deferred", arr: 34000, createdDaysAgo: 410, daysInBucket: 88, goLiveDate: null, tasksCompleted: 0, tasksTotal: 12, nextBlockingTask: "Hand-raise to migrate", questionnaireComplete: true, kickoffRequested: false, reviewTrainingCompletedThisWeek: false, testPatientsCompletedThisWeek: false, championLastConfirmed: 32 },
];

// Hand-raise signals fired this week (B2 → B1 transitions in flight)
export const handRaiseSignals = [
  { account: "Pinecrest Functional Med 1.0", signal: "Migration questionnaire complete", firedDaysAgo: 2, csmOwner: "Jillian Ramos" },
  { account: "Brookline Concierge 1.0", signal: "Migration questionnaire complete", firedDaysAgo: 3, csmOwner: "Jillian Ramos" },
  { account: "Cedar Hills Wellness 1.0", signal: "Kickoff requested", firedDaysAgo: 1, csmOwner: "Elaine Peters" },
  { account: "Riverview Longevity 1.0", signal: "Kickoff requested + questionnaire complete", firedDaysAgo: 4, csmOwner: "Varsha Yaddala" },
];

// Active hypercare accounts
export const hypercareAccounts = onboardingAccounts.filter(a => a.hypercare);

// Aggregates
export const onboardingSummary = {
  totalActive: 367,
  bucketCounts: bucketMovement.reduce((acc, b) => {
    acc[b.bucket] = b.thisWeek;
    return acc;
  }, {} as Record<Bucket, number>),
  hypercareTotal: 35,
  netCompletionsThisWeek: standupMetrics.reduce((s, m) => s + m.thisWeek, 0),
  netCompletionsLastWeek: standupMetrics.reduce((s, m) => s + m.lastWeek, 0),
  netCompletionsTotalMay: standupMetrics.reduce((s, m) => s + m.totalMay, 0),
  monthTarget: 120,
  // % of book that took meaningful action in trailing 14 days
  pctActedTrailing14d: 62, // target 70 by May 31
};

// Week labels for the May calendar
export const mayWeeks = [
  { label: "W1", dates: "May 4–8", focus: "Hand-Raised + Crosscut Triage", target: { lo: 5, hi: 8 } },
  { label: "W2", dates: "May 11–15", focus: "B5 Mid-Journey Unblock Sprint", target: { lo: 12, hi: 15 } },
  { label: "W3", dates: "May 18–22", focus: "Pre-Kickoff Push + Near-Launch", target: { lo: 10, hi: 12 } },
  { label: "W4", dates: "May 25–29", focus: "Mid-Journey Unblocks + Reporting", target: { lo: 8, hi: 10 } },
];

export const currentWeekIndex = 1; // W2 in flight
