export type UserRole =
  | 'FARMER'
  | 'BANK_OFFICER'
  | 'AGRICULTURE_OFFICER'
  | 'CSC_OPERATOR'
  | 'SYSTEM_ADMIN';

export type SupportedLanguage =
  | 'en' // English
  | 'hi' // Hindi
  | 'mr' // Marathi
  | 'bn' // Bengali
  | 'gu' // Gujarati
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'kn' // Kannada
  | 'ml' // Malayalam
  | 'pa' // Punjabi
  | 'as' // Assamese
  | 'or' // Odia
  | 'ur'; // Urdu

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  passwordHash?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  phoneNumber?: string; // alias
  role: UserRole;
  state: string;
  district: string;
  village: string;
  pinCode?: string;
  isVerified: boolean;
  avatarUrl?: string;
  language: SupportedLanguage;
  theme: 'light' | 'dark';
  createdAt: string;
}

export interface FarmerProfile {
  userId: string;
  village?: string;
  landAreaAcres: number;
  landOwnership: 'OWNED' | 'LEASED' | 'SHARECROPPER';
  surveyNumber: string;
  primaryCrops: string[];
  irrigationType: 'DRIP' | 'SPRINKLER' | 'CANAL' | 'BOREWELL' | 'RAINFED';
  farmingType: 'ORGANIC' | 'CONVENTIONAL' | 'MIXED' | 'HORTICULTURE' | 'DAIRY';
  farmerCategory: 'MARGINAL' | 'SMALL' | 'MEDIUM' | 'LARGE'; // Marginal <1ha, Small 1-2ha, Medium 2-10ha, Large >10ha
  annualIncome: number;
  hasKisanCreditCard: boolean;
  bankName?: string;
  bankAccountNumberMasked?: string;
  ifscCode?: string;
}

export type DocumentType =
  | 'AADHAAR'
  | 'PAN'
  | '7_12_EXTRACT'
  | 'LAND_RECORD'
  | 'BANK_PASSBOOK'
  | 'INCOME_CERTIFICATE'
  | 'CASTE_CERTIFICATE'
  | 'RESIDENCE_CERTIFICATE'
  | 'FARMER_ID'
  | 'CROP_SOWING_CERTIFICATE'
  | 'SOIL_HEALTH_CARD'
  | 'OTHER';

export type DocumentStatus =
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RE_UPLOAD_REQUIRED';

export interface UserDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileData?: string; // Base64 or encrypted storage format
  uploadSource: 'DEVICE' | 'CAMERA' | 'GALLERY' | 'GOOGLE_DRIVE' | 'CSC_DESK';
  driveFileId?: string;
  driveWebViewLink?: string;
  uploadedAt: string;
  updatedAt: string;
  status: DocumentStatus;
  verificationStatus?: DocumentStatus; // alias
  officerRemarks?: string;
  remarks?: string; // alias
  verifiedBy?: string;
  verifiedAt?: string;
  expiryDate?: string;
  isEncryptedAtRest?: boolean;
  checksumSha256?: string;
  scanStatus?: 'CLEAN' | 'FLAGGED';
  securityClassification?: 'RESTRICTED_PERSONAL_DATA' | 'CONFIDENTIAL_FINANCIAL' | 'OFFICIAL_AUDITED';
  retentionLocked?: boolean;
  linkedApplicationIds?: string[];
}

export interface DocumentAccessTicket {
  ticket: string;
  viewUrl: string;
  downloadUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
  accessMode: 'OWNER' | 'ASSIGNED_OFFICER' | 'CSC_ASSIST' | 'ADMIN_AUDITED';
}

export interface DocumentSecurityAuditEntry {
  id: string;
  documentId?: string;
  targetId?: string;
  documentName?: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ipAddress?: string;
  details: string;
  accessMode?: string;
}

export type SchemeCategory =
  | 'CENTRAL'
  | 'STATE'
  | 'FINANCE_LOAN'
  | 'SUBSIDY'
  | 'SOLAR'
  | 'IRRIGATION'
  | 'EQUIPMENT'
  | 'INSURANCE'
  | 'DAIRY_LIVESTOCK'
  | 'HORTICULTURE'
  | 'WOMEN_FARMERS';

