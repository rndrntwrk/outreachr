export type LegalEntityType =
  | 'corporation'
  | 'llc'
  | 'foundation'
  | 'sole_proprietorship'
  | 'partnership'
  | 'other';

export type LegalEntityStatus = 'planned' | 'active' | 'inactive' | 'dissolved';
export type VentureStage = 'concept' | 'prototype' | 'pre_production' | 'production' | 'scaling';
export type VentureStatus = 'active' | 'paused' | 'archived';
export type NarrativePurpose =
  | 'investor'
  | 'accelerator'
  | 'grant'
  | 'hackathon'
  | 'sponsor'
  | 'partner'
  | 'media';
export type AuthorityApprovalState = 'draft' | 'approved' | 'superseded';
export type CanonicalDemoStatus = 'active' | 'paused' | 'archived';
export type CapitalMandateStage = 'pre_seed' | 'seed' | 'series_a';
export type CapitalMandateStatus = 'planning' | 'active' | 'paused' | 'closed';

export interface LegalEntitySummary {
  id: string;
  legalName: string;
  displayName: string;
  jurisdiction: string | null;
  entityType: LegalEntityType;
  status: LegalEntityStatus;
  incorporationReference: string | null;
  capTableReference: string | null;
  founderAuthority: string;
  publicWebsite: string | null;
}

export interface VentureSummary {
  id: string;
  legalEntityId: string;
  name: string;
  category: string;
  utility: string;
  stage: VentureStage;
  status: VentureStatus;
  publicUrl: string | null;
  defaultNarrativeProfileId: string | null;
  currentDemoVersionId: string | null;
}

export interface NarrativeProfileSummary {
  id: string;
  legalEntityId: string;
  ventureId: string;
  purpose: NarrativePurpose;
  version: number;
  approvalState: AuthorityApprovalState;
  contentSha256: string;
  approvedAt: string | null;
  descriptions: {
    words50: string;
    words100: string;
    words250: string;
  };
  problem: string;
  productWedge: string;
  whyNow: string;
  technicalDifferentiation: string;
  evidenceFraming: string;
  businessModel: string;
  useOfFunds: string;
  claimsBoundary: string;
  deckReference: string | null;
  demoReference: string | null;
}

export interface CanonicalDemoVersionSummary {
  id: string;
  demoId: string;
  version: number;
  baselineRepository: string;
  baselineCommitSha: string;
  branchConvention: string;
  expectedBaselineHours: number;
  coreAssets: string[];
  evidenceRequirements: string[];
  approvedClaims: string[];
  contentSha256: string;
  approvalState: AuthorityApprovalState;
  approvedAt: string | null;
}

export interface CanonicalDemoSummary {
  id: string;
  name: string;
  category: string;
  status: CanonicalDemoStatus;
  versions: CanonicalDemoVersionSummary[];
}

export interface CapitalMandateSummary {
  id: string;
  roundId: string;
  legalEntityId: string;
  ventureId: string;
  narrativeProfileId: string;
  stage: CapitalMandateStage;
  targetAmountUsd: number;
  minimumCheckUsd: number | null;
  maximumCheckUsd: number | null;
  instrument: string;
  tokenSideLetterPolicy: string;
  geographies: string[];
  targetCloseDate: string | null;
  status: CapitalMandateStatus;
  approvedUseOfFunds: string;
}

export interface VentureBootstrap {
  legalEntities: LegalEntitySummary[];
  ventures: VentureSummary[];
  narrativeProfiles: NarrativeProfileSummary[];
  canonicalDemos: CanonicalDemoSummary[];
  capitalMandates: CapitalMandateSummary[];
  activeCapitalMandateId: string | null;
}

export interface LegalEntitySaveInput {
  id?: string;
  legalName: string;
  displayName: string;
  jurisdiction: string | null;
  entityType: LegalEntityType;
  status: LegalEntityStatus;
  incorporationReference: string | null;
  capTableReference: string | null;
  founderAuthority: string;
  publicWebsite: string | null;
}

export interface VentureSaveInput {
  id?: string;
  legalEntityId: string;
  name: string;
  category: string;
  utility: string;
  stage: VentureStage;
  status: VentureStatus;
  publicUrl: string | null;
  defaultNarrativeProfileId: string | null;
  currentDemoVersionId: string | null;
}

export interface NarrativeVersionCreateInput {
  id?: string;
  legalEntityId: string;
  ventureId: string;
  purpose: NarrativePurpose;
  descriptions: {
    words50: string;
    words100: string;
    words250: string;
  };
  problem: string;
  productWedge: string;
  whyNow: string;
  technicalDifferentiation: string;
  evidenceFraming: string;
  businessModel: string;
  useOfFunds: string;
  claimsBoundary: string;
  deckReference: string | null;
  demoReference: string | null;
}

export interface CanonicalDemoVersionCreateInput {
  id?: string;
  demoId: string;
  baselineRepository: string;
  baselineCommitSha: string;
  branchConvention: string;
  expectedBaselineHours: number;
  coreAssets: string[];
  evidenceRequirements: string[];
  approvedClaims: string[];
}

export interface CapitalMandateSaveInput {
  id?: string;
  roundId: string;
  legalEntityId: string;
  ventureId: string;
  narrativeProfileId: string;
  stage: CapitalMandateStage;
  targetAmountUsd: number;
  minimumCheckUsd: number | null;
  maximumCheckUsd: number | null;
  instrument: string;
  tokenSideLetterPolicy: string;
  geographies: string[];
  targetCloseDate: string | null;
  status: CapitalMandateStatus;
  approvedUseOfFunds: string;
}
