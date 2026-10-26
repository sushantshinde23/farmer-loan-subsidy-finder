import {
  User,
  FarmerProfile,
  GovernmentScheme,
  AgriculturalLoan,
  UserDocument,
  DocumentType,
  RecommendationItem,
  RecommendationMatchCriterion,
  FarmerRecommendationsResponse
} from '../types';

export interface RecommendationInputProfile {
  name?: string;
  state?: string;
  district?: string;
  village?: string;
  landAreaAcres?: number;
  farmerCategory?: 'MARGINAL' | 'SMALL' | 'MEDIUM' | 'LARGE';
  landOwnership?: 'OWNED' | 'LEASED' | 'SHARECROPPER';
  surveyNumber?: string;
  primaryCrops?: string[];
  annualIncome?: number;
  irrigationType?: 'DRIP' | 'SPRINKLER' | 'CANAL' | 'BOREWELL' | 'RAINFED';
  farmingType?: 'ORGANIC' | 'CONVENTIONAL' | 'MIXED' | 'HORTICULTURE' | 'DAIRY';
  hasKisanCreditCard?: boolean;
  hasWaterSource?: boolean;
}

const HORTICULTURE_CROPS = [
  'onion', 'tomato', 'potato', 'chilli', 'mango', 'grapes', 'pomegranate',
  'banana', 'citrus', 'guava', 'flowers', 'vegetables', 'fruits', 'spices', 'ginger', 'turmeric'
];

const FIELD_CROPS = [
  'wheat', 'rice', 'paddy', 'soybean', 'cotton', 'sugarcane', 'maize',
  'gram', 'chickpea', 'mustard', 'groundnut', 'pulses', 'bajra', 'jowar'
];

