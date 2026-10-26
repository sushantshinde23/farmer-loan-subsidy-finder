import fs from 'fs';
import path from 'path';
import {
  User,
  FarmerProfile,
  GovernmentScheme,
  AgriculturalLoan,
  Application,
  UserDocument,
  NotificationItem,
  AuditLog,
  MandiPrice,
  NearbyService,
  WeatherData,
  SavedScheme,
  OfficialPortal
} from '../src/types';
import { SmsRecord } from '../src/types/sms';

interface DatabaseSchema {
  users: User[];
  farmerProfiles: Record<string, FarmerProfile>;
  schemes: GovernmentScheme[];
  loans: AgriculturalLoan[];
  applications: Application[];
  documents: UserDocument[];
  notifications: NotificationItem[];
  smsMessages: SmsRecord[];
  auditLogs: AuditLog[];
  mandiPrices: MandiPrice[];
  nearbyServices: NearbyService[];
  weather: Record<string, WeatherData>;
  savedSchemes: SavedScheme[];
  officialPortals: OfficialPortal[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DEFAULT_OFFICIAL_PORTALS: OfficialPortal[] = [
  {
    id: 'PORTAL-PMKISAN',
    name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    hindiName: 'प्रधानमंत्री किसान सम्मान निधि पोर्टल',
    marathiName: 'पीएम-किसान सन्मान निधी पोर्टल',
    department: 'Ministry of Agriculture & Farmers Welfare, Government of India',
    governmentLevel: 'CENTRAL',
    category: 'INCOME_SUPPORT',
    purpose: 'Direct income support of ₹6,000 per year transferred in 3 equal installments to landholding farmer families.',
    description: 'Official national portal for PM-KISAN beneficiary registration, Aadhaar eKYC authentication, installment transfer status, village beneficiary lists, and PFMS bank-linkage.',
    officialUrl: 'https://pmkisan.gov.in/',
    lastVerifiedDate: '2026-03-25',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['New Farmer Registration', 'Aadhaar eKYC Verification', 'Installment Payment Status', 'Beneficiary List by Village', 'Correction of Aadhaar Details']
  },
  {
    id: 'PORTAL-PMFBY',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    hindiName: 'प्रधानमंत्री फसल बीमा योजना पोर्टल',
    marathiName: 'प्रधानमंत्री पीक विमा योजना पोर्टल',
    department: 'Department of Agriculture & Farmers Welfare, Ministry of Agriculture, GoI',
    governmentLevel: 'CENTRAL',
    category: 'CROP_INSURANCE',
    purpose: 'Comprehensive risk insurance covering yield loss, prevented sowing, and localized natural calamities.',
    description: 'One-stop national crop insurance portal for premium calculation, crop insurance policy application, 72-hour localized loss intimation, and direct digital claim tracking.',
    officialUrl: 'https://pmfby.gov.in/',
    lastVerifiedDate: '2026-03-26',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Crop Insurance Premium Calculator', 'Report Localized Crop Loss (72 hrs)', 'Track Claim Settlement Status', 'Download Policy Receipt', 'Check Notified Crops & Areas']
  },
  {
    id: 'PORTAL-PMKUSUM',
    name: 'PM-KUSUM (Solar Agriculture Pumps & Solarization)',
    hindiName: 'पीएम-कुसुम सौर कृषि पंप योजना पोर्टल',
    marathiName: 'पीएम-कुसुम सौर कृषी पंप पोर्टल',
    department: 'Ministry of New and Renewable Energy (MNRE), Government of India',
    governmentLevel: 'CENTRAL',
    category: 'SOLAR_IRRIGATION',
    purpose: 'Up to 60% capital subsidy for installing standalone solar agriculture pumps and solarizing grid-connected pumps.',
    description: 'Central portal facilitating decentralized solar agricultural pumping, vendor empaneled pricing, DISCOM coordination, and feeder solarization tracking.',
    officialUrl: 'https://pmkusum.mnre.gov.in/',
    lastVerifiedDate: '2026-03-22',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Component-B Standalone Solar Pumps', 'Component-C Grid Pump Solarization', 'Vendor List & Price Benchmark', 'State Implementing Agencies (MEDA/DISCOM)']
  },
  {
    id: 'PORTAL-KISAN-RIN',
    name: 'Kisan Rin Portal (KRP / Fasal Rin)',
    hindiName: 'किसान ऋण पोर्टल (केआरपी)',
    marathiName: 'किसान ऋण पोर्टल (केआरपी)',
    department: 'Ministry of Agriculture & Farmers Welfare / RBI & NABARD',
    governmentLevel: 'CENTRAL',
    category: 'AGRICULTURAL_LOANS',
    purpose: 'Unified digital infrastructure for Kisan Credit Card (KCC) loans and 3% Prompt Repayment Interest Subvention.',
    description: 'Integrated credit delivery system connecting commercial banks, RRBs, and cooperative banks with revenue land records for frictionless agricultural lending.',
    officialUrl: 'https://fasalrin.gov.in/',
    lastVerifiedDate: '2026-03-24',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['KCC Digital Sanctioning', 'Modified Interest Subvention Scheme (MISS)', 'Aadhaar Seeded Account Validation', 'Bank Branch Verification']
  },
  {
    id: 'PORTAL-JANSAMARTH',
    name: 'JanSamarth National Portal for Credit Linked Govt Schemes',
    hindiName: 'जनसमर्थ पोर्टल (क्रेडिट लिंक्ड योजनाएं)',
    marathiName: 'जनसमर्थ पोर्टल (शासकीय कर्ज योजना)',
    department: 'Department of Financial Services (DFS), Ministry of Finance, GoI',
    governmentLevel: 'CENTRAL',
    category: 'AGRICULTURAL_LOANS',
    purpose: 'Digital credit facilitation platform for agricultural infrastructure, animal husbandry, and allied business loans.',
    description: 'Single digital gateway linking 13+ government credit schemes with digital in-principle loan approvals from participating public and private sector banks.',
    officialUrl: 'https://www.jansamarth.in/',
    lastVerifiedDate: '2026-03-20',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Agri Infrastructure Fund (AIF) Loans', 'Animal Husbandry Infrastructure', 'Digital In-Principle Sanctions', 'Partner Bank Comparison']
  },
  {
    id: 'PORTAL-AGRIMACHINERY',
    name: 'Direct Benefit Transfer in Agricultural Mechanization (SMAM)',
    hindiName: 'कृषि यंत्रीकरण डीबीटी पोर्टल',
    marathiName: 'कृषी यांत्रिकीकरण डीबीटी पोर्टल',
    department: 'Department of Agriculture & Farmers Welfare, Government of India',
    governmentLevel: 'CENTRAL',
    category: 'SUBSIDIES',
    purpose: '40% to 50% government subsidy on tractors, power tillers, rotavators, and establishment of Custom Hiring Centers (CHCs).',
    description: 'Online direct subsidy application portal for agricultural machinery purchase from authorized empanelled dealers with post-delivery DBT disbursement.',
    officialUrl: 'https://agrimachinery.nic.in/',
    lastVerifiedDate: '2026-03-21',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Tractor Subsidy Application', 'Empanelled Machine Dealers', 'Custom Hiring Centers (CHCs)', 'Lottery & Pre-Sanction Status']
  },
  {
    id: 'PORTAL-PMKSY',
    name: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) - Per Drop More Crop',
    hindiName: 'प्रधानमंत्री कृषि सिंचाई योजना - प्रति बूंद अधिक फसल',
    marathiName: 'प्रधानमंत्री कृषी सिंचन योजना (सूक्ष्म सिंचन)',
    department: 'Department of Agriculture & Farmers Welfare, Government of India',
    governmentLevel: 'CENTRAL',
    category: 'SOLAR_IRRIGATION',
    purpose: '45% to 55% government subsidy for Drip and Sprinkler irrigation systems for small and marginal farmers.',
    description: 'National portal managing micro-irrigation grants, water use efficiency audits, precision farming infrastructure, and geo-tagged inspection records.',
    officialUrl: 'https://pmksy.gov.in/',
    lastVerifiedDate: '2026-03-18',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Drip Irrigation Subsidy', 'Sprinkler System Grants', 'District Irrigation Plans', 'Guidelines & Subsidy Calculators']
  },
  {
    id: 'PORTAL-AGRISTACK',
    name: 'AgriStack & Digital Farmer Registry',
    hindiName: 'एग्रीस्टैक डिजिटल किसान रजिस्ट्री',
    marathiName: 'एग्रीस्टॅक डिजिटल शेतकरी नोंदणी',
    department: 'Ministry of Agriculture & Farmers Welfare, Government of India',
    governmentLevel: 'CENTRAL',
    category: 'FARMER_REGISTRATION',
    purpose: 'Unified digital identity (Farmer ID) connecting land records, crop surveys, and DBT benefit disbursals.',
    description: 'Digital public infrastructure providing farmers with verifiable digital credentials for instant scheme access without repetitive paperwork.',
    officialUrl: 'https://farmerregistry.agristack.gov.in/',
    lastVerifiedDate: '2026-03-25',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Farmer ID Creation', 'Landholding Synchronization', 'Digital Crop Survey Data', 'Single Sign-on Scheme Access']
  },
  {
    id: 'PORTAL-ENAM',
    name: 'National Agriculture Market (e-NAM)',
    hindiName: 'राष्ट्रीय कृषि बाजार (ई-नाम)',
    marathiName: 'राष्ट्रीय कृषी बाजार (ई-नाम)',
    department: 'Ministry of Agriculture & Farmers Welfare / SFAC',
    governmentLevel: 'CENTRAL',
    category: 'FARMER_REGISTRATION',
    purpose: 'Pan-India electronic trading portal integrating agricultural produce markets across states.',
    description: 'Transparent electronic trading platform for farmers to discover competitive prices across 1,300+ APMC mandis with digital payments and assaying facilities.',
    officialUrl: 'https://enam.gov.in/',
    lastVerifiedDate: '2026-03-23',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Real-Time Mandi Price Ticker', 'Online Produce Auctioning', 'Warehouse e-NWR Integration', 'Direct Bank Settlement']
  },
  {
    id: 'PORTAL-MAHADBT',
    name: 'MahaDBT Farmer Welfare Portal (Maharashtra)',
    hindiName: 'महाडीबीटी शेतकरी कल्याण पोर्टल (महाराष्ट्र)',
    marathiName: 'महाडीबीटी शेतकरी योजना पोर्टल (महाराष्ट्र शासन)',
    department: 'Department of Agriculture, Government of Maharashtra',
    governmentLevel: 'STATE',
    state: 'Maharashtra',
    category: 'STATE_PORTALS',
    purpose: 'Integrated state portal for Namo Shetkari Mahasanman Nidhi (₹6,000/yr top-up) and state farm machinery lotteries.',
    description: 'Official single-window portal for farmers in Maharashtra to access agricultural subsidies, polyhouse construction grants, fruit plantation schemes, and solar pumps.',
    officialUrl: 'https://mahadbt.maharashtra.gov.in/',
    lastVerifiedDate: '2026-03-27',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Namo Shetkari Mahasanman Nidhi', 'MahaDBT Agriculture Lottery', 'Horticulture Subsidies (Bhausaheb Fundkar)', 'Farm Pond & Well Schemes']
  },
  {
    id: 'PORTAL-RYTHU-BHAROSA',
    name: 'YSR Rythu Bharosa Portal (Andhra Pradesh)',
    hindiName: 'वायएसआर रायथू भरोसा पोर्टल (आंध्र प्रदेश)',
    marathiName: 'वायएसआर रायथू भरोसा पोर्टल (आंध्र प्रदेश)',
    department: 'Department of Agriculture, Government of Andhra Pradesh',
    governmentLevel: 'STATE',
    state: 'Andhra Pradesh',
    category: 'STATE_PORTALS',
    purpose: 'Financial assistance of ₹13,500 per year per farmer family including tenant farmers and ROFR cultivators.',
    description: 'State direct benefit portal providing input subsidies, zero-interest crop loans, and comprehensive support through village Rythu Bharosa Kendras (RBKs).',
    officialUrl: 'https://ysrrythubharosa.ap.gov.in/',
    lastVerifiedDate: '2026-03-24',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Rythu Bharosa Payment Status', 'Tenant Farmer CCRC Registration', 'Free Crop Insurance Verification', 'RBK Service Network']
  },
  {
    id: 'PORTAL-UP-AGRICULTURE',
    name: 'UP Agriculture Portal (Pardarshi Kisan Seva Yojana)',
    hindiName: 'पारदर्शी किसान सेवा पोर्टल (उत्तर प्रदेश)',
    marathiName: 'उत्तर प्रदेश कृषी कल्याण पोर्टल',
    department: 'Department of Agriculture, Government of Uttar Pradesh',
    governmentLevel: 'STATE',
    state: 'Uttar Pradesh',
    category: 'STATE_PORTALS',
    purpose: 'Direct Benefit Transfer for certified seeds, fertilizers, and agricultural equipment in Uttar Pradesh.',
    description: 'Comprehensive portal for farmer registration, subsidy token issuance, certified seed allotment, solar pump booking, and soil test records.',
    officialUrl: 'https://upagriculture.com/',
    lastVerifiedDate: '2026-03-25',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Farmer Registration (Kisan Panjikaran)', 'Solar Pump Token Booking', 'Seed Subsidy Distribution', 'Agricultural Machinery Lottery']
  },
  {
    id: 'PORTAL-CPGRAMS',
    name: 'CPGRAMS Centralized Grievance Redress Portal (Agriculture)',
    hindiName: 'सीपीजीआरएएमएस कृषि शिकायत निवारण पोर्टल',
    marathiName: 'सीपीजीआरएएमएस कृषी तक्रार निवारण पोर्टल',
    department: 'Department of Administrative Reforms & Public Grievances, GoI',
    governmentLevel: 'CENTRAL',
    category: 'GRIEVANCE_SUPPORT',
    purpose: 'Official 24x7 government portal for lodging and tracking agricultural scheme complaints.',
    description: 'National public grievance portal for escalations regarding stalled PM-KISAN installments, rejected PMFBY claims, or unfair bank loan terms with mandated time-bound officer review.',
    officialUrl: 'https://pgportal.gov.in/',
    lastVerifiedDate: '2026-03-26',
    featured: true,
    status: 'ACTIVE',
    keyServices: ['Lodge Online Grievance', 'Track Complaint Status', 'Department of Agriculture Nodal Officers', 'Appellate Authority Escalation']
  },
  {
    id: 'PORTAL-KISAN-SUVIDHA',
    name: 'Kisan Suvidha & Kisan Call Centre (1800-180-1551)',
    hindiName: 'किसान सुविधा पोर्टल एवं किसान कॉल सेंटर',
    marathiName: 'किसान सुविधा पोर्टल व किसान कॉल सेंटर',
    department: 'Ministry of Agriculture & Farmers Welfare, Government of India',
    governmentLevel: 'CENTRAL',
    category: 'GRIEVANCE_SUPPORT',
    purpose: '24x7 free telephonic agricultural consultation in 22 languages and direct government advisory portal.',
    description: 'Official unified portal and helpline (1800-180-1551) providing technical farming guidance, plant protection alerts, market prices, and weather forecasts from ICAR scientists.',
    officialUrl: 'https://kisansuvidha.gov.in/',
    lastVerifiedDate: '2026-03-26',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Toll-Free 24x7 Kisan Call Centre (1800-180-1551)', 'Nearby Agri Dealer Locator', 'Extreme Weather Alerts', 'Crop Protection Advisories']
  },
  {
    id: 'PORTAL-NHB',
    name: 'National Horticulture Board (NHB)',
    hindiName: 'राष्ट्रीय बागवानी बोर्ड पोर्टल',
    marathiName: 'राष्ट्रीय फलोत्पादन मंडळ पोर्टल',
    department: 'Department of Agriculture & Farmers Welfare, Ministry of Agriculture, GoI',
    governmentLevel: 'CENTRAL',
    category: 'SUBSIDIES',
    purpose: 'Capital investment subsidy for high-tech commercial horticulture, cold storage, and ripening chambers.',
    description: 'Apex promotional portal for commercial fruit and vegetable cultivation, cold chain infrastructure project approvals, and post-harvest technology grants.',
    officialUrl: 'https://nhb.gov.in/',
    lastVerifiedDate: '2026-03-19',
    featured: false,
    status: 'ACTIVE',
    keyServices: ['Commercial Horticulture Projects', 'Cold Storage Subsidy', 'In-Principle Approval (IPA)', 'Accredited Fruit Nursery Locator']
  }
];

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    if (this.data.schemes.length === 0) {
      this.seedInitialData();
      this.save();
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.smsMessages) parsed.smsMessages = [];
        if (!parsed.officialPortals || parsed.officialPortals.length === 0) {
          parsed.officialPortals = DEFAULT_OFFICIAL_PORTALS;
        }
        if (!parsed.savedSchemes || parsed.savedSchemes.length === 0) {
          const pmKisan = parsed.schemes?.find((s: any) => s.id === 'SCHEME-PMKISAN');
          const kusum = parsed.schemes?.find((s: any) => s.id === 'SCHEME-KUSUM-B');
          parsed.savedSchemes = [
            {
              id: 'SAVED-1001',
              userId: 'USER-FARMER-1',
              schemeId: 'SCHEME-PMKISAN',
              schemeName: pmKisan?.name || 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
              category: 'CENTRAL',
              department: 'Department of Agriculture & Farmers Welfare, Government of India',
              subsidyAmountOrPercent: '₹6,000 / year (100% Central Funded DBT)',
              benefits: pmKisan?.benefits || '₹6,000 annually credited directly to Aadhaar-seeded bank account in 3 cycles.',
              officialSourceUrl: 'https://pmkisan.gov.in',
              notes: 'Mandatory annual direct cash DBT verification pending for next cycle',
              savedAt: '2026-03-05T09:30:00.000Z',
              scheme: pmKisan
            },
            {
              id: 'SAVED-1002',
              userId: 'USER-FARMER-1',
              schemeId: 'SCHEME-KUSUM-B',
              schemeName: kusum?.name || 'PM-KUSUM Component-B (Solar Water Pumping System)',
              category: 'SOLAR',
              department: 'Ministry of New and Renewable Energy (MNRE) & MSEDCL',
              subsidyAmountOrPercent: '60% Subsidy (30% GoI + 30% State Govt)',
              benefits: kusum?.benefits || '60% direct subsidy grant on 3 HP / 5 HP / 7.5 HP standalone solar pumps.',
              officialSourceUrl: 'https://pmkusum.mnre.gov.in',
              notes: 'Targeting 5 HP AC Solar Pump installation for Baramati farm plot',
              savedAt: '2026-03-08T14:15:00.000Z',
              scheme: kusum
            }
          ];
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse database.json, resetting to seed:', e);
    }
    return {
      users: [],
      farmerProfiles: {},
      schemes: [],
      loans: [],
      applications: [],
      documents: [],
      notifications: [],
      smsMessages: [],
      auditLogs: [],
      mandiPrices: [],
      nearbyServices: [],
      weather: {},
      savedSchemes: [],
      officialPortals: DEFAULT_OFFICIAL_PORTALS
    };
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  public getData(): DatabaseSchema {
    if (!this.data.smsMessages) {
      this.data.smsMessages = [];
    }
    if (!this.data.savedSchemes) {
      this.data.savedSchemes = [];
    }
    return this.data;
  }

