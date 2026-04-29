// Mock data for the dashboard — represents what the system would compute from PostHog + Stripe + billing module
// Account names use a mix of real names from Mike's hypercare list plus plausible additional accounts

export type Tier = "Green" | "Yellow" | "Red";
export type Segment = "PLG-default" | "High-touch";
export type Vertical = "Concierge" | "Longevity" | "Functional Medicine" | "Sports Medicine" | "Women's Health";

export interface Account {
  id: string;
  name: string;
  segment: Segment;
  vertical: Vertical;
  tier: Tier;
  computedScore: number;
  csmStatus: Tier;
  arr: number;
  wapCurrent: number;
  wapTrailing: number;
  wapDeltaPct: number;
  daysSinceLogin: number;
  integrationsSyncing: number;
  integrationsStale: number;
  seatsActive: number;
  seatsPurchased: number;
  ttfvDays: number | null;
  onboardingStage: "Not Started" | "In Progress" | "Activated" | "Stalled";
  aiCost30d: number;
  costPerWap: number;
  csmOwner: string;
  championLastConfirmed: number; // days ago
  hasOverride: boolean;
  overrideReason?: string;
  hardTriggers: string[];
  // Score component breakdown
  components: {
    engagement: number;
    recency: number;
    integrations: number;
    seats: number;
    activation: number;
  };
}