export interface SchemeRule {
  id: string;
  field: 'state' | 'district' | 'maxLandArea' | 'minLandArea' | 'maxIncome' | 'farmerCategory' | 'crops' | 'irrigation';
  operator: 'EQUALS' | 'CONTAINS' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN_OR_EQUAL' | 'IN_LIST';
  value: any;
  description: string;
}

export interface GovernmentScheme {
  id: string;
  code: string;
  name: string;
  hindiName?: string;
  marathiName?: string;
  department: string;
  governmentLevel?: 'CENTRAL' | 'STATE';
  state?: string; // empty means all-India
  category: SchemeCategory;
  description: string;
  benefits: string;
  subsidyAmountOrPercent: string;
  eligibilitySummary: string[];
  rules?: SchemeRule[];
  requiredDocuments: DocumentType[];
  applicationProcess?: string[];
  officialSourceUrl: string;
  officialApplicationUrl?: string;
  lastVerifiedDate: string;
  version?: string;
  status?: 'ACTIVE' | 'UNDER_REVIEW' | 'EXPIRED';
  updatedAt?: string;
}

export interface AgriculturalLoan {
  id: string;
  bankName: string;
  loanName: string;
  purpose: string;
  interestRate: string;
  interestRatePercent?: number;
  maxAmount: string;
  tenure: string;
  repaymentPeriod?: string;
  collateralRequirement: string;
  subsidyOrSubvention: string;
  eligibility: string[];
  requiredDocuments: DocumentType[];
  officialSourceUrl: string;
  featured?: boolean;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'DOCUMENTS_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ApplicationTimelineEvent {
  id: string;
  status: ApplicationStatus;
  action: string;
  officerName?: string;
  byName?: string; // alias
  officerRole?: string;
  byRole?: string; // alias
  remarks?: string;
  timestamp: string;
}

export interface Application {
  id: string; // APP-2026-000123
  applicationNumber?: string; // alias for id
  userId: string;
  farmerName: string;
  applicantName?: string; // alias
  farmerMobile?: string;
  farmerDistrict?: string;
  farmerState?: string;
  schemeId: string;
  schemeName: string;
  schemeType: 'SCHEME' | 'SUBSIDY' | 'LOAN';
  submittedAt: string;
  updatedAt: string;
  status: ApplicationStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerRole?: string;
  officerRemarks?: string;
  attachedDocumentIds: string[];
  timeline: ApplicationTimelineEvent[];
  requestedDocuments?: DocumentType[];
  subsidyClaimAmount?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'APPLICATION' | 'DOCUMENT' | 'SCHEME' | 'LOAN' | 'SYSTEM';
  relatedEntity?: string; // alias
  read: boolean;
  relatedId?: string;
  createdAt?: string;
  timestamp?: string; // alias
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  performedBy?: string; // alias
  userRole: UserRole;
  role?: string; // alias
  action: string;
  details: string;
  targetId?: string;
  targetEntity?: string;
  timestamp: string;
}

export interface MandiPrice {
  id: string;
  crop?: string;
  commodity?: string; // alias
  variety?: string;
  marketName?: string;
  market?: string; // alias
  district: string;
  state: string;
  modalPricePerQuintal: number;
  minPrice?: number;
  minPricePerQuintal?: number;
  maxPrice?: number;
  maxPricePerQuintal?: number;
  arrivalTons?: number;
  trend?: 'UP' | 'DOWN' | 'STEADY';
  date: string;
}

export interface WeatherData {
  district: string;
  state: string;
  temperatureC?: number;
  condition?: string;
  humidityPercent?: number;
  rainProbabilityPercent?: number;
  windSpeedKmh?: number;
  current?: {
    temperatureCelsius: number;
    condition: string;
    humidity: number;
    windSpeedKmH: number;
    rainfallMm: number;
  };
  forecast: {
    day?: string;
    date?: string;
    temp?: number;
    tempMaxCelsius?: number;
    condition: string;
    rainChance?: number;
  }[];
  advisory: string;
}