  public getSavedSchemes(userId: string): SavedScheme[] {
    if (!this.data.savedSchemes) {
      this.data.savedSchemes = [];
    }
    return this.data.savedSchemes
      .filter(s => s.userId === userId)
      .map(s => {
        const fullScheme = this.data.schemes.find(item => item.id === s.schemeId);
        return {
          ...s,
          scheme: fullScheme || s.scheme
        };
      })
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  public isSchemeSaved(userId: string, schemeId: string): boolean {
    if (!this.data.savedSchemes) return false;
    return this.data.savedSchemes.some(s => s.userId === userId && s.schemeId === schemeId);
  }

  public saveScheme(userId: string, scheme: GovernmentScheme, notes?: string): SavedScheme {
    if (!this.data.savedSchemes) {
      this.data.savedSchemes = [];
    }
    const existingIndex = this.data.savedSchemes.findIndex(
      s => s.userId === userId && s.schemeId === scheme.id
    );

    if (existingIndex >= 0) {
      this.data.savedSchemes[existingIndex] = {
        ...this.data.savedSchemes[existingIndex],
        notes: notes !== undefined ? notes : this.data.savedSchemes[existingIndex].notes,
        scheme,
        savedAt: new Date().toISOString()
      };
      this.save();
      return this.data.savedSchemes[existingIndex];
    }

    const newSaved: SavedScheme = {
      id: `SAVED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      schemeId: scheme.id,
      schemeName: scheme.name,
      category: scheme.category,
      department: scheme.department,
      subsidyAmountOrPercent: scheme.subsidyAmountOrPercent,
      benefits: scheme.benefits,
      officialSourceUrl: scheme.officialSourceUrl,
      notes: notes || '',
      savedAt: new Date().toISOString(),
      scheme
    };

    this.data.savedSchemes.unshift(newSaved);
    this.save();
    return newSaved;
  }

  public unsaveScheme(userId: string, schemeId: string): boolean {
    if (!this.data.savedSchemes) {
      this.data.savedSchemes = [];
      return false;
    }
    const initialLen = this.data.savedSchemes.length;
    this.data.savedSchemes = this.data.savedSchemes.filter(
      s => !(s.userId === userId && (s.schemeId === schemeId || s.id === schemeId))
    );
    const changed = this.data.savedSchemes.length !== initialLen;
    if (changed) {
      this.save();
    }
    return changed;
  }

  public addSmsMessage(sms: SmsRecord) {
    if (!this.data.smsMessages) {
      this.data.smsMessages = [];
    }
    this.data.smsMessages.unshift(sms);
    if (this.data.smsMessages.length > 500) {
      this.data.smsMessages.pop();
    }
    this.save();
    return sms;
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const audit: AuditLog = {
      ...log,
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(audit);
    // Keep last 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.pop();
    }
    this.save();
    return audit;
  }

  public addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt'>) {
    const newNotif: NotificationItem = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(newNotif);
    this.save();
    return newNotif;
  }

  public getOfficialPortals(category?: string, search?: string): OfficialPortal[] {
    if (!this.data.officialPortals || this.data.officialPortals.length === 0) {
      this.data.officialPortals = [...DEFAULT_OFFICIAL_PORTALS];
    }
    let list = [...this.data.officialPortals];
    if (category && category !== 'ALL') {
      list = list.filter(p => p.category === category);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        p.purpose.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.state && p.state.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getOfficialPortalById(id: string): OfficialPortal | null {
    if (!this.data.officialPortals) return null;
    return this.data.officialPortals.find(p => p.id === id) || null;
  }

  public addOfficialPortal(portal: OfficialPortal): OfficialPortal {
    if (!this.data.officialPortals) {
      this.data.officialPortals = [...DEFAULT_OFFICIAL_PORTALS];
    }
    this.data.officialPortals.unshift(portal);
    this.save();
    return portal;
  }

  public updateOfficialPortal(id: string, updates: Partial<OfficialPortal>): OfficialPortal | null {
    if (!this.data.officialPortals) return null;
    const index = this.data.officialPortals.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.data.officialPortals[index] = {
      ...this.data.officialPortals[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.officialPortals[index];
  }

  public deleteOfficialPortal(id: string): boolean {
    if (!this.data.officialPortals) return false;
    const initialLen = this.data.officialPortals.length;
    this.data.officialPortals = this.data.officialPortals.filter(p => p.id !== id);
    const changed = this.data.officialPortals.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  private seedInitialData() {
    // 1. Initial Verified Government Schemes (Central & State)
    this.data.schemes = [
      {
        id: 'SCHEME-PMKISAN',
        code: 'PM-KISAN',
        name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        hindiName: 'प्रधानमंत्री किसान सम्मान निधि',
        marathiName: 'प्रधानमंत्री किसान सन्मान निधी',
        department: 'Department of Agriculture & Farmers Welfare, Government of India',
        governmentLevel: 'CENTRAL',
        category: 'CENTRAL',
        description: 'Direct income support of ₹6,000 per year in three equal installments of ₹2,000 each directly transferred to the bank accounts of all landholding farmer families.',
        benefits: '₹6,000 annually credited directly to Aadhaar-seeded bank account in 3 cycles (April-July, August-November, December-March).',
        subsidyAmountOrPercent: '₹6,000 / year (100% Central Funded DBT)',
        eligibilitySummary: [
          'All landholding farmer families with cultivable landholding in their names',
          'Aadhaar-seeded bank account and eKYC completed',
          'Excludes institutional landholders, income tax payees, and constitutional post holders'
        ],
        rules: [
          {
            id: 'r1',
            field: 'maxLandArea',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 0.1,
            description: 'Must hold cultivable land in applicant or family name'
          }
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Check land record and Aadhaar linkage in PM-KISAN portal',
          'Step 2: Submit Aadhaar-verified application online or via CSC Center',
          'Step 3: Verification by Revenue / Agriculture Nodal Officer',
          'Step 4: Benefit transferred directly to bank account via PFMS DBT'
        ],
        officialSourceUrl: 'https://pmkisan.gov.in',
        officialApplicationUrl: 'https://pmkisan.gov.in/RegistrationFormUpdated.aspx',
        lastVerifiedDate: '2026-03-01',
        version: '1.4',
        status: 'ACTIVE',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'SCHEME-KUSUM-B',
        code: 'PM-KUSUM-B',
        name: 'PM-KUSUM Component B: Standalone Solar Agriculture Pumps',
        hindiName: 'पीएम कुसुम योजना (सौर कृषि पंप)',
        marathiName: 'पीएम-कुसुम सौर कृषी पंप योजना',
        department: 'Ministry of New and Renewable Energy (MNRE), GoI',
        governmentLevel: 'CENTRAL',
        category: 'SOLAR',
        description: 'Subsidies for individual farmers to install standalone solar agriculture water pumps of capacity up to 7.5 HP (and higher with farmer share) in off-grid or diesel-pump areas.',
        benefits: 'Up to 60% financial assistance (30% Central Financial Assistance + 30% State Subsidy). Farmer contributes only 10% to 40% (remaining can be bank loan).',
        subsidyAmountOrPercent: '60% to 75% Capital Subsidy',
        eligibilitySummary: [
          'Individual farmers, Water User Associations, and Farmer Producer Organizations (FPOs)',
          'Agricultural land with an available borewell, open well, or farm pond',
          'Priority to areas without grid electrical connection or replacing diesel water pumps'
        ],
        rules: [
          {
            id: 'rk1',
            field: 'maxLandArea',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 0.5,
            description: 'Requires minimum 0.5 acre cultivable land with water source'
          }
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK', 'RESIDENCE_CERTIFICATE'],
        applicationProcess: [
          'Step 1: Register on State Renewable Energy Agency portal (e.g. MEDA, DISCOM)',
          'Step 2: Submit land title, water source details and pump capacity selection (3HP, 5HP, 7.5HP)',
          'Step 3: Site survey by DISCOM/MNRE empaneled vendor',
          'Step 4: Deposit farmer share and receive solar pump installation with 5-year warranty'
        ],
        officialSourceUrl: 'https://pmkusum.mnre.gov.in',
        officialApplicationUrl: 'https://pmkusum.mnre.gov.in',
        lastVerifiedDate: '2026-02-15',
        version: '2.1',
        status: 'ACTIVE',
        updatedAt: '2026-02-15T00:00:00.000Z'
      },
      {
        id: 'SCHEME-KCC',
        code: 'KCC-SCHEME',
        name: 'Kisan Credit Card (KCC) Scheme & Interest Subvention',
        hindiName: 'किसान क्रेडिट कार्ड योजना एवं ब्याज अनुदान',
        marathiName: 'किसान क्रेडिट कार्ड योजना',
        department: 'Department of Agriculture / RBI & NABARD',
        governmentLevel: 'CENTRAL',
        category: 'FINANCE_LOAN',
        description: 'Timely and adequate credit support from the banking system for agricultural operations, post-harvest expenses, produce marketing, and maintenance of farm assets.',
        benefits: 'Crop loan up to ₹3 Lakh at standard 7% interest rate, reduced to 4% with Prompt Repayment Incentive (3% subvention). Collateral-free limit up to ₹1.60 Lakh.',
        subsidyAmountOrPercent: '3% Interest Subvention (Effective 4% p.a. Interest Rate)',
        eligibilitySummary: [
          'All farmers - individuals/joint borrowers who are owner cultivators',
          'Tenant farmers, oral lessees, and sharecroppers',
          'Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers'
        ],
        rules: [
          {
            id: 'rkcc1',
            field: 'maxLandArea',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 0.25,
            description: 'Must cultivate crops or engage in dairy/poultry/fisheries'
          }
        ],
        requiredDocuments: ['AADHAAR', 'PAN', '7_12_EXTRACT', 'LAND_RECORD', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Fill one-page KCC application form at nearest commercial/RRB/Cooperative bank',
          'Step 2: Submit land extract and crop cultivation details',
          'Step 3: Bank sanctions credit limit within 14 working days',
          'Step 4: KCC RuPay card issued for ATM and POS agricultural merchant purchases'
        ],
        officialSourceUrl: 'https://agricoop.nic.in',
        officialApplicationUrl: 'https://www.myscheme.gov.in/schemes/kcc',
        lastVerifiedDate: '2026-03-05',
        version: '3.0',
        status: 'ACTIVE',
        updatedAt: '2026-03-05T00:00:00.000Z'
      },
      {
        id: 'SCHEME-PDMC',
        code: 'PDMC-MI',
        name: 'Per Drop More Crop (PDMC) - Micro Irrigation Subsidy',
        hindiName: 'प्रति बूंद अधिक फसल - सूक्ष्म सिंचाई योजना',
        marathiName: 'ठिबक व तुषार सिंचन अनुदान योजना (PDMC)',
        department: 'Department of Agriculture & Farmers Welfare, GoI',
        governmentLevel: 'CENTRAL',
        category: 'IRRIGATION',
        description: 'Promoting water use efficiency at farm level through micro-irrigation technologies such as Drip and Sprinkler irrigation systems.',
        benefits: '55% financial assistance for Small & Marginal farmers (< 2 hectares); 45% financial assistance for other category farmers for drip/sprinkler installation.',
        subsidyAmountOrPercent: '45% to 55% Government Subsidy',
        eligibilitySummary: [
          'All landholding farmers with an assured water source on the field',
          'Beneficiaries must not have availed micro-irrigation subsidy for the same survey number in past 7 years'
        ],
        rules: [
          {
            id: 'rpdmc1',
            field: 'maxLandArea',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 0.4,
            description: 'Applicable for minimum 0.4 acre up to 5 hectares'
          }
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK', 'SOIL_HEALTH_CARD'],
        applicationProcess: [
          'Step 1: Register on State Horticulture/Agriculture portal (e.g., MahaDBT in Maharashtra, e-Horticulture in other states)',
          'Step 2: Quotation from registered micro-irrigation manufacturer/dealer',
          'Step 3: Pre-sanction inspection by Taluka Agriculture Officer',
          'Step 4: Post-installation geo-tagged verification and direct subsidy transfer to farmer account'
        ],
        officialSourceUrl: 'https://pmksy.gov.in',
        officialApplicationUrl: 'https://pmksy.gov.in/microirrigation',
        lastVerifiedDate: '2026-02-28',
        version: '1.8',
        status: 'ACTIVE',
        updatedAt: '2026-02-28T00:00:00.000Z'
      },
      {
        id: 'SCHEME-SMAM',
        code: 'SMAM-MACHINERY',
        name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
        hindiName: 'कृषि यंत्रीकरण उप-मिशन (ट्रैक्टर एवं कृषि उपकरण)',
        marathiName: 'कृषी यांत्रिकीकरण उप-अभियान (ट्रॅक्टर व अवजारे)',
        department: 'Department of Agriculture & Farmers Welfare, GoI',
        governmentLevel: 'CENTRAL',
        category: 'EQUIPMENT',
        description: 'Financial assistance for procurement of modern agricultural machinery such as tractors, power tillers, rotavators, multi-crop threshers, and laser land levelers.',
        benefits: '40% to 50% subsidy on purchase price of approved agricultural machinery. Up to 80% assistance for establishing Custom Hiring Centers (CHCs) by farmer groups.',
        subsidyAmountOrPercent: '40% to 50% on Machinery (Up to ₹1.25 Lakh on Tractors for Small/Women farmers)',
        eligibilitySummary: [
          'Small, marginal, SC/ST, and women farmers given high priority',
          'Must have cultivable land recorded in applicant’s name'
        ],
        rules: [
          {
            id: 'rsmam1',
            field: 'maxLandArea',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 0.5,
            description: 'Valid farm landownership required'
          }
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK', 'CASTE_CERTIFICATE'],
        applicationProcess: [
          'Step 1: Apply online on Direct Benefit Transfer in Agriculture Mechanization portal (agrimachinery.nic.in)',
          'Step 2: Select machine model and authorized local dealer',
          'Step 3: Lottery/scrutiny approval and issuance of pre-sanction letter',
          'Step 4: Purchase machine, submit tax invoice, physical inspection, and DBT subsidy release'
        ],
        officialSourceUrl: 'https://agrimachinery.nic.in',
        officialApplicationUrl: 'https://agrimachinery.nic.in',
        lastVerifiedDate: '2026-03-02',
        version: '2.0',
        status: 'ACTIVE',
        updatedAt: '2026-03-02T00:00:00.000Z'
      },
      {
        id: 'SCHEME-PMFBY',
        code: 'PMFBY-INSURANCE',
        name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        hindiName: 'प्रधानमंत्री फसल बीमा योजना',
        marathiName: 'प्रधानमंत्री पीक विमा योजना',
        department: 'Department of Agriculture & Farmers Welfare, GoI',
        governmentLevel: 'CENTRAL',
        category: 'INSURANCE',
        description: 'Comprehensive risk insurance covering yield loss and localized calamities from pre-sowing to post-harvest losses for notified crops due to non-preventable natural risks.',
        benefits: 'Very low farmer premium: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for annual commercial and horticultural crops. Balance premium paid equally by Central & State governments.',
        subsidyAmountOrPercent: 'Nominal 1.5% - 2% Farmer Premium (Comprehensive Govt Backed Claim Protection)',
        eligibilitySummary: [
          'All farmers growing notified crops in notified areas including sharecroppers and tenant farmers',
          'Both loanee and non-loanee farmers eligible'
        ],
        rules: [],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'CROP_SOWING_CERTIFICATE', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Enroll via PMFBY portal, CSC Centre, or designated bank branch before cut-off date',
          'Step 2: Upload sowing declaration certificate issued by Talathi/Gram Sevak',
          'Step 3: Pay farmer premium share online or at counter',
          'Step 4: Receive policy acknowledgement; claim assessment done through Crop Cutting Experiments (CCEs) and satellite tech'
        ],
        officialSourceUrl: 'https://pmfby.gov.in',
        officialApplicationUrl: 'https://pmfby.gov.in',
        lastVerifiedDate: '2026-03-08',
        version: '4.2',
        status: 'ACTIVE',
        updatedAt: '2026-03-08T00:00:00.000Z'
      },
      {
        id: 'SCHEME-AIF',
        code: 'AIF-INFRA',
        name: 'Agriculture Infrastructure Fund (AIF)',
        hindiName: 'कृषि अवसंरचना कोष (AIF)',
        marathiName: 'कृषी पायाभूत सुविधा निधी (AIF)',
        department: 'Ministry of Agriculture & Farmers Welfare, GoI',
        governmentLevel: 'CENTRAL',
        category: 'FINANCE_LOAN',
        description: 'Financing facility for investment in viable projects for post-harvest management infrastructure and community farming assets.',
        benefits: '3% per annum interest subvention up to a limit of ₹2 Crore loan for a maximum period of 7 years. Credit guarantee coverage under CGTMSE scheme.',
        subsidyAmountOrPercent: '3% Interest Subvention on Loans up to ₹2 Crore',
        eligibilitySummary: [
          'Primary Agricultural Credit Societies (PACS), Marketing Cooperative Societies, FPOs, SHGs, Farmers, Agri-entrepreneurs, Startups'
        ],
        rules: [],
        requiredDocuments: ['AADHAAR', 'PAN', 'LAND_RECORD', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Register project proposal on agriinfra.dac.gov.in portal',
          'Step 2: Evaluation by Ministry Project Management Unit (PMU)',
          'Step 3: Forwarding to selected commercial or cooperative bank for loan appraisal',
          'Step 4: Loan disbursement and continuous 3% interest subvention credit'
        ],
        officialSourceUrl: 'https://agriinfra.dac.gov.in',
        officialApplicationUrl: 'https://agriinfra.dac.gov.in',
        lastVerifiedDate: '2026-02-20',
        version: '1.5',
        status: 'ACTIVE',
        updatedAt: '2026-02-20T00:00:00.000Z'
      },
      {
        id: 'SCHEME-NAMO-SHETKARI',
        code: 'NAMO-SHETKARI',
        name: 'Namo Shetkari Mahasanman Nidhi Yojana (Maharashtra State)',
        hindiName: 'नमो शेतकरी महासन्मान निधी योजना (महाराष्ट्र)',
        marathiName: 'नमो शेतकरी महासन्मान निधी योजना (महाराष्ट्र शासन)',
        department: 'Department of Agriculture, Government of Maharashtra',
        governmentLevel: 'STATE',
        state: 'Maharashtra',
        category: 'STATE',
        description: 'State financial assistance of ₹6,000 per year given to farmers in Maharashtra over and above the Central PM-KISAN assistance, making a total benefit of ₹12,000 per year.',
        benefits: 'Additional ₹6,000 per year paid in three installments of ₹2,000 to eligible PM-KISAN beneficiary farmers in Maharashtra.',
        subsidyAmountOrPercent: '₹6,000 / year (State Top-up, Total ₹12,000 with PM-KISAN)',
        eligibilitySummary: [
          'Farmer must be a resident of Maharashtra state',
          'Farmer must be an approved, active beneficiary of Central PM-KISAN scheme',
          'Aadhaar seeded bank account with valid land record in Maharashtra'
        ],
        rules: [
          {
            id: 'r_namo_1',
            field: 'state',
            operator: 'EQUALS',
            value: 'Maharashtra',
            description: 'Applicable exclusively to farmers residing and holding land in Maharashtra'
          }
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Automatically synchronized with PM-KISAN verified beneficiary list in Maharashtra',
          'Step 2: Ensure Aadhaar seeding and eKYC are verified on MahaDBT portal',
          'Step 3: Direct DBT deposit into farmer account during state release cycles'
        ],
        officialSourceUrl: 'https://mahadbt.maharashtra.gov.in',
        officialApplicationUrl: 'https://mahadbt.maharashtra.gov.in',
        lastVerifiedDate: '2026-03-01',
        version: '1.2',
        status: 'ACTIVE',
        updatedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'SCHEME-MIDH-HORTI',
        code: 'MIDH-HORTICULTURE',
        name: 'Mission for Integrated Development of Horticulture (MIDH)',
        hindiName: 'एकीकृत बागवानी विकास मिशन',
        marathiName: 'एकात्मिक फलोत्पादन विकास अभियान',
        department: 'Department of Agriculture & Farmers Welfare, GoI',
        governmentLevel: 'CENTRAL',
        category: 'HORTICULTURE',
        description: 'Holistic growth of the horticulture sector including fruits, vegetables, root and tuber crops, mushrooms, spices, flowers, aromatic plants, coconut, cashew and cocoa.',
        benefits: '40% to 50% financial assistance for polyhouse erection, shade net house, plastic mulching, pack house, and establishing new orchards.',
        subsidyAmountOrPercent: '40% to 50% Capital Subsidy on Horticulture Infrastructure',
        eligibilitySummary: [
          'Individual farmers, SHGs, FPOs cultivating or planning to cultivate horticultural crops',
          'Clear land ownership or registered long-term lease'
        ],
        rules: [],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Submit detailed project proposal to District Horticulture Officer',
          'Step 2: Technical verification and administrative sanction',
          'Step 3: Construction of infrastructure as per MIDH technical guidelines',
          'Step 4: Inspection and direct release of back-ended subsidy'
        ],
        officialSourceUrl: 'https://midh.gov.in',
        officialApplicationUrl: 'https://midh.gov.in',
        lastVerifiedDate: '2026-02-18',
        version: '2.4',
        status: 'ACTIVE',
        updatedAt: '2026-02-18T00:00:00.000Z'
      },
      {
        id: 'SCHEME-NLM-DAIRY',
        code: 'NLM-LIVESTOCK',
        name: 'National Livestock Mission (NLM) & Animal Husbandry',
        hindiName: 'राष्ट्रीय पशुधन मिशन (डेयरी एवं पशुपालन)',
        marathiName: 'राष्ट्रीय पशुधन अभियान (दुग्ध व पशुपालन)',
        department: 'Department of Animal Husbandry & Dairying, GoI',
        governmentLevel: 'CENTRAL',
        category: 'DAIRY_LIVESTOCK',
        description: 'Sustainable development of livestock sector focusing on poultry, sheep, goat, piggery breeding, and fodder seed production.',
        benefits: '50% capital subsidy up to ₹50 Lakh for establishing rural poultry parent farms, sheep/goat breeding units, and silage making units.',
        subsidyAmountOrPercent: '50% Capital Subsidy up to ₹50 Lakh',
        eligibilitySummary: [
          'Individual farmers, FPOs, Joint Liability Groups, and rural entrepreneurs',
          'Must possess suitable land for livestock shed and fodder cultivation'
        ],
        rules: [],
        requiredDocuments: ['AADHAAR', 'PAN', 'LAND_RECORD', 'BANK_PASSBOOK'],
        applicationProcess: [
          'Step 1: Submit application via nlm.udyamimitra.in portal',
          'Step 2: State Level Executive Committee (SLEC) review',
          'Step 3: Bank loan sanction for remaining project cost',
          'Step 4: Direct subsidy credit to lending bank through SIDBI'
        ],
        officialSourceUrl: 'https://dahd.nic.in',
        officialApplicationUrl: 'https://nlm.udyamimitra.in',
        lastVerifiedDate: '2026-02-25',
        version: '1.9',
        status: 'ACTIVE',
        updatedAt: '2026-02-25T00:00:00.000Z'
      }
    ];

    // 2. Real Agricultural Loans (Factual Bank Products)
    this.data.loans = [
      {
        id: 'LOAN-SBI-KCC',
        bankName: 'State Bank of India (SBI)',
        loanName: 'SBI Kisan Credit Card (Crop Loan)',
        purpose: 'Short-term credit for crop cultivation, harvesting, post-harvest farm maintenance & consumption needs.',
        interestRate: '7.00% p.a. (Effective 4.00% p.a. with 3% Prompt Repayment Incentive up to ₹3 Lakh)',
        maxAmount: 'Based on scale of finance and cropping pattern (Up to ₹3,00,000 for subsidized rate)',
        tenure: '5 years revolving facility, annual review and renewal',
        collateralRequirement: 'Collateral-free up to ₹1,60,000 (RBI guideline). Hypothecation of crops for higher limits.',
        subsidyOrSubvention: '3% Prompt Repayment Incentive by Ministry of Agriculture, GoI',
        eligibility: [
          'All farmers - individuals / joint borrowers owner cultivators',
          'Tenant farmers, oral lessees & sharecroppers with cultivation proof'
        ],
        requiredDocuments: ['AADHAAR', 'PAN', '7_12_EXTRACT', 'LAND_RECORD', 'BANK_PASSBOOK'],
        officialSourceUrl: 'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-finance/kisan-credit-card',
        featured: true
      },
      {
        id: 'LOAN-SBI-GOLD',
        bankName: 'State Bank of India (SBI)',
        loanName: 'SBI Multi-Purpose Agricultural Gold Loan',
        purpose: 'Instant liquidity against gold ornaments for farming operations, crop cultivation inputs, and farm machinery repairs.',
        interestRate: '7.50% - 8.25% p.a. (Concessional interest rate for verified agricultural borrowers)',
        maxAmount: 'Up to ₹50,00,000 (Based on gold purity and net weight)',
        tenure: 'Up to 12 months (bullet repayment) or 36 months in EMI',
        collateralRequirement: 'Pledge of gold ornaments (no agricultural land mortgage needed)',
        subsidyOrSubvention: 'Concessional processing fee and zero pre-payment penalty for agricultural users',
        eligibility: [
          'Any farmer engaged in agriculture or allied activities with land cultivation proof'
        ],
        requiredDocuments: ['AADHAAR', 'PAN', '7_12_EXTRACT'],
        officialSourceUrl: 'https://sbi.co.in/web/agri-rural/agriculture-banking/gold-loan',
        featured: true
      },
      {
        id: 'LOAN-PNB-TATKAL',
        bankName: 'Punjab National Bank (PNB)',
        loanName: 'PNB Krishi Tatkal Loan Scheme',
        purpose: 'Immediate emergency financial assistance to farmers for unforeseen agricultural and domestic expenses during off-season.',
        interestRate: '8.40% p.a. (Linked to RLLR)',
        maxAmount: 'Up to ₹1,00,000 or 50% of annual farm income',
        tenure: 'Repayable in 3 years in half-yearly/yearly installments aligned with harvest cycles',
        collateralRequirement: 'No collateral required. Hypothecation of standing crops.',
        subsidyOrSubvention: 'Zero inspection charges, waived margin requirement',
        eligibility: [
          'Existing KCC holders of PNB with satisfactory repayment record for past 2 years'
        ],
        requiredDocuments: ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
        officialSourceUrl: 'https://pnbindia.in/agriculture-banking.html',
        featured: false
      },
      {
        id: 'LOAN-BOB-TATKAL',
        bankName: 'Bank of Baroda (BOB)',
        loanName: 'Baroda Kisan Tatkal Loan',
        purpose: 'Emergency financial assistance for farmers facing natural distress or requiring working capital between crop cycles.',
        interestRate: '8.15% - 8.65% p.a.',
        maxAmount: 'Maximum ₹1,00,000',
        tenure: 'Up to 36 months',
        collateralRequirement: 'Clean loan without third-party guarantee or land mortgage',
        subsidyOrSubvention: 'Fast-track sanction within 48 hours at rural branches',
        eligibility: [
          'Farmers with minimum 1 acre agricultural land holding and existing operative bank account'
        ],
        requiredDocuments: ['AADHAAR', 'PAN', '7_12_EXTRACT'],
        officialSourceUrl: 'https://bankofbaroda.in/personal-banking/loans/rural-loans',
        featured: false
      },
      {
        id: 'LOAN-HDFC-TRACTOR',
        bankName: 'HDFC Bank',
        loanName: 'HDFC Agri Tractor & Farm Equipment Finance',
        purpose: 'Financing the purchase of new or pre-owned tractors, power tillers, rotavators, and farm implements.',
        interestRate: '8.90% - 11.50% p.a. depending on credit profile',
        maxAmount: 'Up to 90% of the on-road price of the tractor',
        tenure: '12 to 84 months (flexible post-harvest seasonal repayments)',
        collateralRequirement: 'Hypothecation of purchased tractor (no land mortgage for loans up to ₹7 Lakh)',
        subsidyOrSubvention: 'Can be linked with Central SMAM tractor subsidy (up to ₹1.25 Lakh adjustment)',
        eligibility: [
          'Minimum 2 acres of cultivable agricultural land in applicant or co-applicant name'
        ],
        requiredDocuments: ['AADHAAR', 'PAN', '7_12_EXTRACT', 'BANK_PASSBOOK'],
        officialSourceUrl: 'https://hdfcbank.com/personal/borrow/popular-loans/tractor-loan',
        featured: true
      }
    ];

    // 3. Demo Users across all 5 roles
    const now = new Date().toISOString();
    this.data.users = [
      {
        id: 'USER-FARMER-1',
        fullName: 'Ramesh Balasaheb Patil',
        email: 'farmer@krishi.gov.in',
        mobile: '+91 98220 14589',
        role: 'FARMER',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Baramati',
        pinCode: '413102',
        isVerified: true,
        language: 'en',
        theme: 'light',
        createdAt: '2026-01-10T10:00:00.000Z'
      },
      {
        id: 'USER-BANK-1',
        fullName: 'Priya Sharma (Chief Agri-Credit Manager)',
        email: 'bank.officer@sbi.co.in',
        mobile: '+91 94230 87123',
        role: 'BANK_OFFICER',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Shivajinagar Branch',
        pinCode: '411005',
        isVerified: true,
        language: 'en',
        theme: 'light',
        createdAt: '2026-01-05T09:00:00.000Z'
      },
      {
        id: 'USER-AGRI-1',
        fullName: 'Dr. Vikram Deshmukh (District Agriculture Officer)',
        email: 'agri.officer@krishi.gov.in',
        mobile: '+91 98901 23456',
        role: 'AGRICULTURE_OFFICER',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Krishi Bhavan, Pune',
        pinCode: '411001',
        isVerified: true,
        language: 'en',
        theme: 'light',
        createdAt: '2026-01-05T09:30:00.000Z'
      },
      {
        id: 'USER-CSC-1',
        fullName: 'Suresh Ghadge (CSC VLE Center Lead)',
        email: 'csc.operator@csc.gov.in',
        mobile: '+91 97654 32109',
        role: 'CSC_OPERATOR',
        state: 'Maharashtra',
        district: 'Pune',
        village: 'Baramati Rural CSC',
        pinCode: '413102',
        isVerified: true,
        language: 'en',
        theme: 'light',
        createdAt: '2026-01-12T08:00:00.000Z'
      },
      {
        id: 'USER-ADMIN-1',
        fullName: 'Kavita Nair (System Administrator)',
        email: 'admin@krishi.gov.in',
        mobile: '+91 91234 56789',
        role: 'SYSTEM_ADMIN',
        state: 'Delhi',
        district: 'New Delhi',
        village: 'Krishi Bhawan, Central Secretariat',
        pinCode: '110001',
        isVerified: true,
        language: 'en',
        theme: 'light',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ];

    // 4. Farmer Profile for Ramesh Patil
    this.data.farmerProfiles['USER-FARMER-1'] = {
      userId: 'USER-FARMER-1',
      landAreaAcres: 3.5, // ~1.41 hectares (Small Farmer)
      landOwnership: 'OWNED',
      surveyNumber: '142/2A, 143/1',
      primaryCrops: ['Sugarcane', 'Soybean', 'Wheat', 'Onion'],
      irrigationType: 'DRIP',
      farmingType: 'CONVENTIONAL',
      farmerCategory: 'SMALL',
      annualIncome: 180000,
      hasKisanCreditCard: true,
      bankName: 'State Bank of India',
      bankAccountNumberMasked: '•••• •••• 4589',
      ifscCode: 'SBIN0001234'
    };

    // 5. Initial User Documents in Document Vault for Ramesh Patil
    this.data.documents = [
      {
        id: 'DOC-101',
        userId: 'USER-FARMER-1',
        documentType: 'AADHAAR',
        fileName: 'Aadhaar_Card_Ramesh_Patil.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        uploadSource: 'DEVICE',
        uploadedAt: '2026-01-15T11:20:00.000Z',
        updatedAt: '2026-01-16T14:30:00.000Z',
        status: 'VERIFIED',
        officerRemarks: 'UIDAI biometric validation confirmed. Name and address match land record.',
        verifiedBy: 'Dr. Vikram Deshmukh',
        verifiedAt: '2026-01-16T14:30:00.000Z'
      },
      {
        id: 'DOC-102',
        userId: 'USER-FARMER-1',
        documentType: '7_12_EXTRACT',
        fileName: 'Satbara_Extract_Survey_142.pdf',
        fileSize: 2097152,
        mimeType: 'application/pdf',
        uploadSource: 'DEVICE',
        uploadedAt: '2026-01-15T11:25:00.000Z',
        updatedAt: '2026-01-16T15:00:00.000Z',
        status: 'VERIFIED',
        officerRemarks: 'Revenue portal digital e-record verified with digital signature. 3.5 acres confirmed.',
        verifiedBy: 'Dr. Vikram Deshmukh',
        verifiedAt: '2026-01-16T15:00:00.000Z'
      },
      {
        id: 'DOC-103',
        userId: 'USER-FARMER-1',
        documentType: 'BANK_PASSBOOK',
        fileName: 'SBI_Passbook_Front_Page.jpg',
        fileSize: 850400,
        mimeType: 'image/jpeg',
        uploadSource: 'CAMERA',
        uploadedAt: '2026-01-15T11:30:00.000Z',
        updatedAt: '2026-01-16T15:10:00.000Z',
        status: 'VERIFIED',
        officerRemarks: 'Aadhaar seeding active. Account is active in Baramati branch.',
        verifiedBy: 'Priya Sharma (Chief Agri-Credit Manager)',
        verifiedAt: '2026-01-16T15:10:00.000Z'
      },
      {
        id: 'DOC-104',
        userId: 'USER-FARMER-1',
        documentType: 'SOIL_HEALTH_CARD',
        fileName: 'Soil_Health_Card_Cycle_2025.pdf',
        fileSize: 1120000,
        mimeType: 'application/pdf',
        uploadSource: 'GOOGLE_DRIVE',
        uploadedAt: '2026-02-01T09:15:00.000Z',
        updatedAt: '2026-02-02T10:00:00.000Z',
        status: 'VERIFIED',
        officerRemarks: 'Valid soil test recorded. Recommended NPK dosage registered.',
        verifiedBy: 'Dr. Vikram Deshmukh',
        verifiedAt: '2026-02-02T10:00:00.000Z'
      }
    ];

    // 6. Realistic Applications demonstrating the review workflow
    this.data.applications = [
      {
        id: 'APP-2026-000123',
        userId: 'USER-FARMER-1',
        farmerName: 'Ramesh Balasaheb Patil',
        farmerMobile: '+91 98220 14589',
        farmerDistrict: 'Pune',
        farmerState: 'Maharashtra',
        schemeId: 'SCHEME-KUSUM-B',
        schemeName: 'PM-KUSUM Component B: Standalone Solar Agriculture Pumps (5 HP Solar Pump)',
        schemeType: 'SUBSIDY',
        submittedAt: '2026-02-10T11:00:00.000Z',
        updatedAt: '2026-02-14T16:45:00.000Z',
        status: 'APPROVED',
        priority: 'HIGH',
        assignedOfficerId: 'USER-AGRI-1',
        assignedOfficerName: 'Dr. Vikram Deshmukh',
        assignedOfficerRole: 'District Agriculture Officer',
        officerRemarks: 'All criteria satisfied. Water source verified at Survey 142/2A. 60% subsidy sanctioned.',
        attachedDocumentIds: ['DOC-101', 'DOC-102', 'DOC-103'],
        subsidyClaimAmount: 165000,
        timeline: [
          {
            id: 't1',
            status: 'SUBMITTED',
            action: 'Application submitted online with required documents',
            timestamp: '2026-02-10T11:00:00.000Z'
          },
          {
            id: 't2',
            status: 'UNDER_REVIEW',
            action: 'Assigned to District Agriculture Officer Dr. Vikram Deshmukh',
            officerName: 'Dr. Vikram Deshmukh',
            officerRole: 'District Agriculture Officer',
            remarks: 'Initiating physical land & well verification.',
            timestamp: '2026-02-11T10:30:00.000Z'
          },
          {
            id: 't3',
            status: 'APPROVED',
            action: 'Subsidy Sanction Approved',
            officerName: 'Dr. Vikram Deshmukh',
            officerRole: 'District Agriculture Officer',
            remarks: 'All criteria satisfied. Water source verified at Survey 142/2A. 60% subsidy sanctioned.',
            timestamp: '2026-02-14T16:45:00.000Z'
          }
        ]
      },
      {
        id: 'APP-2026-000124',
        userId: 'USER-FARMER-1',
        farmerName: 'Ramesh Balasaheb Patil',
        farmerMobile: '+91 98220 14589',
        farmerDistrict: 'Pune',
        farmerState: 'Maharashtra',
        schemeId: 'LOAN-SBI-KCC',
        schemeName: 'SBI Kisan Credit Card Renewal & Limit Enhancement',
        schemeType: 'LOAN',
        submittedAt: '2026-03-01T09:15:00.000Z',
        updatedAt: '2026-03-03T14:20:00.000Z',
        status: 'UNDER_REVIEW',
        priority: 'NORMAL',
        assignedOfficerId: 'USER-BANK-1',
        assignedOfficerName: 'Priya Sharma',
        assignedOfficerRole: 'Chief Agri-Credit Manager, SBI',
        officerRemarks: 'Credit history verification in progress. Land cultivation inspection scheduled for Friday.',
        attachedDocumentIds: ['DOC-101', 'DOC-102', 'DOC-103'],
        subsidyClaimAmount: 250000,
        timeline: [
          {
            id: 't201',
            status: 'SUBMITTED',
            action: 'Application submitted for ₹2.50 Lakh KCC renewal',
            timestamp: '2026-03-01T09:15:00.000Z'
          },
          {
            id: 't202',
            status: 'UNDER_REVIEW',
            action: 'Assigned to SBI Chief Agri-Credit Manager Priya Sharma',
            officerName: 'Priya Sharma',
            officerRole: 'Chief Agri-Credit Manager, SBI',
            remarks: 'Credit history verification in progress. Land cultivation inspection scheduled for Friday.',
            timestamp: '2026-03-03T14:20:00.000Z'
          }
        ]
      }
    ];

    // 7. Initial In-App Notifications
    this.data.notifications = [
      {
        id: 'NOTIF-1',
        userId: 'USER-FARMER-1',
        title: 'PM-KUSUM Application Approved! 🎉',
        message: 'Your application APP-2026-000123 for 5 HP Standalone Solar Pump has been approved by District Agriculture Officer. Subsidy amount ₹1,65,000 sanctioned.',
        type: 'APPLICATION',
        read: false,
        relatedId: 'APP-2026-000123',
        createdAt: '2026-02-14T16:46:00.000Z'
      },
      {
        id: 'NOTIF-2',
        userId: 'USER-FARMER-1',
        title: 'KCC Application Under Review',
        message: 'Application APP-2026-000124 has been taken up for review by Priya Sharma, Chief Agri-Credit Manager, SBI.',
        type: 'LOAN',
        read: false,
        relatedId: 'APP-2026-000124',
        createdAt: '2026-03-03T14:21:00.000Z'
      },
      {
        id: 'NOTIF-3',
        userId: 'USER-FARMER-1',
        title: 'New Scheme Matched: Per Drop More Crop (PDMC)',
        message: 'Based on your farm profile (3.5 acres, Drip potential), you are eligible for 55% micro-irrigation subsidy.',
        type: 'SCHEME',
        read: true,
        relatedId: 'SCHEME-PDMC',
        createdAt: '2026-03-05T08:00:00.000Z'
      }
    ];

    // 8. Mandi Prices for Key Agricultural Produce
    this.data.mandiPrices = [
      {
        id: 'MANDI-1',
        crop: 'Soybean (Yellow)',
        variety: 'JS-335',
        marketName: 'Akola APMC',
        district: 'Akola',
        state: 'Maharashtra',
        modalPricePerQuintal: 4720,
        minPrice: 4450,
        maxPrice: 4890,
        arrivalTons: 145,
        date: '2026-03-17'
      },
      {
        id: 'MANDI-2',
        crop: 'Wheat (Lokwan)',
        variety: 'Lokwan Grade-A',
        marketName: 'Pune APMC (Gultekdi)',
        district: 'Pune',
        state: 'Maharashtra',
        modalPricePerQuintal: 2850,
        minPrice: 2600,
        maxPrice: 3100,
        arrivalTons: 210,
        date: '2026-03-17'
      },
      {
        id: 'MANDI-3',
        crop: 'Onion (Red)',
        variety: 'Nashik Red Pol',
        marketName: 'Lasalgaon APMC',
        district: 'Nashik',
        state: 'Maharashtra',
        modalPricePerQuintal: 1650,
        minPrice: 1200,
        maxPrice: 1950,
        arrivalTons: 680,
        date: '2026-03-17'
      },
      {
        id: 'MANDI-4',
        crop: 'Cotton (Medium Staple)',
        variety: 'H-4 / Shankar-6',
        marketName: 'Rajkot APMC',
        district: 'Rajkot',
        state: 'Gujarat',
        modalPricePerQuintal: 7450,
        minPrice: 7100,
        maxPrice: 7800,
        arrivalTons: 320,
        date: '2026-03-17'
      },
      {
        id: 'MANDI-5',
        crop: 'Paddy (Basmati)',
        variety: 'Pusa 1121',
        marketName: 'Karnal Grain Market',
        district: 'Karnal',
        state: 'Haryana',
        modalPricePerQuintal: 4150,
        minPrice: 3800,
        maxPrice: 4400,
        arrivalTons: 490,
        date: '2026-03-17'
      },
      {
        id: 'MANDI-6',
        crop: 'Gram (Chana)',
        variety: 'Desi Chana',
        marketName: 'Latur APMC',
        district: 'Latur',
        state: 'Maharashtra',
        modalPricePerQuintal: 5680,
        minPrice: 5350,
        maxPrice: 5920,
        arrivalTons: 175,
        date: '2026-03-17'
      }
    ];

    // 9. Weather data for key farming districts
    this.data.weather['Pune'] = {
      district: 'Pune',
      state: 'Maharashtra',
      temperatureC: 31,
      condition: 'Partly Cloudy with Good Sunshine',
      humidityPercent: 44,
      rainProbabilityPercent: 10,
      windSpeedKmh: 12,
      forecast: [
        { day: 'Wed', temp: 32, condition: 'Sunny', rainChance: 5 },
        { day: 'Thu', temp: 33, condition: 'Sunny', rainChance: 5 },
        { day: 'Fri', temp: 31, condition: 'Partly Cloudy', rainChance: 15 },
        { day: 'Sat', temp: 30, condition: 'Cloudy', rainChance: 25 },
        { day: 'Sun', temp: 29, condition: 'Light Shower Possible', rainChance: 40 }
      ],
      advisory: 'Favorable condition for harvesting Rabi chickpea and wheat. Protect harvested produce from moisture in open yards.'
    };

    // 10. Nearby Services
    this.data.nearbyServices = [
      {
        id: 'SRV-1',
        name: 'Krishi Vigyan Kendra (KVK) Baramati',
        category: 'AGRI_OFFICE',
        address: 'Sharadanagar, Baramati, Dist. Pune 413115',
        district: 'Pune',
        phone: '+91 2112 255227',
        timing: '09:30 AM - 05:30 PM (Mon-Sat)',
        distanceKm: 4.2
      },
      {
        id: 'SRV-2',
        name: 'State Bank of India - Agri Specialized Branch',
        category: 'BANK',
        address: 'Opp. Market Yard, Baramati, Dist. Pune 413102',
        district: 'Pune',
        phone: '+91 2112 222144',
        timing: '10:00 AM - 04:00 PM',
        distanceKm: 2.8
      },
      {
        id: 'SRV-3',
        name: 'Common Service Centre (CSC) Digital Seva Kendra',
        category: 'CSC',
        address: 'Near Gram Panchayat Office, Malegaon Road, Baramati',
        district: 'Pune',
        phone: '+91 97654 32109',
        timing: '08:30 AM - 08:00 PM (All 7 days)',
        distanceKm: 1.1
      },
      {
        id: 'SRV-4',
        name: 'Baramati Taluka Krishi Seva Kendra & Fertilizer Depot',
        category: 'KRISHI_SEVA_KENDRA',
        address: 'Shop 12, APMC Complex, Baramati',
        district: 'Pune',
        phone: '+91 2112 224455',
        timing: '08:00 AM - 07:30 PM',
        distanceKm: 2.5
      }
    ];

    // 11. Initial Audit Logs
    this.data.auditLogs = [
      {
        id: 'AUDIT-INIT-1',
        userId: 'USER-ADMIN-1',
        userName: 'Kavita Nair (System Administrator)',
        userRole: 'SYSTEM_ADMIN',
        action: 'SCHEME_CATALOG_VERIFICATION',
        details: 'Verified and published 10 official Central & State agricultural schemes against GoI gazette notifications.',
        timestamp: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'AUDIT-INIT-2',
        userId: 'USER-AGRI-1',
        userName: 'Dr. Vikram Deshmukh',
        userRole: 'AGRICULTURE_OFFICER',
        action: 'APPLICATION_SANCTION',
        details: 'Approved PM-KUSUM application APP-2026-000123 for farmer Ramesh Patil following site survey.',
        targetId: 'APP-2026-000123',
        timestamp: '2026-02-14T16:45:00.000Z'
      }
    ];

    // 12. Initial Real-Time SMS Messages (Simulating GoI Transactional SMS)
    this.data.smsMessages = [
      {
        id: 'SMS-910241',
        recipientMobile: '+91 98220 12345',
        recipientName: 'Ramesh Patel',
        type: 'DBT_CREDIT',
        title: 'PM-KISAN DBT Credit Alert',
        message: '[KRISHI-GOV - Govt of India]\nDBT Credit Alert: ₹2,000 transferred via PFMS to Aadhaar-linked Bank A/c for PM-KISAN 17th Installment. Ref UTR: 628192019.\n- Ministry of Agriculture, GoI',
        gateway: 'NIC_KISAN_SMS',
        status: 'DELIVERED',
        sentAt: '2026-03-01T10:30:00.000Z',
        isOffline: false
      },
      {
        id: 'SMS-910242',
        recipientMobile: '+91 98220 12345',
        recipientName: 'Ramesh Patel',
        type: 'STATUS_UPDATE',
        title: 'PM-KUSUM Solar Pump Sanctioned',
        message: '[KRISHI-GOV - Govt of India]\nUpdate on App APP-2026-000123: Your application for PM-KUSUM Solar Pump (5HP AC) has been APPROVED by Agriculture Officer Dr. Vikram Deshmukh. Subsidy sanctioned: ₹1,56,000.\n- Ministry of Agriculture, GoI',
        gateway: 'NIC_KISAN_SMS',
        status: 'DELIVERED',
        sentAt: '2026-02-14T16:45:00.000Z',
        isOffline: false,
        relatedId: 'APP-2026-000123'
      },
      {
        id: 'SMS-910243',
        recipientMobile: '+91 98220 12345',
        recipientName: 'Ramesh Patel',
        type: 'WEATHER_ALERT',
        title: 'Agro-Met Advisory (Pune & Baramati)',
        message: '[KRISHI-GOV - Govt of India]\nIMD Alert: Moderate rain expected in Pune district over next 36 hours. Postpone foliar pesticide sprays and maintain drain channels in sugarcane fields.\n- Ministry of Agriculture, GoI',
        gateway: 'NIC_KISAN_SMS',
        status: 'DELIVERED',
        sentAt: '2026-03-10T07:15:00.000Z',
        isOffline: false
      }
    ];

    // 13. Initial Saved / Bookmarked Schemes for Demo Farmer
    const pmKisan = this.data.schemes.find(s => s.id === 'SCHEME-PMKISAN');
    const kusum = this.data.schemes.find(s => s.id === 'SCHEME-KUSUM-B');
    this.data.savedSchemes = [
      {
        id: 'SAVED-1001',
        userId: 'USER-FARMER-1',
        schemeId: 'SCHEME-PMKISAN',
        schemeName: pmKisan?.name || 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        category: 'CENTRAL',
        department: 'Department of Agriculture & Farmers Welfare, Government of India',
        subsidyAmountOrPercent: '₹6,000 / year (100% Central Funded DBT)',
        benefits: pmKisan?.benefits || '₹6,000 annually credited directly to Aadhaar-seeded bank account in 3 cycles.',
        officialSourceUrl: 'https://pmkisan.gov.in',
        notes: 'Mandatory annual direct cash DBT verification pending for next cycle',
        savedAt: '2026-03-05T09:30:00.000Z',
        scheme: pmKisan
      },
      {
        id: 'SAVED-1002',
        userId: 'USER-FARMER-1',
        schemeId: 'SCHEME-KUSUM-B',
        schemeName: kusum?.name || 'PM-KUSUM Component-B (Solar Water Pumping System)',
        category: 'SOLAR',
        department: 'Ministry of New and Renewable Energy (MNRE) & MSEDCL',
        subsidyAmountOrPercent: '60% Subsidy (30% GoI + 30% State Govt)',
        benefits: kusum?.benefits || '60% direct subsidy grant on 3 HP / 5 HP / 7.5 HP standalone solar pumps.',
        officialSourceUrl: 'https://pmkusum.mnre.gov.in',
        notes: 'Targeting 5 HP AC Solar Pump installation for Baramati farm plot',
        savedAt: '2026-03-08T14:15:00.000Z',
        scheme: kusum
      }
    ];

    // 8. Official Government Farmer Portals (Verified GoI & State Portals)
    this.data.officialPortals = [...DEFAULT_OFFICIAL_PORTALS];
  }
}

export const db = new Database();
