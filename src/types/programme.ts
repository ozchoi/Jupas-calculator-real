export type Institution =
  | "HKU"
  | "CUHK"
  | "HKUST"
  | "PolyU"
  | "CityUHK"
  | "HKBU"
  | "EdUHK"
  | "LingU"
  | "HKMU"
  | "SSSDP";

export type FundingCategory = "UGC-funded" | "Self-financing" | "SSSDP" | "Higher Diploma";
export type ScoreScale = "SCALE_8_5" | "SCALE_7";
export type DataQuality = "complete" | "partial" | "profile-only" | "insufficient";

export type FormulaType =
  | "BEST_5"
  | "BEST_6"
  | "BEST_4"
  | "BEST_5_PLUS_BONUS"
  | "CUSTOM_WEIGHTED";

export type Requirement = {
  subject: string;
  minGrade: string;
  note?: string;
};

export type WeightingRule = {
  subjects: string[];
  multiplier: number;
  maxSubjectsApplied?: number;
  note?: string;
};

export type Programme = {
  jupasCode: string;
  institution: Institution;
  faculty?: string;
  category?: FundingCategory;
  titleEn: string;
  titleZh?: string;
  formulaType: FormulaType;
  formulaRaw: string;
  scoreScale: ScoreScale;
  median?: number;
  lowerQuartile?: number;
  upperQuartile?: number;
  mean?: number;
  highestAttainable?: number;
  weightingRaw?: string;
  medianProfile?: string;
  lowerQuartileProfile?: string;
  notes?: string;
  sourcePage?: number;
  dataQuality: DataQuality;
  requiredSubjects?: Requirement[];
  preferredSubjects?: string[];
  weightingRules?: WeightingRule[];
  source?: {
    name: string;
    url?: string;
    retrievedDate?: string;
  };
};

export type UsedSubject = {
  subject: string;
  grade: string;
  baseScore: number;
  multiplier: number;
  weightedScore: number;
  note?: string;
};

export type CalculationResult = {
  totalScore: number;
  usedSubjects: UsedSubject[];
  breakdown: string[];
};