export const accounts: Account[] = [
  {
    id: "ACC-001", name: "Durand Health", segment: "High-touch", vertical: "Longevity",
    tier: "Yellow", computedScore: 62, csmStatus: "Yellow", arr: 84000,
    wapCurrent: 14, wapTrailing: 18, wapDeltaPct: -22,
    daysSinceLogin: 3, integrationsSyncing: 4, integrationsStale: 1,
    seatsActive: 14, seatsPurchased: 20, ttfvDays: 12,
    onboardingStage: "Activated", aiCost30d: 1240, costPerWap: 88.6,
    csmOwner: "Elaine Peters", championLastConfirmed: 18, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 50, recency: 100, integrations: 70, seats: 75, activation: 100 }
  },
  {
    id: "ACC-002", name: "Synergy Longevity", segment: "PLG-default", vertical: "Longevity",
    tier: "Yellow", computedScore: 54, csmStatus: "Yellow", arr: 36000,
    wapCurrent: 6, wapTrailing: 11, wapDeltaPct: -45,
    daysSinceLogin: 9, integrationsSyncing: 2, integrationsStale: 1,
    seatsActive: 6, seatsPurchased: 12, ttfvDays: 19,
    onboardingStage: "Activated", aiCost30d: 540, costPerWap: 90.0,
    csmOwner: "Sarah Kim", championLastConfirmed: 42, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 20, recency: 80, integrations: 70, seats: 40, activation: 100 }
  },
  {
    id: "ACC-003", name: "WLF Club", segment: "High-touch", vertical: "Concierge",
    tier: "Green", computedScore: 68, csmStatus: "Green", arr: 142000,
    wapCurrent: 22, wapTrailing: 27, wapDeltaPct: -18,
    daysSinceLogin: 1, integrationsSyncing: 5, integrationsStale: 0,
    seatsActive: 22, seatsPurchased: 30, ttfvDays: 8,
    onboardingStage: "Activated", aiCost30d: 2180, costPerWap: 99.1,
    csmOwner: "Elaine Peters", championLastConfirmed: 12, hasOverride: true,
    overrideReason: "Acquisition / business transition",
    hardTriggers: [],
    components: { engagement: 50, recency: 100, integrations: 100, seats: 75, activation: 100 }
  },
  {
    id: "ACC-004", name: "Nova Wellness", segment: "PLG-default", vertical: "Functional Medicine",
    tier: "Red", computedScore: 32, csmStatus: "Red", arr: 24000,
    wapCurrent: 2, wapTrailing: 8, wapDeltaPct: -75,
    daysSinceLogin: 18, integrationsSyncing: 1, integrationsStale: 3,
    seatsActive: 2, seatsPurchased: 10, ttfvDays: 31,
    onboardingStage: "Stalled", aiCost30d: 180, costPerWap: 90.0,
    csmOwner: "Sarah Kim", championLastConfirmed: 67, hasOverride: false,
    hardTriggers: ["Renewal under 30 days, no commitment"],
    components: { engagement: 0, recency: 10, integrations: 15, seats: 15, activation: 10 }
  },
  {
    id: "ACC-005", name: "Metabolic Centre Australia", segment: "High-touch", vertical: "Longevity",
    tier: "Red", computedScore: 38, csmStatus: "Red", arr: 96000,
    wapCurrent: 4, wapTrailing: 9, wapDeltaPct: -56,
    daysSinceLogin: 14, integrationsSyncing: 2, integrationsStale: 2,
    seatsActive: 4, seatsPurchased: 15, ttfvDays: 22,
    onboardingStage: "Activated", aiCost30d: 720, costPerWap: 180.0,
    csmOwner: "Marcus Chen", championLastConfirmed: 95, hasOverride: false,
    hardTriggers: ["Champion departed (verified)"],
    components: { engagement: 20, recency: 40, integrations: 40, seats: 15, activation: 100 }
  },
  {
    id: "ACC-006", name: "Reborne Longevity", segment: "PLG-default", vertical: "Longevity",
    tier: "Green", computedScore: 84, csmStatus: "Green", arr: 28000,
    wapCurrent: 12, wapTrailing: 11, wapDeltaPct: 9,
    daysSinceLogin: 1, integrationsSyncing: 3, integrationsStale: 0,
    seatsActive: 12, seatsPurchased: 15, ttfvDays: 6,
    onboardingStage: "Activated", aiCost30d: 380, costPerWap: 31.7,
    csmOwner: "Sarah Kim", championLastConfirmed: 11, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 100, recency: 100, integrations: 100, seats: 100, activation: 100 }
  },
  {
    id: "ACC-007", name: "YOUR.Life Functional Medicine", segment: "High-touch", vertical: "Functional Medicine",
    tier: "Yellow", computedScore: 58, csmStatus: "Yellow", arr: 72000,
    wapCurrent: 9, wapTrailing: 12, wapDeltaPct: -25,
    daysSinceLogin: 4, integrationsSyncing: 3, integrationsStale: 1,
    seatsActive: 9, seatsPurchased: 14, ttfvDays: 14,
    onboardingStage: "Activated", aiCost30d: 880, costPerWap: 97.8,
    csmOwner: "Marcus Chen", championLastConfirmed: 28, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 50, recency: 100, integrations: 70, seats: 75, activation: 100 }
  },
  {
    id: "ACC-008", name: "Apex Performance Clinic", segment: "PLG-default", vertical: "Sports Medicine",
    tier: "Green", computedScore: 91, csmStatus: "Green", arr: 18000,
    wapCurrent: 8, wapTrailing: 7, wapDeltaPct: 14,
    daysSinceLogin: 0, integrationsSyncing: 4, integrationsStale: 0,
    seatsActive: 8, seatsPurchased: 8, ttfvDays: 4,
    onboardingStage: "Activated", aiCost30d: 290, costPerWap: 36.3,
    csmOwner: "Sarah Kim", championLastConfirmed: 7, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 100, recency: 100, integrations: 100, seats: 100, activation: 100 }
  },
  {
    id: "ACC-009", name: "Vitality Women's Health", segment: "PLG-default", vertical: "Women's Health",
    tier: "Yellow", computedScore: 64, csmStatus: "Green", arr: 32000,
    wapCurrent: 7, wapTrailing: 9, wapDeltaPct: -22,
    daysSinceLogin: 5, integrationsSyncing: 2, integrationsStale: 1,
    seatsActive: 7, seatsPurchased: 10, ttfvDays: 11,
    onboardingStage: "Activated", aiCost30d: 410, costPerWap: 58.6,
    csmOwner: "Sarah Kim", championLastConfirmed: 35, hasOverride: true,
    overrideReason: "Known seasonality",
    hardTriggers: [],
    components: { engagement: 50, recency: 80, integrations: 70, seats: 75, activation: 100 }
  },
  {
    id: "ACC-010", name: "Thrive Concierge MD", segment: "High-touch", vertical: "Concierge",
    tier: "Green", computedScore: 88, csmStatus: "Green", arr: 156000,
    wapCurrent: 28, wapTrailing: 26, wapDeltaPct: 8,
    daysSinceLogin: 0, integrationsSyncing: 6, integrationsStale: 0,
    seatsActive: 28, seatsPurchased: 32, ttfvDays: 5,
    onboardingStage: "Activated", aiCost30d: 2640, costPerWap: 94.3,
    csmOwner: "Marcus Chen", championLastConfirmed: 9, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 100, recency: 100, integrations: 100, seats: 100, activation: 100 }
  },
  {
    id: "ACC-011", name: "Coastline Functional Health", segment: "PLG-default", vertical: "Functional Medicine",
    tier: "Red", computedScore: 28, csmStatus: "Red", arr: 22000,
    wapCurrent: 1, wapTrailing: 5, wapDeltaPct: -80,
    daysSinceLogin: 22, integrationsSyncing: 0, integrationsStale: 2,
    seatsActive: 1, seatsPurchased: 8, ttfvDays: null,
    onboardingStage: "Stalled", aiCost30d: 60, costPerWap: 60.0,
    csmOwner: "Sarah Kim", championLastConfirmed: 89, hasOverride: false,
    hardTriggers: ["No CS reply for 16 days", "Stalled onboarding 60+ days"],
    components: { engagement: 0, recency: 10, integrations: 0, seats: 15, activation: 10 }
  },
  {
    id: "ACC-012", name: "Pacific Sports Recovery", segment: "PLG-default", vertical: "Sports Medicine",
    tier: "Green", computedScore: 78, csmStatus: "Green", arr: 26000,
    wapCurrent: 9, wapTrailing: 9, wapDeltaPct: 0,
    daysSinceLogin: 2, integrationsSyncing: 3, integrationsStale: 0,
    seatsActive: 9, seatsPurchased: 12, ttfvDays: 9,
    onboardingStage: "Activated", aiCost30d: 340, costPerWap: 37.8,
    csmOwner: "Sarah Kim", championLastConfirmed: 14, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 100, recency: 100, integrations: 100, seats: 75, activation: 100 }
  },
  {
    id: "ACC-013", name: "Northstar Longevity Institute", segment: "High-touch", vertical: "Longevity",
    tier: "Green", computedScore: 92, csmStatus: "Green", arr: 198000,
    wapCurrent: 34, wapTrailing: 31, wapDeltaPct: 10,
    daysSinceLogin: 0, integrationsSyncing: 7, integrationsStale: 0,
    seatsActive: 34, seatsPurchased: 38, ttfvDays: 4,
    onboardingStage: "Activated", aiCost30d: 3120, costPerWap: 91.8,
    csmOwner: "Elaine Peters", championLastConfirmed: 6, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 100, recency: 100, integrations: 100, seats: 100, activation: 100 }
  },
  {
    id: "ACC-014", name: "Bloom Women's Wellness", segment: "PLG-default", vertical: "Women's Health",
    tier: "Yellow", computedScore: 56, csmStatus: "Yellow", arr: 28000,
    wapCurrent: 4, wapTrailing: 7, wapDeltaPct: -43,
    daysSinceLogin: 8, integrationsSyncing: 2, integrationsStale: 1,
    seatsActive: 4, seatsPurchased: 9, ttfvDays: 16,
    onboardingStage: "Activated", aiCost30d: 220, costPerWap: 55.0,
    csmOwner: "Sarah Kim", championLastConfirmed: 31, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 20, recency: 80, integrations: 70, seats: 40, activation: 100 }
  },
  {
    id: "ACC-015", name: "Catalyst Concierge Group", segment: "High-touch", vertical: "Concierge",
    tier: "Yellow", computedScore: 60, csmStatus: "Yellow", arr: 118000,
    wapCurrent: 16, wapTrailing: 21, wapDeltaPct: -24,
    daysSinceLogin: 4, integrationsSyncing: 4, integrationsStale: 1,
    seatsActive: 16, seatsPurchased: 24, ttfvDays: 11,
    onboardingStage: "Activated", aiCost30d: 1480, costPerWap: 92.5,
    csmOwner: "Marcus Chen", championLastConfirmed: 22, hasOverride: false,
    hardTriggers: [],
    components: { engagement: 50, recency: 100, integrations: 70, seats: 40, activation: 100 }
  },
];

