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
export type ScoreScale = "SCALE_8_5" | "SCALE_7" | "SCALE_HKBU";
export type DataQuality = "complete" | "partial" | "profile-only" | "insufficient" | "parsed";

export type FormulaType =
  | "BEST_5"
  | "BEST_6"
  | "BEST_4"
  | "BEST_5_PLUS_BONUS"
  | "CUSTOM_WEIGHTED"
  | "THREE_CORE_PLUS_TWO_ELECTIVE"
  | "ENG_MATH_PLUS_BEST_3"
  | "CHINESE_ENGLISH_PLUS_BEST_3"
  | "SIX_GRADED_SUBJECTS"
  | "RAW_TEXT";

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
  averageScore?: number;
  highestAttainable?: number;
  scoreMetric?: string;
  weightingRaw?: string;
  preferredSubjectsRaw?: string;
  medianProfile?: string;
  lowerQuartileProfile?: string;
  upperQuartileProfile?: string;
  extractionMethod?: string;
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

export type CalculationConfidence = "official-structured" | "generic-formula" | "reference-estimate";

export type CalculationResult = {
  totalScore: number;
  usedSubjects: UsedSubject[];
  breakdown: string[];
  confidence: CalculationConfidence;
  warning?: string;
};
