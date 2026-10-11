/**
 * data.ts
 *
 * Synthetic borrower opportunity dataset for the P2P Micro-Lending Matchmaker.
 *
 * Phase 2 update:
 * - Separates loan-level parameters (amount, rate, term) from applicant-level demographic features.
 * - Adds synthetic `applicantProfile` adhering strictly to the verified scikit-learn model schema
 *   (JensBender/loan-default-prediction-pipeline).
 * - Distinguishes data quality: normal opportunities have complete applicant profiles;
 *   OPP-012 intentionally omits applicant features to verify 'insufficient_input' handling.
 *
 * All records remain explicitly synthetic.
 */

export type ProbabilitySource =
  | "demo_fallback"
  | "unavailable"
  | "model_backed"
  | "insufficient_input";

export type FundingStatus = "open" | "funded" | "closed" | "expired";

export type MarriedStatus = "single" | "married";
export type HouseOwnership = "rented" | "owned" | "norent_noown";
export type CarOwnership = "yes" | "no";

/**
 * Validated synthetic applicant features matching the exact Hugging Face
 * loan-default-prediction-pipeline API schema.
 */
export type ApplicantProfile = {
  isSynthetic: true;
  income: number;            // Non-negative integer/float
  age: number;               // 21 to 79
  experience: number;        // 0 to 20
  married: MarriedStatus | null;
  house_ownership: HouseOwnership | null;
  car_ownership: CarOwnership | null;
  profession: string;        // Must match ProfessionEnum
  city: string;              // Must match CityEnum
  state: string;             // Must match StateEnum
  current_job_yrs: number;   // 0 to 14
  current_house_yrs: number; // 10 to 14
};

export type ModelMetadata = {
  modelId: string;
  predictionLabel?: "Default" | "No Default";
  probabilities?: {
    defaultProb: number;
    noDefaultProb: number;
  };
  inferenceTimestamp?: string;
  latencyMs?: number;
  notes?: string;
};

export type BorrowerOpportunity = {
  id: string;
  label: string;              // anonymized display label
  purpose: string;            // loan purpose category
  requestedAmount: number;    // total loan amount requested (USD)
  fundedAmount: number;       // already funded (USD)
  remainingAmount: number;    // still available for investment (USD)
  minTicket: number;          // minimum investor contribution (USD)
  annualRate: number;         // annual interest rate as decimal (e.g. 0.14)
  termMonths: number;         // loan term in months
  defaultProbability: number; // PD in [0, 1] — demo assumption or live model prediction
  recoveryRate: number;       // R in [0, 1] — recovery fraction assumption
  probabilitySource: ProbabilitySource;
  fundingStatus: FundingStatus;
  createdAt: string;          // ISO 8601 date string
  dataQuality: "good" | "missing_risk" | "invalid";
  applicantProfile?: ApplicantProfile;
  modelMetadata?: ModelMetadata;
};

/**
 * 12 deterministic synthetic borrower opportunities with separate applicant profiles.
 */