// Aggregate metrics
export const bookSummary = {
  totalAccounts: accounts.length,
  totalArr: accounts.reduce((s, a) => s + a.arr, 0),
  byTier: {
    Green: accounts.filter(a => a.tier === "Green").length,
    Yellow: accounts.filter(a => a.tier === "Yellow").length,
    Red: accounts.filter(a => a.tier === "Red").length,
  },
  arrByTier: {
    Green: accounts.filter(a => a.tier === "Green").reduce((s, a) => s + a.arr, 0),
    Yellow: accounts.filter(a => a.tier === "Yellow").reduce((s, a) => s + a.arr, 0),
    Red: accounts.filter(a => a.tier === "Red").reduce((s, a) => s + a.arr, 0),
  },
  totalWap: accounts.reduce((s, a) => s + a.wapCurrent, 0),
  totalWapPrior: accounts.reduce((s, a) => s + a.wapTrailing, 0),
  totalAiCost: accounts.reduce((s, a) => s + a.aiCost30d, 0),
  hardTriggersThisWeek: accounts.reduce((s, a) => s + a.hardTriggers.length, 0),
  newRedsThisWeek: 2,
  newActivationsThisWeek: 3,
  medianTtfvDays: 9,
  medianTtfvDaysPrior: 11,
};

// 12-week trend for executive view
export const trendData = [
  { week: "W-11", green: 8, yellow: 4, red: 1, wap: 142, ttfv: 14 },
  { week: "W-10", green: 8, yellow: 5, red: 1, wap: 148, ttfv: 13 },
  { week: "W-9", green: 9, yellow: 4, red: 1, wap: 154, ttfv: 13 },
  { week: "W-8", green: 9, yellow: 4, red: 2, wap: 158, ttfv: 12 },
  { week: "W-7", green: 8, yellow: 5, red: 2, wap: 161, ttfv: 12 },
  { week: "W-6", green: 9, yellow: 5, red: 1, wap: 167, ttfv: 11 },
  { week: "W-5", green: 8, yellow: 6, red: 1, wap: 172, ttfv: 11 },
  { week: "W-4", green: 7, yellow: 6, red: 2, wap: 169, ttfv: 10 },
  { week: "W-3", green: 7, yellow: 6, red: 2, wap: 174, ttfv: 10 },
  { week: "W-2", green: 7, yellow: 5, red: 3, wap: 178, ttfv: 9 },
  { week: "W-1", green: 7, yellow: 5, red: 3, wap: 182, ttfv: 9 },
  { week: "Now", green: 7, yellow: 5, red: 3, wap: 176, ttfv: 9 },
];