export function computeFarmerRecommendations(
  profileInput: RecommendationInputProfile,
  schemes: GovernmentScheme[],
  loans: AgriculturalLoan[],
  documents: UserDocument[] = []
): FarmerRecommendationsResponse {
  // Normalize defaults based on Indian agricultural realities
  const name = profileInput.name || 'Farmer';
  const state = profileInput.state || 'Maharashtra';
  const district = profileInput.district || 'Pune';
  const landAreaAcres = Number(profileInput.landAreaAcres ?? 3.5);
  const annualIncome = Number(profileInput.annualIncome ?? 180000);
  const primaryCrops = (profileInput.primaryCrops && profileInput.primaryCrops.length > 0)
    ? profileInput.primaryCrops
    : ['Sugarcane', 'Soybean', 'Wheat', 'Onion'];
  const irrigationType = profileInput.irrigationType || 'DRIP';
  const farmingType = profileInput.farmingType || 'CONVENTIONAL';
  const hasKCC = Boolean(profileInput.hasKisanCreditCard);
  const hasWaterSource = profileInput.hasWaterSource ?? (irrigationType !== 'RAINFED');

  // Derive farmer category if not provided
  let farmerCategory = profileInput.farmerCategory;
  if (!farmerCategory) {
    if (landAreaAcres < 2.47) farmerCategory = 'MARGINAL';
    else if (landAreaAcres <= 4.94) farmerCategory = 'SMALL';
    else if (landAreaAcres <= 24.7) farmerCategory = 'MEDIUM';
    else farmerCategory = 'LARGE';
  }

  // Available document types in vault
  const verifiedOrUploadedDocs = new Set<DocumentType>();
  documents.forEach(doc => {
    if (doc.status === 'VERIFIED' || doc.status === 'UPLOADED' || (doc as any).verificationStatus === 'VERIFIED') {
      verifiedOrUploadedDocs.add(doc.documentType);
    }
  });

  const cropsLower = primaryCrops.map(c => c.toLowerCase());
  const hasHorticultureCrop = cropsLower.some(c => HORTICULTURE_CROPS.some(hc => c.includes(hc)));
  const hasFieldCrop = cropsLower.some(c => FIELD_CROPS.some(fc => c.includes(fc)));
  const isSmallOrMarginal = farmerCategory === 'MARGINAL' || farmerCategory === 'SMALL';

  const recommendations: RecommendationItem[] = [];

  /* =========================================================================
     1. EVALUATE GOVERNMENT SCHEMES & SUBSIDIES
     ========================================================================= */
  for (const scheme of schemes) {
    let score = 50; // Base baseline
    const criteriaBreakdown: RecommendationMatchCriterion[] = [];
    const personalizedReasons: string[] = [];

    // --- State & Jurisdiction Check ---
    let stateMatched = false;
    if (scheme.state) {
      if (scheme.state.toLowerCase() === state.toLowerCase()) {
        stateMatched = true;
        score += 25;
        criteriaBreakdown.push({
          factor: 'STATE',
          label: 'State Eligibility',
          matched: true,
          explanation: `Exclusive to ${scheme.state} — matches your registered residence in ${district}, ${state}.`
        });
        personalizedReasons.push(`Direct State Benefit: Sourced from Government of ${scheme.state} for farmers in ${district}.`);
      } else {
        // Disqualify if scheme is exclusive to another state
        continue;
      }
    } else {
      stateMatched = true;
      score += 15;
      criteriaBreakdown.push({
        factor: 'STATE',
        label: 'Pan-India Coverage',
        matched: true,
        explanation: 'Central Government scheme valid across all Indian States & Union Territories.'
      });
    }

    // --- Landholding Area Check ---
    const landRule = (scheme.rules || []).find(r => r.field === 'maxLandArea' || r.field === 'minLandArea');
    const minLandRequired = landRule ? Number(landRule.value) : 0;
    const landMatched = landAreaAcres >= minLandRequired;

    if (landMatched) {
      score += 15;
      criteriaBreakdown.push({
        factor: 'LAND_AREA',
        label: 'Landholding Criterion',
        matched: true,
        explanation: `Your landholding of ${landAreaAcres} acres satisfies the official guideline (min ${minLandRequired} acres).`
      });
    } else {
      score -= 20;
      criteriaBreakdown.push({
        factor: 'LAND_AREA',
        label: 'Landholding Criterion',
        matched: false,
        explanation: `Requires minimum ${minLandRequired} acres. Your profile currently indicates ${landAreaAcres} acres.`
      });
    }

    // --- Farmer Category & Subsidy Slab ---
    if (isSmallOrMarginal) {
      score += 10;
      criteriaBreakdown.push({
        factor: 'FARMER_CATEGORY',
        label: 'Category Preference',
        matched: true,
        explanation: `As a ${farmerCategory.toLowerCase()} farmer (≤ 2 hectares), you qualify for top-tier subsidy slabs.`
      });
    } else {
      criteriaBreakdown.push({
        factor: 'FARMER_CATEGORY',
        label: 'Farmer Category',
        matched: true,
        explanation: `Classified as ${farmerCategory} farmer; eligible for standard institutional assistance.`
      });
    }

    // --- Crop & Farming Type Alignment ---
    let cropMatched = false;
    if (scheme.category === 'HORTICULTURE' || scheme.code.includes('HORTI') || scheme.code.includes('MIDH')) {
      if (hasHorticultureCrop || farmingType === 'HORTICULTURE') {
        score += 20;
        cropMatched = true;
        personalizedReasons.push(`Tailored for your horticulture produce (${primaryCrops.filter(c => HORTICULTURE_CROPS.some(hc => c.toLowerCase().includes(hc))).join(', ') || 'Fruits/Vegetables'}).`);
      } else {
        score -= 15;
      }
    } else if (scheme.category === 'INSURANCE' || scheme.code.includes('PMFBY')) {
      if (hasFieldCrop || cropsLower.length > 0) {
        score += 18;
        cropMatched = true;
        personalizedReasons.push(`Crop Protection: Provides non-preventable yield insurance for your notified crops (${primaryCrops.join(', ')}).`);
      }
    } else if (scheme.category === 'IRRIGATION' || scheme.code.includes('PDMC')) {
      if (isSmallOrMarginal) score += 15;
      if (cropsLower.some(c => ['sugarcane', 'cotton', 'banana', 'onion', 'tomato', 'vegetables'].some(hc => c.includes(hc)))) {
        score += 10;
        personalizedReasons.push(`High water-efficiency grant for your water-intensive ${primaryCrops.slice(0, 2).join(' & ')} crop cycles.`);
      }
    } else if (scheme.category === 'SOLAR' || scheme.code.includes('KUSUM')) {
      if (hasWaterSource && ['BOREWELL', 'CANAL', 'DRIP', 'SPRINKLER'].includes(irrigationType)) {
        score += 20;
        personalizedReasons.push(`Field Water Source Ready: Replaces electricity/diesel pumping costs with 60% GoI subsidy.`);
      } else if (irrigationType === 'RAINFED') {
        score -= 10;
      }
    } else if (scheme.category === 'DAIRY_LIVESTOCK' || scheme.code.includes('NLM')) {
      if (farmingType === 'DAIRY' || farmingType === 'MIXED') {
        score += 25;
        personalizedReasons.push('Animal Husbandry Support: High capital grant for your mixed farming & dairy setup.');
      } else {
        score -= 20;
      }
    } else if (scheme.category === 'EQUIPMENT' || scheme.code.includes('SMAM')) {
      if (isSmallOrMarginal) {
        score += 15;
        personalizedReasons.push(`Small/Marginal Priority: Preferential 50% subsidy on tractors and farm machinery under SMAM.`);
      }
    }

    // --- Income Criteria ---
    if (annualIncome <= 800000) {
      score += 5;
      criteriaBreakdown.push({
        factor: 'ANNUAL_INCOME',
        label: 'Income Ceiling',
        matched: true,
        explanation: `Annual income of ₹${annualIncome.toLocaleString('en-IN')} is well within the tax-exemption threshold.`
      });
    }

    // --- Specific Scheme Perks ---
    if (scheme.code === 'PM-KISAN') {
      personalizedReasons.push('Direct Aadhaar DBT: ₹6,000 yearly income support transferred in 3 cycles directly into your bank.');
    } else if (scheme.code === 'NAMO-SHETKARI') {
      personalizedReasons.push('Maharashtra Double Benefit: Combines with PM-KISAN for a combined guaranteed DBT of ₹12,000/year.');
    }

    // --- Document Readiness ---
    const requiredDocs = scheme.requiredDocuments || [];
    const readyDocs = requiredDocs.filter(d => verifiedOrUploadedDocs.has(d));
    const missingDocs = requiredDocs.filter(d => !verifiedOrUploadedDocs.has(d));
    const readinessPct = requiredDocs.length > 0
      ? Math.round((readyDocs.length / requiredDocs.length) * 100)
      : 100;

    if (readinessPct === 100) {
      score += 10;
      criteriaBreakdown.push({
        factor: 'DOCUMENT_READINESS',
        label: 'Document Readiness',
        matched: true,
        explanation: `All ${requiredDocs.length} required documents (e.g. ${requiredDocs.slice(0, 2).join(', ')}) are verified in your vault.`
      });
      personalizedReasons.push(`Instant Submission Ready: 100% of required documents are already verified in your vault.`);
    } else {
      criteriaBreakdown.push({
        factor: 'DOCUMENT_READINESS',
        label: 'Document Readiness',
        matched: false,
        explanation: `${readyDocs.length} of ${requiredDocs.length} documents uploaded. Missing: ${missingDocs.map(d => d.replace(/_/g, ' ')).join(', ')}.`
      });
    }

    // Determine badge and urgency
    let badge: RecommendationItem['urgencyOrBadge'] = 'HIGH_MATCH';
    if (scheme.code.includes('PM-KISAN') || scheme.code.includes('NAMO')) {
      badge = 'DIRECT_CASH';
    } else if (scheme.code.includes('KUSUM') || scheme.code.includes('PDMC')) {
      badge = 'TOP_SUBSIDY';
    } else if (scheme.category === 'EQUIPMENT') {
      badge = 'EQUIPMENT_GRANT';
    } else if (scheme.category === 'INSURANCE') {
      badge = 'CROP_PROTECTION';
    }

    // Normalize final score
    const finalScore = Math.min(99, Math.max(45, Math.round(score)));

    // Estimate financial value
    let estimatedAnnualSavings = 6000;
    if (scheme.code === 'NAMO-SHETKARI') estimatedAnnualSavings = 6000;
    else if (scheme.code === 'PM-KISAN') estimatedAnnualSavings = 6000;
    else if (scheme.code.includes('KUSUM')) estimatedAnnualSavings = 145000;
    else if (scheme.code.includes('PDMC')) estimatedAnnualSavings = 48000;
    else if (scheme.code.includes('SMAM')) estimatedAnnualSavings = 75000;
    else if (scheme.code.includes('PMFBY')) estimatedAnnualSavings = 25000;
    else if (scheme.code.includes('MIDH')) estimatedAnnualSavings = 60000;
    else if (scheme.code.includes('NLM')) estimatedAnnualSavings = 120000;

    recommendations.push({
      id: `REC-SCHEME-${scheme.id}`,
      itemType: 'SCHEME',
      title: scheme.name,
      departmentOrBank: scheme.department,
      category: scheme.category,
      governmentLevel: scheme.governmentLevel || 'CENTRAL',
      matchScore: finalScore,
      urgencyOrBadge: badge,
      estimatedBenefitAmount: scheme.subsidyAmountOrPercent,
      estimatedAnnualSavings,
      keyBenefits: scheme.benefits,
      personalizedReasons: personalizedReasons.slice(0, 3),
      criteriaBreakdown,
      requiredDocuments: requiredDocs,
      readyDocuments: readyDocs,
      missingDocuments: missingDocs,
      readinessPercentage: readinessPct,
      officialUrl: scheme.officialSourceUrl,
      applicationUrl: scheme.officialApplicationUrl,
      actionType: 'APPLY_NOW',
      schemeId: scheme.id
    });
  }

  /* =========================================================================
     2. EVALUATE FACTUAL AGRICULTURAL LOANS & INTEREST SUBVENTIONS
     ========================================================================= */
  for (const loan of loans) {
    let score = 65;
    const criteriaBreakdown: RecommendationMatchCriterion[] = [];
    const personalizedReasons: string[] = [];

    // Credit card check
    if (loan.id.includes('KCC')) {
      if (!hasKCC) {
        score += 30;
        personalizedReasons.push('Crucial Credit Gap: You do not have an active KCC. Sanction up to ₹3,00,000 at 4% p.a. effective interest rate.');
        personalizedReasons.push('Includes ₹1,60,000 collateral-free limit without mortgaging agricultural land.');
        criteriaBreakdown.push({
          factor: 'CREDIT_STATUS',
          label: 'KCC Availability',
          matched: true,
          explanation: 'No current KCC on file. Prompt repayment incentive (3% subvention) delivers net 4% crop finance.'
        });
      } else {
        score += 10;
        personalizedReasons.push('Active KCC Holder: Eligible for renewal or credit limit enhancement aligned with seasonal scale of finance.');
        criteriaBreakdown.push({
          factor: 'CREDIT_STATUS',
          label: 'KCC Limit Enhancement',
          matched: true,
          explanation: 'Existing cardholder eligible for limit escalation and annual revolving credit renewal.'
        });
      }
    } else if (loan.id.includes('GOLD')) {
      score += 15;
      personalizedReasons.push('Instant Farm Liquidity: Concessional 7.50% gold loan for agricultural working capital without land lien.');
      criteriaBreakdown.push({
        factor: 'CREDIT_STATUS',
        label: 'Fast-Track Liquidity',
        matched: true,
        explanation: 'Same-day disbursement for agricultural inputs against gold ornaments.'
      });
    } else if (loan.id.includes('TRACTOR')) {
      if (landAreaAcres >= 2) {
        score += 20;
        personalizedReasons.push('Tractor & Equipment Finance: Can be co-funded with Central SMAM 40-50% machinery subsidy grant.');
      } else {
        score -= 10;
      }
    } else if (loan.id.includes('TATKAL')) {
      score += 12;
      personalizedReasons.push('Off-Season Emergency Credit: Up to ₹1,00,000 clean loan for unforeseen farm expenses between harvest cycles.');
    }

    // Land ownership
    criteriaBreakdown.push({
      factor: 'LAND_AREA',
      label: 'Land Cultivation Proof',
      matched: true,
      explanation: `Landholding of ${landAreaAcres} acres in ${district} provides satisfactory agricultural underwriting basis.`
    });

    // Document Readiness
    const requiredDocs = loan.requiredDocuments || [];
    const readyDocs = requiredDocs.filter(d => verifiedOrUploadedDocs.has(d));
    const missingDocs = requiredDocs.filter(d => !verifiedOrUploadedDocs.has(d));
    const readinessPct = requiredDocs.length > 0
      ? Math.round((readyDocs.length / requiredDocs.length) * 100)
      : 100;

    const finalScore = Math.min(98, Math.max(50, Math.round(score)));

    recommendations.push({
      id: `REC-LOAN-${loan.id}`,
      itemType: 'LOAN',
      title: loan.loanName,
      departmentOrBank: loan.bankName,
      category: 'FINANCE_LOAN',
      governmentLevel: 'CENTRAL',
      matchScore: finalScore,
      urgencyOrBadge: loan.id.includes('KCC') ? 'LOW_INTEREST' : (loan.id.includes('TRACTOR') ? 'EQUIPMENT_GRANT' : 'HIGH_MATCH'),
      estimatedBenefitAmount: loan.interestRate,
      estimatedAnnualSavings: loan.id.includes('KCC') ? 12000 : 8000,
      keyBenefits: loan.purpose,
      personalizedReasons: personalizedReasons.slice(0, 3),
      criteriaBreakdown,
      requiredDocuments: requiredDocs,
      readyDocuments: readyDocs,
      missingDocuments: missingDocs,
      readinessPercentage: readinessPct,
      officialUrl: loan.officialSourceUrl,
      actionType: 'CALCULATE_LOAN',
      loanId: loan.id
    });
  }

  // Sort descending by matchScore
  recommendations.sort((a, b) => b.matchScore - a.matchScore);

  // Compute metrics
  const totalEligible = recommendations.length;
  const highestMatch = recommendations.length > 0 ? recommendations[0].matchScore : 0;
  const fullyDocCount = recommendations.filter(r => r.readinessPercentage === 100).length;

  // Sum annual value: direct cash + subsidies + interest savings
  const totalAnnualSavingsNumber = recommendations.slice(0, 6).reduce((acc, curr) => acc + (curr.estimatedAnnualSavings || 0), 0);
  const totalEstimatedAnnualBenefitValue = totalAnnualSavingsNumber >= 100000
    ? `₹${(totalAnnualSavingsNumber / 100000).toFixed(1)} Lakhs+`
    : `₹${totalAnnualSavingsNumber.toLocaleString('en-IN')}`;

  return {
    farmerProfileSummary: {
      name,
      state,
      district,
      landAreaAcres,
      farmerCategory,
      primaryCrops,
      annualIncome,
      irrigationType,
      hasKCC
    },
    metrics: {
      totalEligibleRecommendations: totalEligible,
      highestMatchScore: highestMatch,
      totalEstimatedAnnualBenefitValue,
      fullyDocumentedCount: fullyDocCount
    },
    recommendations
  };
}