export const BORROWER_OPPORTUNITIES: BorrowerOpportunity[] = [
  // --- Normal cases with complete verified applicant profiles ---
  {
    id: "OPP-001",
    label: "Borrower A",
    purpose: "Small Business Expansion",
    requestedAmount: 15000,
    fundedAmount: 6000,
    remainingAmount: 9000,
    minTicket: 250,
    annualRate: 0.14,
    termMonths: 24,
    defaultProbability: 0.06,
    recoveryRate: 0.35,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-01T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 1303834,
      age: 28,
      experience: 5,
      married: "single",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "software_developer",
      city: "bhopal",
      state: "madhya_pradesh",
      current_job_yrs: 4,
      current_house_yrs: 12,
    },
  },
  {
    id: "OPP-002",
    label: "Borrower B",
    purpose: "Agricultural Equipment",
    requestedAmount: 8000,
    fundedAmount: 3200,
    remainingAmount: 4800,
    minTicket: 100,
    annualRate: 0.11,
    termMonths: 18,
    defaultProbability: 0.04,
    recoveryRate: 0.40,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-05T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 980000,
      age: 44,
      experience: 12,
      married: "married",
      house_ownership: "owned",
      car_ownership: "yes",
      profession: "civil_engineer",
      city: "indore",
      state: "madhya_pradesh",
      current_job_yrs: 7,
      current_house_yrs: 14,
    },
  },
  {
    id: "OPP-003",
    label: "Borrower C",
    purpose: "Education Fees",
    requestedAmount: 5000,
    fundedAmount: 1500,
    remainingAmount: 3500,
    minTicket: 50,
    annualRate: 0.09,
    termMonths: 12,
    defaultProbability: 0.03,
    recoveryRate: 0.30,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-10T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 620000,
      age: 25,
      experience: 3,
      married: "single",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "designer",
      city: "pune",
      state: "maharashtra",
      current_job_yrs: 2,
      current_house_yrs: 11,
    },
  },
  {
    id: "OPP-004",
    label: "Borrower D",
    purpose: "Medical Expenses",
    requestedAmount: 3000,
    fundedAmount: 500,
    remainingAmount: 2500,
    minTicket: 50,
    annualRate: 0.10,
    termMonths: 12,
    defaultProbability: 0.05,
    recoveryRate: 0.25,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-12T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 750000,
      age: 38,
      experience: 9,
      married: "married",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "financial_analyst",
      city: "hyderabad",
      state: "telangana",
      current_job_yrs: 5,
      current_house_yrs: 12,
    },
  },
  {
    id: "OPP-005",
    label: "Borrower E",
    purpose: "Inventory Purchase",
    requestedAmount: 20000,
    fundedAmount: 12000,
    remainingAmount: 8000,
    minTicket: 500,
    annualRate: 0.16,
    termMonths: 36,
    defaultProbability: 0.10,
    recoveryRate: 0.40,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-08-20T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 1850000,
      age: 49,
      experience: 16,
      married: "married",
      house_ownership: "owned",
      car_ownership: "yes",
      profession: "chartered_accountant",
      city: "mumbai",
      state: "maharashtra",
      current_job_yrs: 8,
      current_house_yrs: 13,
    },
  },
  {
    id: "OPP-006",
    label: "Borrower F",
    purpose: "Home Improvement",
    requestedAmount: 12000,
    fundedAmount: 9000,
    remainingAmount: 3000,
    minTicket: 200,
    annualRate: 0.13,
    termMonths: 24,
    defaultProbability: 0.07,
    recoveryRate: 0.45,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-18T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 1100000,
      age: 34,
      experience: 7,
      married: "single",
      house_ownership: "rented",
      car_ownership: "yes",
      profession: "architect",
      city: "delhi_city",
      state: "delhi",
      current_job_yrs: 4,
      current_house_yrs: 12,
    },
  },

  // --- Edge case: higher risk / higher return ---
  {
    id: "OPP-007",
    label: "Borrower G",
    purpose: "Small Business Startup",
    requestedAmount: 25000,
    fundedAmount: 8000,
    remainingAmount: 17000,
    minTicket: 1000,
    annualRate: 0.22,
    termMonths: 36,
    defaultProbability: 0.20,
    recoveryRate: 0.20,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-22T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 420000,
      age: 23,
      experience: 1,
      married: "single",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "comedian",
      city: "bangalore",
      state: "karnataka",
      current_job_yrs: 1,
      current_house_yrs: 10,
    },
  },

  // --- Edge case: very short term ---
  {
    id: "OPP-008",
    label: "Borrower H",
    purpose: "Emergency Working Capital",
    requestedAmount: 2000,
    fundedAmount: 400,
    remainingAmount: 1600,
    minTicket: 100,
    annualRate: 0.18,
    termMonths: 3,
    defaultProbability: 0.08,
    recoveryRate: 0.30,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-10-01T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 560000,
      age: 31,
      experience: 4,
      married: "single",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "technician",
      city: "chennai",
      state: "tamil_nadu",
      current_job_yrs: 3,
      current_house_yrs: 11,
    },
  },

  // --- Edge case: very long term ---
  {
    id: "OPP-009",
    label: "Borrower I",
    purpose: "Solar Panel Installation",
    requestedAmount: 30000,
    fundedAmount: 5000,
    remainingAmount: 25000,
    minTicket: 500,
    annualRate: 0.12,
    termMonths: 60,
    defaultProbability: 0.05,
    recoveryRate: 0.50,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-08-15T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 1450000,
      age: 52,
      experience: 18,
      married: "married",
      house_ownership: "owned",
      car_ownership: "yes",
      profession: "mechanical_engineer",
      city: "ahmedabad",
      state: "gujarat",
      current_job_yrs: 9,
      current_house_yrs: 14,
    },
  },

  // --- Edge case: very little remaining funding ---
  {
    id: "OPP-010",
    label: "Borrower J",
    purpose: "Livestock Purchase",
    requestedAmount: 6000,
    fundedAmount: 5850,
    remainingAmount: 150,
    minTicket: 50,
    annualRate: 0.12,
    termMonths: 18,
    defaultProbability: 0.05,
    recoveryRate: 0.35,
    probabilitySource: "demo_fallback",
    fundingStatus: "open",
    createdAt: "2026-09-28T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 680000,
      age: 40,
      experience: 11,
      married: "married",
      house_ownership: "owned",
      car_ownership: "no",
      profession: "geologist",
      city: "nagpur",
      state: "maharashtra",
      current_job_yrs: 6,
      current_house_yrs: 13,
    },
  },

  // --- Edge case: fully funded (ineligible — status "funded") ---
  {
    id: "OPP-011",
    label: "Borrower K",
    purpose: "Retail Shop Renovation",
    requestedAmount: 10000,
    fundedAmount: 10000,
    remainingAmount: 0,
    minTicket: 200,
    annualRate: 0.13,
    termMonths: 24,
    defaultProbability: 0.06,
    recoveryRate: 0.40,
    probabilitySource: "demo_fallback",
    fundingStatus: "funded",
    createdAt: "2026-08-01T00:00:00Z",
    dataQuality: "good",
    applicantProfile: {
      isSynthetic: true,
      income: 920000,
      age: 37,
      experience: 8,
      married: "married",
      house_ownership: "rented",
      car_ownership: "no",
      profession: "analyst",
      city: "jaipur",
      state: "rajasthan",
      current_job_yrs: 5,
      current_house_yrs: 12,
    },
  },

  // --- Edge case: missing applicant profile (tests insufficient_input handling) ---
  {
    id: "OPP-012",
    label: "Borrower L",
    purpose: "Transport Vehicle",
    requestedAmount: 18000,
    fundedAmount: 3000,
    remainingAmount: 15000,
    minTicket: 300,
    annualRate: 0.15,
    termMonths: 36,
    defaultProbability: NaN, // intentionally invalid demo value
    recoveryRate: 0.35,
    probabilitySource: "insufficient_input",
    fundingStatus: "open",
    createdAt: "2026-10-05T00:00:00Z",
    dataQuality: "missing_risk",
    // applicantProfile is deliberately omitted to test insufficient_input boundary
  },
];
