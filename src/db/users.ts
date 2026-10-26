import { db, isCloudSqlConfigured } from './index.ts';
import {
  users,
  farmerProfiles,
  applications,
  documents,
  notifications,
  schemes,
  savedSchemes,
  auditLogs,
  officialPortals
} from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

/* =========================================================================
   USERS & PROFILES
========================================================================= */

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  role?: string,
  passwordHash?: string,
  mobile?: string,
  state?: string,
  district?: string,
  village?: string
) {
  if (!isCloudSqlConfigured) {
    return {
      id: uid,
      uid,
      email,
      fullName: fullName || email.split('@')[0],
      role: role || 'FARMER',
      passwordHash: passwordHash || null,
      mobile: mobile || null,
      state: state || null,
      district: district || null,
      village: village || null,
    };
  }

  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const inserted = await db.insert(users)
      .values({
        uid,
        email,
        fullName: fullName || email.split('@')[0],
        role: role || 'FARMER',
        passwordHash: passwordHash || null,
        mobile: mobile || null,
        state: state || null,
        district: district || null,
        village: village || null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database user sync failed.', { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  if (!isCloudSqlConfigured) return null;
  try {
    const found = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return found.length > 0 ? found[0] : null;
  } catch (error) {
    console.warn('Error querying user by email:', error);
    return null;
  }
}

export async function getCloudSqlFarmerProfile(userId: string) {
  if (!isCloudSqlConfigured) return null;
  try {
    const found = await db.select().from(farmerProfiles).where(eq(farmerProfiles.userId, userId)).limit(1);
    return found.length > 0 ? found[0] : null;
  } catch (error) {
    console.warn('Error querying farmer profile from Cloud SQL:', error);
    return null;
  }
}

export async function saveCloudSqlFarmerProfile(profileData: {
  userId: string;
  landAreaAcres?: string;
  landOwnership?: string;
  surveyNumber?: string;
  primaryCrops?: string;
  irrigationType?: string;
  farmingType?: string;
  farmerCategory?: string;
  annualIncome?: number;
  hasKisanCreditCard?: string;
  bankName?: string;
  bankAccountNumberMasked?: string;
  ifscCode?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const result = await db.insert(farmerProfiles)
      .values({
        userId: profileData.userId,
        landAreaAcres: profileData.landAreaAcres,
        landOwnership: profileData.landOwnership,
        surveyNumber: profileData.surveyNumber,
        primaryCrops: profileData.primaryCrops,
        irrigationType: profileData.irrigationType,
        farmingType: profileData.farmingType,
        farmerCategory: profileData.farmerCategory,
        annualIncome: profileData.annualIncome,
        hasKisanCreditCard: profileData.hasKisanCreditCard,
        bankName: profileData.bankName,
        bankAccountNumberMasked: profileData.bankAccountNumberMasked,
        ifscCode: profileData.ifscCode,
      })
      .onConflictDoUpdate({
        target: farmerProfiles.userId,
        set: {
          landAreaAcres: profileData.landAreaAcres,
          landOwnership: profileData.landOwnership,
          surveyNumber: profileData.surveyNumber,
          primaryCrops: profileData.primaryCrops,
          irrigationType: profileData.irrigationType,
          farmingType: profileData.farmingType,
          farmerCategory: profileData.farmerCategory,
          annualIncome: profileData.annualIncome,
          hasKisanCreditCard: profileData.hasKisanCreditCard,
          bankName: profileData.bankName,
          bankAccountNumberMasked: profileData.bankAccountNumberMasked,
          ifscCode: profileData.ifscCode,
        }
      })
      .returning();
    return result[0];
  } catch (error) {
    console.warn('Error saving farmer profile to Cloud SQL:', error);
    return null;
  }
}

/* =========================================================================
   APPLICATIONS WORKFLOW
========================================================================= */

export async function getCloudSqlApplications(userId?: string) {
  if (!isCloudSqlConfigured) return [];
  try {
    if (userId) {
      return await db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.submittedAt));
    }
    return await db.select().from(applications).orderBy(desc(applications.submittedAt));
  } catch (error) {
    console.warn('Error fetching applications from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlApplication(appData: {
  id: string;
  userId: string;
  farmerName?: string;
  farmerMobile?: string;
  farmerDistrict?: string;
  farmerState?: string;
  schemeId: string;
  schemeName: string;
  schemeType?: string;
  status?: string;
  priority?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerRole?: string;
  subsidyClaimAmount?: number;
  officerRemarks?: string;
  attachedDocumentIds?: string;
  timeline?: string;
  requestedDocuments?: string;
  isOfflineCreated?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(applications)
      .values({
        id: appData.id,
        userId: appData.userId,
        farmerName: appData.farmerName,
        farmerMobile: appData.farmerMobile,
        farmerDistrict: appData.farmerDistrict,
        farmerState: appData.farmerState,
        schemeId: appData.schemeId,
        schemeName: appData.schemeName,
        schemeType: appData.schemeType || 'SCHEME',
        status: appData.status || 'PENDING',
        priority: appData.priority || 'NORMAL',
        assignedOfficerId: appData.assignedOfficerId,
        assignedOfficerName: appData.assignedOfficerName,
        assignedOfficerRole: appData.assignedOfficerRole,
        subsidyClaimAmount: appData.subsidyClaimAmount,
        officerRemarks: appData.officerRemarks,
        attachedDocumentIds: appData.attachedDocumentIds,
        timeline: appData.timeline,
        requestedDocuments: appData.requestedDocuments,
        isOfflineCreated: appData.isOfflineCreated || 'false',
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error inserting application in Cloud SQL:', error);
    return null;
  }
}

export async function updateCloudSqlApplicationStatus(
  applicationId: string,
  status: string,
  remarks: string,
  timelineJson?: string,
  requestedDocuments?: string
) {
  if (!isCloudSqlConfigured) return null;
  try {
    const updated = await db.update(applications)
      .set({
        status,
        officerRemarks: remarks,
        timeline: timelineJson,
        requestedDocuments: requestedDocuments,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))
      .returning();
    return updated[0];
  } catch (error) {
    console.warn('Error updating application status in Cloud SQL:', error);
    return null;
  }
}

/* =========================================================================
   DOCUMENTS & VAULT
========================================================================= */

export async function getCloudSqlDocuments(userId?: string) {
  if (!isCloudSqlConfigured) return [];
  try {
    if (userId) {
      return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
    }
    return await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  } catch (error) {
    console.warn('Error fetching documents from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlDocument(docData: {
  id: string;
  userId: string;
  documentType: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadSource?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  fileData?: string;
  status?: string;
  officerRemarks?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(documents)
      .values({
        id: docData.id,
        userId: docData.userId,
        documentType: docData.documentType,
        fileName: docData.fileName,
        fileSize: docData.fileSize,
        mimeType: docData.mimeType,
        uploadSource: docData.uploadSource || 'DEVICE',
        driveFileId: docData.driveFileId,
        driveWebViewLink: docData.driveWebViewLink,
        fileData: docData.fileData,
        status: docData.status || 'UPLOADED',
        officerRemarks: docData.officerRemarks,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error saving document to Cloud SQL:', error);
    return null;
  }
}

export async function deleteCloudSqlDocument(documentId: string) {
  if (!isCloudSqlConfigured) return true;
  try {
    await db.delete(documents).where(eq(documents.id, documentId));
    return true;
  } catch (error) {
    console.warn('Error deleting document from Cloud SQL:', error);
    return false;
  }
}

/* =========================================================================
   NOTIFICATIONS
========================================================================= */

export async function getCloudSqlNotifications(userId: string) {
  if (!isCloudSqlConfigured) return [];
  try {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  } catch (error) {
    console.warn('Error fetching notifications from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlNotification(notifData: {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
  read?: string;
  relatedId?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(notifications)
      .values({
        id: notifData.id,
        userId: notifData.userId,
        title: notifData.title,
        message: notifData.message,
        type: notifData.type || 'APPLICATION',
        read: notifData.read || 'false',
        relatedId: notifData.relatedId,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error saving notification to Cloud SQL:', error);
    return null;
  }
}

export async function markCloudSqlNotificationRead(id: string) {
  if (!isCloudSqlConfigured) return true;
  try {
    await db.update(notifications)
      .set({ read: 'true' })
      .where(eq(notifications.id, id));
    return true;
  } catch (error) {
    console.warn('Error marking notification read in Cloud SQL:', error);
    return false;
  }
}

/* =========================================================================
   SCHEMES
========================================================================= */

export async function getCloudSqlSchemes() {
  if (!isCloudSqlConfigured) return [];
  try {
    return await db.select().from(schemes).orderBy(desc(schemes.updatedAt));
  } catch (error) {
    console.warn('Error fetching schemes from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlScheme(schemeData: {
  id: string;
  code: string;
  name: string;
  hindiName?: string;
  marathiName?: string;
  department: string;
  governmentLevel?: string;
  state?: string;
  category: string;
  description?: string;
  benefits?: string;
  subsidyAmountOrPercent?: string;
  eligibilitySummary?: string;
  rules?: string;
  requiredDocuments?: string;
  applicationProcess?: string;
  officialSourceUrl?: string;
  officialApplicationUrl?: string;
  lastVerifiedDate?: string;
  version?: string;
  status?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(schemes)
      .values({
        id: schemeData.id,
        code: schemeData.code,
        name: schemeData.name,
        hindiName: schemeData.hindiName,
        marathiName: schemeData.marathiName,
        department: schemeData.department,
        governmentLevel: schemeData.governmentLevel || 'CENTRAL',
        state: schemeData.state,
        category: schemeData.category,
        description: schemeData.description,
        benefits: schemeData.benefits,
        subsidyAmountOrPercent: schemeData.subsidyAmountOrPercent,
        eligibilitySummary: schemeData.eligibilitySummary,
        rules: schemeData.rules,
        requiredDocuments: schemeData.requiredDocuments,
        applicationProcess: schemeData.applicationProcess,
        officialSourceUrl: schemeData.officialSourceUrl,
        officialApplicationUrl: schemeData.officialApplicationUrl,
        lastVerifiedDate: schemeData.lastVerifiedDate,
        version: schemeData.version || '1.0',
        status: schemeData.status || 'ACTIVE',
      })
      .onConflictDoUpdate({
        target: schemes.id,
        set: {
          name: schemeData.name,
          description: schemeData.description,
          benefits: schemeData.benefits,
          subsidyAmountOrPercent: schemeData.subsidyAmountOrPercent,
          officialSourceUrl: schemeData.officialSourceUrl,
          updatedAt: new Date(),
        }
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error saving scheme to Cloud SQL:', error);
    return null;
  }
}

/* =========================================================================
   SAVED SCHEMES
========================================================================= */

export async function getCloudSqlSavedSchemes(userId: string) {
  if (!isCloudSqlConfigured) return [];
  try {
    return await db.select().from(savedSchemes).where(eq(savedSchemes.userId, userId)).orderBy(desc(savedSchemes.savedAt));
  } catch (error) {
    console.warn('Error fetching saved schemes from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlSavedScheme(schemeData: {
  id: string;
  userId: string;
  schemeId: string;
  schemeName: string;
  schemeCategory?: string;
  department?: string;
  subsidyAmountOrPercent?: string;
  benefits?: string;
  officialSourceUrl?: string;
  notes?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(savedSchemes)
      .values({
        id: schemeData.id,
        userId: schemeData.userId,
        schemeId: schemeData.schemeId,
        schemeName: schemeData.schemeName,
        schemeCategory: schemeData.schemeCategory,
        department: schemeData.department,
        subsidyAmountOrPercent: schemeData.subsidyAmountOrPercent,
        benefits: schemeData.benefits,
        officialSourceUrl: schemeData.officialSourceUrl,
        notes: schemeData.notes,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error saving scheme to Cloud SQL:', error);
    return null;
  }
}

export async function deleteCloudSqlSavedScheme(userId: string, schemeId: string) {
  if (!isCloudSqlConfigured) return true;
  try {
    await db.delete(savedSchemes)
      .where(and(eq(savedSchemes.userId, userId), eq(savedSchemes.schemeId, schemeId)));
    return true;
  } catch (error) {
    console.warn('Error deleting saved scheme from Cloud SQL:', error);
    return false;
  }
}

/* =========================================================================
   AUDIT LOGS
========================================================================= */

export async function saveCloudSqlAuditLog(logData: {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: string;
  details: string;
  targetId?: string;
}) {
  if (!isCloudSqlConfigured) return true;
  try {
    await db.insert(auditLogs)
      .values({
        id: logData.id,
        userId: logData.userId,
        userName: logData.userName,
        userRole: logData.userRole || 'FARMER',
        action: logData.action,
        details: logData.details,
        targetId: logData.targetId,
      });
    return true;
  } catch (error) {
    console.warn('Error saving audit log to Cloud SQL:', error);
    return false;
  }
}

export async function getCloudSqlAuditLogs() {
  if (!isCloudSqlConfigured) return [];
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).limit(100);
  } catch (error) {
    console.warn('Error fetching audit logs from Cloud SQL:', error);
    return [];
  }
}

/* =========================================================================
   OFFICIAL GOVERNMENT FARMER PORTALS
========================================================================= */

export async function getCloudSqlPortals() {
  if (!isCloudSqlConfigured) return [];
  try {
    return await db.select().from(officialPortals).orderBy(desc(officialPortals.featured), desc(officialPortals.updatedAt));
  } catch (error) {
    console.warn('Error fetching official portals from Cloud SQL:', error);
    return [];
  }
}

export async function saveCloudSqlPortal(portalData: {
  id: string;
  name: string;
  hindiName?: string;
  marathiName?: string;
  department: string;
  governmentLevel?: string;
  state?: string;
  category: string;
  purpose: string;
  description: string;
  officialUrl: string;
  lastVerifiedDate: string;
  featured?: string;
  status?: string;
  keyServices?: string;
}) {
  if (!isCloudSqlConfigured) return null;
  try {
    const inserted = await db.insert(officialPortals)
      .values({
        id: portalData.id,
        name: portalData.name,
        hindiName: portalData.hindiName,
        marathiName: portalData.marathiName,
        department: portalData.department,
        governmentLevel: portalData.governmentLevel || 'CENTRAL',
        state: portalData.state,
        category: portalData.category,
        purpose: portalData.purpose,
        description: portalData.description,
        officialUrl: portalData.officialUrl,
        lastVerifiedDate: portalData.lastVerifiedDate,
        featured: portalData.featured || 'false',
        status: portalData.status || 'ACTIVE',
        keyServices: portalData.keyServices,
      })
      .onConflictDoUpdate({
        target: officialPortals.id,
        set: {
          name: portalData.name,
          hindiName: portalData.hindiName,
          marathiName: portalData.marathiName,
          department: portalData.department,
          governmentLevel: portalData.governmentLevel || 'CENTRAL',
          state: portalData.state,
          category: portalData.category,
          purpose: portalData.purpose,
          description: portalData.description,
          officialUrl: portalData.officialUrl,
          lastVerifiedDate: portalData.lastVerifiedDate,
          featured: portalData.featured || 'false',
          status: portalData.status || 'ACTIVE',
          keyServices: portalData.keyServices,
          updatedAt: new Date(),
        }
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.warn('Error saving official portal to Cloud SQL:', error);
    return null;
  }
}

export async function updateCloudSqlPortal(
  id: string,
  portalData: Partial<{
    name: string;
    hindiName: string;
    marathiName: string;
    department: string;
    governmentLevel: string;
    state: string;
    category: string;
    purpose: string;
    description: string;
    officialUrl: string;
    lastVerifiedDate: string;
    featured: string;
    status: string;
    keyServices: string;
  }>
) {
  if (!isCloudSqlConfigured) return null;
  try {
    const updated = await db.update(officialPortals)
      .set({
        ...portalData,
        updatedAt: new Date(),
      })
      .where(eq(officialPortals.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.warn('Error updating official portal in Cloud SQL:', error);
    return null;
  }
}

export async function deleteCloudSqlPortal(id: string) {
  if (!isCloudSqlConfigured) return true;
  try {
    await db.delete(officialPortals).where(eq(officialPortals.id, id));
    return true;
  } catch (error) {
    console.warn('Error deleting official portal from Cloud SQL:', error);
    return false;
  }
}