// Vertical breakdown
export const verticalBreakdown = [
  { vertical: "Concierge", wap: 66, accounts: 3, arr: 416000 },
  { vertical: "Longevity", wap: 92, accounts: 5, arr: 484000 },
  { vertical: "Functional Medicine", wap: 14, accounts: 3, arr: 118000 },
  { vertical: "Sports Medicine", wap: 17, accounts: 2, arr: 44000 },
  { vertical: "Women's Health", wap: 11, accounts: 2, arr: 60000 },
];

// Intervention performance
export const interventionPerformance = [
  { channel: "Pardot", fired: 47, completed: 22, recovered: 14, recoveryRate: 30 },
  { channel: "Appcues", fired: 124, completed: 81, recovered: 38, recoveryRate: 31 },
  { channel: "Checklists", fired: 89, completed: 52, recovered: 31, recoveryRate: 35 },
  { channel: "Agent", fired: 312, completed: 287, recovered: 96, recoveryRate: 31 },
];

// Agent intelligence — top question categories
export const agentIntelligence = [
  { category: "Integration setup", count: 78, escalated: 4 },
  { category: "Patient onboarding", count: 64, escalated: 2 },
  { category: "Health Score interpretation", count: 51, escalated: 1 },
  { category: "Billing & subscription", count: 38, escalated: 11 },
  { category: "Feature requests", count: 29, escalated: 6 },
  { category: "Cancellation / pricing", count: 14, escalated: 14 },
  { category: "Data export", count: 22, escalated: 0 },
  { category: "Wearable troubleshooting", count: 41, escalated: 3 },
];

// Onboarding funnel
export const onboardingFunnel = [
  { stage: "Account created", count: 28, pct: 100 },
  { stage: "First practitioner login", count: 26, pct: 93 },
  { stage: "First patient added", count: 22, pct: 79 },
  { stage: "First integration connected", count: 18, pct: 64 },
  { stage: "First Health Score viewed", count: 16, pct: 57 },
  { stage: "Activated (TTFV hit)", count: 14, pct: 50 },
];

// AI cost outliers
export const costOutliers = accounts
  .filter(a => a.costPerWap > 100)
  .sort((a, b) => b.costPerWap - a.costPerWap)
  .slice(0, 5);