export interface NearbyService {
  id: string;
  name: string;
  category?: 'BANK' | 'CSC' | 'AGRI_OFFICE' | 'KRISHI_SEVA_KENDRA' | 'FERTILIZER_STORE';
  type?: string; // alias
  address: string;
  district: string;
  phone: string;
  timing: string;
  distanceKm: number;
}

export interface EligibilityResult {
  schemeId: string;
  schemeName: string;
  department: string;
  isEligible: boolean;
  confidence: 'POTENTIALLY_ELIGIBLE' | 'REQUIRES_MORE_INFO' | 'NOT_ELIGIBLE';
  matchedCriteria: string[];
  missingCriteria: string[];
  missingDocuments: DocumentType[];
  potentialBenefit: string;
  officialSourceUrl: string;
  lastVerifiedDate: string;
}

export type RecommendationItemType = 'SCHEME' | 'LOAN' | 'SUBSIDY';

export interface RecommendationMatchCriterion {
  factor: 'STATE' | 'LAND_AREA' | 'CROP_TYPE' | 'FARMER_CATEGORY' | 'ANNUAL_INCOME' | 'IRRIGATION' | 'DOCUMENT_READINESS' | 'CREDIT_STATUS';
  label: string;
  matched: boolean;
  explanation: string;
}

export interface RecommendationItem {
  id: string;
  itemType: RecommendationItemType;
  title: string;
  departmentOrBank: string;
  category: string;
  governmentLevel?: 'CENTRAL' | 'STATE';
  matchScore: number; // 0 to 100
  urgencyOrBadge?: 'HIGH_MATCH' | 'TOP_SUBSIDY' | 'LOW_INTEREST' | 'DIRECT_CASH' | 'CROP_PROTECTION' | 'EQUIPMENT_GRANT' | 'SPECIAL_WOMEN';
  estimatedBenefitAmount?: string;
  estimatedAnnualSavings?: number;
  keyBenefits: string;
  personalizedReasons: string[];
  criteriaBreakdown: RecommendationMatchCriterion[];
  requiredDocuments: DocumentType[];
  readyDocuments: DocumentType[];
  missingDocuments: DocumentType[];
  readinessPercentage: number;
  officialUrl?: string;
  applicationUrl?: string;
  actionType: 'APPLY_NOW' | 'EXPLORE_SCHEME' | 'CALCULATE_LOAN';
  schemeId?: string;
  loanId?: string;
}

export interface FarmerRecommendationsResponse {
  farmerProfileSummary: {
    name: string;
    state: string;
    district: string;
    landAreaAcres: number;
    farmerCategory: string;
    primaryCrops: string[];
    annualIncome: number;
    irrigationType: string;
    hasKCC: boolean;
  };
  metrics: {
    totalEligibleRecommendations: number;
    highestMatchScore: number;
    totalEstimatedAnnualBenefitValue: string;
    fullyDocumentedCount: number;
  };
  recommendations: RecommendationItem[];
  appliedFilters?: {
    type?: string;
    minScore?: number;
  };
}

export interface SavedScheme {
  id: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  category?: SchemeCategory | string;
  department?: string;
  subsidyAmountOrPercent?: string;
  benefits?: string;
  officialSourceUrl?: string;
  notes?: string;
  savedAt: string;
  scheme?: GovernmentScheme;
}

export type PortalCategory =
  | 'INCOME_SUPPORT'
  | 'CROP_INSURANCE'
  | 'AGRICULTURAL_LOANS'
  | 'SUBSIDIES'
  | 'SOLAR_IRRIGATION'
  | 'FARMER_REGISTRATION'
  | 'STATE_PORTALS'
  | 'GRIEVANCE_SUPPORT';

export interface OfficialPortal {
  id: string;
  name: string;
  hindiName?: string;
  marathiName?: string;
  department: string;
  governmentLevel: 'CENTRAL' | 'STATE';
  state?: string;
  category: PortalCategory;
  purpose: string;
  description: string;
  officialUrl: string;
  lastVerifiedDate: string;
  featured?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  keyServices?: string[];
  updatedAt?: string;
}
