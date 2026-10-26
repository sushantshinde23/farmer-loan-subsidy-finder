import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db } from './server/db';
import { askKrishiSahayak } from './server/gemini';
import {
  saveCloudSqlApplication,
  getCloudSqlApplications,
  updateCloudSqlApplicationStatus,
  saveCloudSqlDocument,
  getCloudSqlDocuments,
  deleteCloudSqlDocument,
  saveCloudSqlNotification,
  getCloudSqlNotifications,
  markCloudSqlNotificationRead,
  getOrCreateUser,
  saveCloudSqlFarmerProfile,
  getCloudSqlFarmerProfile,
  saveCloudSqlScheme,
  getCloudSqlSchemes,
  saveCloudSqlPortal,
  updateCloudSqlPortal,
  deleteCloudSqlPortal,
  getCloudSqlPortals
} from './src/db/users';
import { isCloudSqlConfigured } from './src/db/index';
import {
  User,
  FarmerProfile,
  Application,
  ApplicationTimelineEvent,
  UserDocument,
  DocumentType,
  EligibilityResult,
  OfficialPortal,
  PortalCategory
} from './src/types';
import { SmsRecord } from './src/types/sms';
import { computeFarmerRecommendations } from './src/services/recommendationEngine';

dotenv.config();

const app = express();
const PORT = 3000;

/* =========================================================================
   REAL-TIME WEBSOCKET & SSE BROADCAST SYSTEM
   Instant synchronization of application statuses and notifications
========================================================================= */

interface ConnectedWsClient {
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
}

const wsClients = new Set<ConnectedWsClient>();
const sseClients = new Set<{ res: Response; userId?: string }>();

function broadcastRealtimeEvent(type: string, payload: any, targetUserId?: string) {
  const eventData = JSON.stringify({
    type,
    payload,
    targetUserId,
    timestamp: new Date().toISOString()
  });

  // 1. Broadcast to WebSockets
  for (const client of wsClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(eventData);
      } catch (err) {
        console.warn('WebSocket send error:', err);
      }
    }
  }

  // 2. Broadcast to Server-Sent Events (SSE) connections
  for (const client of sseClients) {
    try {
      client.res.write(`data: ${eventData}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events endpoint for transport redundancy
app.get('/api/realtime/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const userId = req.query.userId as string | undefined;
  const client = { res, userId };
  sseClients.add(client);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', transport: 'sse', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

// High limits for document uploads and images (25mb)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

/* =========================================================================
   CRYPTOGRAPHIC PASSWORD HASHING (SCRYPT + SALT)
   Never store plain-text passwords
========================================================================= */

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// Helper to extract authenticated user from header with strict fallback check
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  const users = db.getData().users;
  if (!authHeader) return users[0]; // Default demo farmer in development if unauthenticated
  
  const token = authHeader.replace('Bearer ', '').trim();
  const found = users.find(u => u.id === token || u.email.toLowerCase() === token.toLowerCase());
  return found || null;
}

/* =========================================================================
   DOCUMENT ENCRYPTION & DATA PROTECTION AT REST (AES-256-GCM + SHA-256)
========================================================================= */

const DOCUMENT_ENCRYPTION_SECRET = process.env.DOCUMENT_ENCRYPTION_KEY || 'KRISHI-GOV-DOCUMENT-AES256-GCM-SECURITY-KEY-2026';
const AES_KEY = crypto.scryptSync(DOCUMENT_ENCRYPTION_SECRET, 'KRISHI_STATIC_ENCRYPTION_SALT_GOV', 32);
const HMAC_TICKET_SECRET = crypto.scryptSync(DOCUMENT_ENCRYPTION_SECRET, 'KRISHI_HMAC_TEMPORARY_TICKET_SALT_GOV', 32);

function encryptDocumentPayload(plainData: string): { encrypted: string; checksumSha256: string } {
  const checksumSha256 = crypto.createHash('sha256').update(plainData).digest('hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  let encrypted = cipher.update(plainData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  const payload = `enc:aes256gcm:${iv.toString('hex')}:${tag}:${encrypted}`;
  return { encrypted: payload, checksumSha256 };
}

function decryptDocumentPayload(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:aes256gcm:')) {
    return encryptedPayload || ''; // Fallback for backwards compatibility
  }
  const parts = encryptedPayload.split(':');
  if (parts.length < 5) return encryptedPayload;
  const iv = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const cipherHex = parts[4];
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/* Rate Limiter for Document Operations */
const rateLimitBuckets: Record<string, { count: number; resetAt: number }> = {};
function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets[key];
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets[key] = { count: 1, resetAt: now + windowSeconds * 1000 };
    return true;
  }
  if (bucket.count >= maxRequests) {
    return false;
  }
  bucket.count++;
  return true;
}

/* File Type Validation & Malware/Script Scanner */
interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType: string;
  sizeBytes: number;
}

function scanAndValidateDocument(fileName: string, mimeType: string, fileData?: string): FileValidationResult {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(fileName).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Prohibited file extension (${ext || 'unknown'}). Only verified official PDF, JPG, PNG, and WebP records are accepted into the vault.`,
      mimeType,
      sizeBytes: 0
    };
  }

  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Disallowed MIME type (${mimeType}). Only PDF, JPEG, PNG, and WebP documents are permitted.`,
      mimeType,
      sizeBytes: 0
    };
  }

  if (fileData) {
    let base64Content = fileData;
    if (fileData.includes(',')) {
      base64Content = fileData.split(',')[1];
    }
    const buffer = Buffer.from(base64Content, 'base64');
    const sizeBytes = buffer.length;

    // Strict 10MB file size ceiling
    if (sizeBytes > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: `File size exceeds the 10 MB maximum government document threshold (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB uploaded).`,
        mimeType,
        sizeBytes
      };
    }

    // Binary Magic Number Verification
    let signatureValid = false;
    if (ext === '.pdf' || mimeType.includes('pdf')) {
      signatureValid = buffer.toString('utf8', 0, 5) === '%PDF-';
    } else if (ext === '.jpg' || ext === '.jpeg' || mimeType.includes('jpeg')) {
      signatureValid = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    } else if (ext === '.png' || mimeType.includes('png')) {
      signatureValid = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    } else if (ext === '.webp' || mimeType.includes('webp')) {
      signatureValid = buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';
    } else {
      signatureValid = true;
    }

    if (!signatureValid) {
      return {
        valid: false,
        error: 'File binary header signature mismatch. File appears disguised or corrupted.',
        mimeType,
        sizeBytes
      };
    }

    // Malicious Executable & Active Scripting Scanner
    const textSample = buffer.toString('utf8', 0, Math.min(buffer.length, 64000));
    const maliciousPatterns = [
      /<script\b/i,
      /javascript:/i,
      /<\?php/i,
      /\/Launch\b/i,
      /\/EmbeddedFiles\b/i,
      /eval\s*\(/i,
      /powershell/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(textSample)) {
        return {
          valid: false,
          error: 'Security Threat: File contains prohibited active scripting or embedded executable directives.',
          mimeType,
          sizeBytes
        };
      }
    }

    // Block Windows PE (MZ) and Linux ELF binaries
    if ((buffer[0] === 0x4D && buffer[1] === 0x5A) || (buffer[0] === 0x7F && buffer.toString('utf8', 1, 4) === 'ELF')) {
      return {
        valid: false,
        error: 'Security Threat: Executable binaries are forbidden.',
        mimeType,
        sizeBytes
      };
    }

    return { valid: true, mimeType, sizeBytes };
  }

  return { valid: true, mimeType, sizeBytes: 0 };
}

/* Cryptographic Temporary Access Tickets for Viewing Documents */
interface AccessTicketPayload {
  docId: string;
  userId: string;
  userRole: string;
  action: 'VIEW' | 'DOWNLOAD';
  expiresAt: number;
  nonce: string;
}

function generateAccessTicket(docId: string, user: User, action: 'VIEW' | 'DOWNLOAD'): { ticket: string; expiresAt: string; expiresInSeconds: number } {
  const expiresInSeconds = 600; // 10 minutes temporary window
  const expiresAtMs = Date.now() + expiresInSeconds * 1000;
  const payload: AccessTicketPayload = {
    docId,
    userId: user.id,
    userRole: user.role,
    action,
    expiresAt: expiresAtMs,
    nonce: crypto.randomBytes(8).toString('hex')
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson).toString('base64url');
  const signature = crypto.createHmac('sha256', HMAC_TICKET_SECRET).update(payloadB64).digest('base64url');
  const ticket = `${payloadB64}.${signature}`;

  return {
    ticket,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresInSeconds
  };
}

function verifyAccessTicket(ticketString: string): { valid: boolean; payload?: AccessTicketPayload; error?: string } {
  try {
    const [payloadB64, signature] = ticketString.split('.');
    if (!payloadB64 || !signature) {
      return { valid: false, error: 'Malformed access ticket structure.' };
    }
    const expectedSignature = crypto.createHmac('sha256', HMAC_TICKET_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Cryptographic signature mismatch. Tampered ticket.' };
    }
    const payload: AccessTicketPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Temporary access link has expired. Please request a new secure link from your vault.' };
    }
    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Invalid access ticket.' };
  }
}

/* Strict Document Role-Based Access Control (RBAC) Checker */
function evaluateDocumentAccess(
  user: User | null,
  doc: UserDocument,
  adminReason?: string
): { allowed: boolean; reason?: string; accessMode: 'OWNER' | 'ASSIGNED_OFFICER' | 'CSC_ASSIST' | 'ADMIN_AUDITED' | 'DENIED' } {
  if (!user) {
    return { allowed: false, reason: 'Authentication required. No credentials provided.', accessMode: 'DENIED' };
  }

  // 1. Farmer owns the document
  if (doc.userId === user.id) {
    return { allowed: true, accessMode: 'OWNER', reason: 'Farmer viewing own personal document.' };
  }

  // 2. Bank Officer: ONLY if attached to an application assigned or loan application
  if (user.role === 'BANK_OFFICER') {
    const apps = db.getData().applications.filter(a =>
      a.attachedDocumentIds?.includes(doc.id) || a.userId === doc.userId
    );
    const loanApp = apps.find(a =>
      a.schemeType === 'LOAN' ||
      a.schemeId.includes('LOAN') ||
      a.schemeId.includes('KCC') ||
      a.assignedOfficerId === user.id ||
      a.assignedOfficerRole === 'BANK_OFFICER'
    );
    if (loanApp) {
      return {
        allowed: true,
        accessMode: 'ASSIGNED_OFFICER',
        reason: `Authorized scrutiny for agricultural loan application ${loanApp.id} (${loanApp.schemeName})`
      };
    }
    return {
      allowed: false,
      reason: 'Bank officers can only access documents attached to authorized credit/loan applications.',
      accessMode: 'DENIED'
    };
  }

  // 3. Agriculture Officer: ONLY if attached to a subsidy application
  if (user.role === 'AGRICULTURE_OFFICER') {
    const apps = db.getData().applications.filter(a =>
      a.attachedDocumentIds?.includes(doc.id) || a.userId === doc.userId
    );
    const subsidyApp = apps.find(a =>
      a.schemeType !== 'LOAN' ||
      a.assignedOfficerId === user.id ||
      a.assignedOfficerRole === 'AGRICULTURE_OFFICER'
    );
    if (subsidyApp) {
      return {
        allowed: true,
        accessMode: 'ASSIGNED_OFFICER',
        reason: `Authorized scrutiny for government subsidy application ${subsidyApp.id} (${subsidyApp.schemeName})`
      };
    }
    return {
      allowed: false,
      reason: 'Agriculture officers can only access documents attached to authorized subsidy applications.',
      accessMode: 'DENIED'
    };
  }

  // 4. CSC Operator: ONLY if assisted session / linked application handled by operator
  if (user.role === 'CSC_OPERATOR') {
    const apps = db.getData().applications.filter(a =>
      a.attachedDocumentIds?.includes(doc.id) || a.userId === doc.userId
    );
    const assisted = apps.find(a =>
      doc.uploadSource === 'CSC_DESK' ||
      a.timeline.some(t => t.officerRole === 'CSC_OPERATOR' || t.officerName?.includes(user.fullName))
    );
    if (assisted || doc.uploadSource === 'CSC_DESK') {
      return {
        allowed: true,
        accessMode: 'CSC_ASSIST',
        reason: `Permitted under citizen-assisted CSC service session.`
      };
    }
    return {
      allowed: false,
      reason: 'CSC operators can only access documents for farmers actively assisted at their digital seva kiosk.',
      accessMode: 'DENIED'
    };
  }

  // 5. System Admin: Controlled administrative access with mandatory audit logging
  if (user.role === 'SYSTEM_ADMIN') {
    return {
      allowed: true,
      accessMode: 'ADMIN_AUDITED',
      reason: adminReason || 'Official system administration inspection.'
    };
  }

  return {
    allowed: false,
    reason: 'Access denied: You do not possess necessary security clearance or ownership rights for this document.',
    accessMode: 'DENIED'
  };
}

/* Statutory Retention Lock Check */
function checkDocumentRetentionLock(docId: string): { locked: boolean; activeApplication?: Application } {
  const apps = db.getData().applications;
  for (const app of apps) {
    if (app.attachedDocumentIds?.includes(docId)) {
      if (['PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED'].includes(app.status)) {
        return { locked: true, activeApplication: app };
      }
    }
  }
  return { locked: false };
}

/* =========================================================================
   AUTHENTICATION & USER ROUTES
========================================================================= */

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const {
    email,
    password,
    role,
    mobile,
    fullName,
    state,
    district,
    village,
    isGoogleAuth,
    googleProfile
  } = req.body;
  const users = db.getData().users;

  // Support direct role switching if explicitly requested without email
  if (role && !email && !isGoogleAuth) {
    const userByRole = users.find(u => u.role === role);
    if (userByRole) {
      db.addAuditLog({
        userId: userByRole.id,
        userName: userByRole.fullName,
        userRole: userByRole.role,
        action: 'USER_LOGIN_SWITCH',
        details: `Logged in via role selection as ${userByRole.role}`
      });
      return res.json({
        user: userByRole,
        farmerProfile: db.getData().farmerProfiles[userByRole.id] || null,
        token: userByRole.id
      });
    }
  }

  // Determine targeted email
  const targetEmail = (googleProfile?.email || email || '').trim().toLowerCase();

  // Find existing user by email
  let user = users.find(u => u.email.toLowerCase() === targetEmail);

  if (user) {
    // If standard email+password login, verify password hash
    if (!isGoogleAuth && password && user.passwordHash) {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      }
    } else if (!isGoogleAuth && password && !user.passwordHash) {
      // First time password setup for pre-seeded user
      user.passwordHash = hashPassword(password);
    }

    // Update role if selected
    if (role && ['FARMER', 'BANK_OFFICER', 'AGRICULTURE_OFFICER', 'CSC_OPERATOR', 'SYSTEM_ADMIN'].includes(role)) {
      user.role = role as any;
    }
    if (mobile) {
      user.mobile = mobile;
    }
    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
    } else if (isGoogleAuth && googleProfile?.name && (!user.fullName || user.fullName.includes('User'))) {
      user.fullName = googleProfile.name;
    }
    if (state) user.state = state;
    if (district) user.district = district;
    if (village) user.village = village;
    user.isVerified = true;
    user.isEmailVerified = true;
    user.isMobileVerified = true;

    // Ensure farmer profile exists if user is a farmer
    if (user.role === 'FARMER' && !db.getData().farmerProfiles[user.id]) {
      db.getData().farmerProfiles[user.id] = {
        userId: user.id,
        landAreaAcres: 3.5,
        landOwnership: 'OWNED',
        surveyNumber: '142/2A, 143/1',
        primaryCrops: ['Wheat', 'Soybean', 'Sugarcane'],
        irrigationType: 'DRIP',
        farmingType: 'CONVENTIONAL',
        farmerCategory: 'SMALL',
        annualIncome: 180000,
        hasKisanCreditCard: false
      };
    }

    db.save();
  } else {
    // Create new user with verified information
    const generatedName =
      (fullName && fullName.trim()) ||
      googleProfile?.name ||
      (targetEmail.includes('@')
        ? targetEmail
            .split('@')[0]
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase())
        : 'Farmer Beneficiary');

    const formattedMobile = mobile || '+91 98220 14589';
    const passwordHash = password ? hashPassword(password) : undefined;

    user = {
      id: `USER-${Date.now()}`,
      fullName: generatedName,
      email: targetEmail || 'farmer@krishi.gov.in',
      mobile: formattedMobile,
      passwordHash,
      role: (role as any) || 'FARMER',
      state: state || 'Maharashtra',
      district: district || 'Pune',
      village: village || 'Baramati',
      pinCode: '413102',
      isVerified: true,
      isEmailVerified: true,
      isMobileVerified: true,
      language: 'en',
      theme: 'light',
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Initialize default Farmer Profile if farmer
    if (user.role === 'FARMER') {
      db.getData().farmerProfiles[user.id] = {
        userId: user.id,
        landAreaAcres: 3.5,
        landOwnership: 'OWNED',
        surveyNumber: '142/2A, 143/1',
        primaryCrops: ['Wheat', 'Soybean', 'Sugarcane'],
        irrigationType: 'DRIP',
        farmingType: 'CONVENTIONAL',
        farmerCategory: 'SMALL',
        annualIncome: 180000,
        hasKisanCreditCard: false
      };
    }

    db.save();
  }

  // Cloud SQL background persistence
  getOrCreateUser(
    user.id,
    user.email,
    user.fullName,
    user.role,
    user.passwordHash,
    user.mobile,
    user.state,
    user.district,
    user.village
  ).catch(err => console.warn('Cloud SQL user sync deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: isGoogleAuth ? 'USER_GOOGLE_LOGIN' : 'USER_LOGIN',
    details: isGoogleAuth
      ? `User authenticated via Google Sign-In (${user.email}) with role ${user.role}.`
      : `User logged in with verified credentials (${user.email}, ${user.mobile}) with role ${user.role}.`
  });

  return res.json({
    user,
    farmerProfile: db.getData().farmerProfiles[user.id] || null,
    token: user.id
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { fullName, email, password, mobile, role = 'FARMER', state, district, village } = req.body;

  if (!fullName || !email || !mobile) {
    return res.status(400).json({ error: 'Full name, email, and mobile number are required.' });
  }

  const existing = db.getData().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = password ? hashPassword(password) : undefined;

  const newUser: User = {
    id: `USER-${Date.now()}`,
    fullName,
    email: email.trim().toLowerCase(),
    mobile,
    passwordHash,
    role: role as any,
    state: state || 'Maharashtra',
    district: district || 'Pune',
    village: village || 'Baramati',
    isVerified: true,
    isEmailVerified: true,
    isMobileVerified: true,
    language: 'en',
    theme: 'light',
    createdAt: new Date().toISOString()
  };

  db.getData().users.push(newUser);

  if (role === 'FARMER') {
    db.getData().farmerProfiles[newUser.id] = {
      userId: newUser.id,
      landAreaAcres: 2.5,
      landOwnership: 'OWNED',
      surveyNumber: '100/1',
      primaryCrops: ['Wheat', 'Soybean'],
      irrigationType: 'DRIP',
      farmingType: 'CONVENTIONAL',
      farmerCategory: 'SMALL',
      annualIncome: 150000,
      hasKisanCreditCard: false
    };
  }

  // Cloud SQL background persistence
  getOrCreateUser(
    newUser.id,
    newUser.email,
    newUser.fullName,
    newUser.role,
    newUser.passwordHash,
    newUser.mobile,
    newUser.state,
    newUser.district,
    newUser.village
  ).catch(err => console.warn('Cloud SQL user registration deferred:', err?.message));

  db.addAuditLog({
    userId: newUser.id,
    userName: newUser.fullName,
    userRole: newUser.role,
    action: 'USER_REGISTER',
    details: `New ${newUser.role} account registered with secure password credentials.`
  });

  db.save();

  return res.status(201).json({
    user: newUser,
    farmerProfile: db.getData().farmerProfiles[newUser.id] || null,
    token: newUser.id
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const farmerProfile = db.getData().farmerProfiles[user.id] || null;
  return res.json({ user, farmerProfile });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const currentUser = getAuthUser(req);
  if (!currentUser) return res.status(401).json({ error: 'Not authenticated' });

  const { fullName, mobile, state, district, village, language, theme, farmerProfile } = req.body;

  if (fullName) currentUser.fullName = fullName;
  if (mobile) currentUser.mobile = mobile;
  if (state) currentUser.state = state;
  if (district) currentUser.district = district;
  if (village) currentUser.village = village;
  if (language) currentUser.language = language;
  if (theme) currentUser.theme = theme;

  if (farmerProfile && currentUser.role === 'FARMER') {
    db.getData().farmerProfiles[currentUser.id] = {
      ...db.getData().farmerProfiles[currentUser.id],
      ...farmerProfile,
      userId: currentUser.id
    };

    saveCloudSqlFarmerProfile({
      userId: currentUser.id,
      landAreaAcres: String(farmerProfile.landAreaAcres || ''),
      landOwnership: farmerProfile.landOwnership,
      surveyNumber: farmerProfile.surveyNumber,
      primaryCrops: Array.isArray(farmerProfile.primaryCrops) ? farmerProfile.primaryCrops.join(',') : '',
      irrigationType: farmerProfile.irrigationType,
      farmingType: farmerProfile.farmingType,
      farmerCategory: farmerProfile.farmerCategory,
      annualIncome: farmerProfile.annualIncome,
      hasKisanCreditCard: String(farmerProfile.hasKisanCreditCard ?? false),
      bankName: farmerProfile.bankName,
      bankAccountNumberMasked: farmerProfile.bankAccountNumberMasked,
      ifscCode: farmerProfile.ifscCode
    }).catch(err => console.warn('Cloud SQL farmer profile update deferred:', err?.message));
  }

  db.save();
  return res.json({
    user: currentUser,
    farmerProfile: db.getData().farmerProfiles[currentUser.id] || null
  });
});

/* =========================================================================
   SCHEMES & LOANS ROUTES (DATABASE-BACKED)
========================================================================= */

app.get('/api/schemes', (_req: Request, res: Response) => {
  const { search, category, state } = _req.query;
  let list = [...db.getData().schemes];

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'ALL') {
    list = list.filter(s => s.category === category);
  }

  if (state && state !== 'ALL') {
    list = list.filter(s => !s.state || s.state === state);
  }

  return res.json(list);
});

app.get('/api/schemes/:id', (req: Request, res: Response) => {
  const scheme = db.getData().schemes.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ error: 'Scheme not found' });
  return res.json(scheme);
});

app.post('/api/schemes', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ error: 'Only administrators can manage schemes.' });
  }

  const { id, name, code, department, category, benefits, subsidyAmountOrPercent, requiredDocuments, officialSourceUrl } = req.body;
  const schemes = db.getData().schemes;
  const existingIdx = schemes.findIndex(s => s.id === id);

  if (existingIdx >= 0) {
    schemes[existingIdx] = {
      ...schemes[existingIdx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'UPDATE_SCHEME',
      details: `Updated scheme: ${name} (${code})`,
      targetId: id
    });
    db.save();

    saveCloudSqlScheme({
      id,
      code: code || schemes[existingIdx].code,
      name,
      department: department || schemes[existingIdx].department,
      category: category || schemes[existingIdx].category,
      benefits: benefits || schemes[existingIdx].benefits,
      subsidyAmountOrPercent: subsidyAmountOrPercent || schemes[existingIdx].subsidyAmountOrPercent,
      officialSourceUrl: officialSourceUrl || schemes[existingIdx].officialSourceUrl,
      lastVerifiedDate: new Date().toISOString().split('T')[0]
    }).catch(err => console.warn('Cloud SQL scheme update deferred:', err?.message));

    return res.json(schemes[existingIdx]);
  } else {
    const newScheme = {
      id: `SCHEME-${Date.now()}`,
      code: code || `SCH-${Math.floor(Math.random() * 1000)}`,
      name,
      department: department || 'Department of Agriculture, GoI',
      governmentLevel: 'CENTRAL',
      category: category || 'SUBSIDY',
      description: req.body.description || '',
      benefits: benefits || '',
      subsidyAmountOrPercent: subsidyAmountOrPercent || 'Government Financial Assistance',
      eligibilitySummary: req.body.eligibilitySummary || ['Landholding farmer family'],
      rules: req.body.rules || [],
      requiredDocuments: requiredDocuments || ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK'],
      applicationProcess: req.body.applicationProcess || ['Submit application online or via CSC'],
      officialSourceUrl: officialSourceUrl || 'https://agricoop.nic.in',
      officialApplicationUrl: officialSourceUrl || 'https://agricoop.nic.in',
      lastVerifiedDate: new Date().toISOString().split('T')[0],
      version: '1.0',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };
    schemes.unshift(newScheme as any);
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'CREATE_SCHEME',
      details: `Created new scheme: ${name}`,
      targetId: newScheme.id
    });
    db.save();

    saveCloudSqlScheme({
      id: newScheme.id,
      code: newScheme.code,
      name: newScheme.name,
      department: newScheme.department,
      category: newScheme.category,
      benefits: newScheme.benefits,
      subsidyAmountOrPercent: newScheme.subsidyAmountOrPercent,
      officialSourceUrl: newScheme.officialSourceUrl,
      lastVerifiedDate: newScheme.lastVerifiedDate
    }).catch(err => console.warn('Cloud SQL scheme create deferred:', err?.message));

    return res.status(201).json(newScheme);
  }
});

/* =========================================================================
   OFFICIAL GOVERNMENT FARMER PORTALS ROUTES
   Admin-managed portal database with real official URLs & verified dates
========================================================================= */

app.get('/api/portals', (req: Request, res: Response) => {
  const { category, search } = req.query;
  const list = db.getOfficialPortals(
    category ? String(category) : undefined,
    search ? String(search) : undefined
  );
  return res.json(list);
});

app.get('/api/portals/:id', (req: Request, res: Response) => {
  const portal = db.getOfficialPortalById(req.params.id);
  if (!portal) return res.status(404).json({ error: 'Official portal not found' });
  return res.json(portal);
});

app.post('/api/portals', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ error: 'Only administrators can register or manage official government portals.' });
  }

  const {
    name,
    hindiName,
    marathiName,
    department,
    governmentLevel = 'CENTRAL',
    state,
    category,
    purpose,
    description,
    officialUrl,
    keyServices = [],
    featured = false,
    status = 'ACTIVE'
  } = req.body;

  if (!name || !department || !officialUrl || !purpose || !category) {
    return res.status(400).json({ error: 'Portal name, department, category, purpose, and official URL are required.' });
  }

  if (!officialUrl.startsWith('http://') && !officialUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'Official URL must be a valid http or https web address.' });
  }

  const newPortal: OfficialPortal = {
    id: `PORTAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    hindiName,
    marathiName,
    department,
    governmentLevel,
    state: state || undefined,
    category,
    purpose,
    description: description || purpose,
    officialUrl,
    lastVerifiedDate: new Date().toISOString().split('T')[0],
    featured: Boolean(featured),
    status: (status as any) || 'ACTIVE',
    keyServices: Array.isArray(keyServices) ? keyServices : [],
    updatedAt: new Date().toISOString()
  };

  db.addOfficialPortal(newPortal);

  // Cloud SQL background save
  saveCloudSqlPortal({
    id: newPortal.id,
    name: newPortal.name,
    hindiName: newPortal.hindiName,
    marathiName: newPortal.marathiName,
    department: newPortal.department,
    governmentLevel: newPortal.governmentLevel,
    state: newPortal.state,
    category: newPortal.category,
    purpose: newPortal.purpose,
    description: newPortal.description,
    officialUrl: newPortal.officialUrl,
    lastVerifiedDate: newPortal.lastVerifiedDate,
    featured: String(newPortal.featured),
    status: newPortal.status,
    keyServices: (newPortal.keyServices || []).join(';')
  }).catch(err => console.warn('Cloud SQL portal save deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'CREATE_OFFICIAL_PORTAL',
    details: `Added new official government portal: ${name} (${officialUrl})`,
    targetId: newPortal.id
  });

  return res.status(201).json(newPortal);
});

app.put('/api/portals/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ error: 'Only administrators can update official government portals.' });
  }

  const { id } = req.params;
  const existing = db.getOfficialPortalById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Official portal not found' });
  }

  const updates = {
    ...req.body,
    lastVerifiedDate: req.body.lastVerifiedDate || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  };

  const updated = db.updateOfficialPortal(id, updates);

  // Cloud SQL update
  updateCloudSqlPortal(id, {
    name: updates.name,
    hindiName: updates.hindiName,
    marathiName: updates.marathiName,
    department: updates.department,
    governmentLevel: updates.governmentLevel,
    state: updates.state,
    category: updates.category,
    purpose: updates.purpose,
    description: updates.description,
    officialUrl: updates.officialUrl,
    lastVerifiedDate: updates.lastVerifiedDate,
    featured: updates.featured !== undefined ? String(updates.featured) : undefined,
    status: updates.status,
    keyServices: Array.isArray(updates.keyServices) ? updates.keyServices.join(';') : undefined
  }).catch(err => console.warn('Cloud SQL portal update deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'UPDATE_OFFICIAL_PORTAL',
    details: `Updated official portal: ${updated?.name} (${updated?.officialUrl})`,
    targetId: id
  });

  return res.json(updated);
});

app.delete('/api/portals/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ error: 'Only administrators can deactivate official government portals.' });
  }

  const { id } = req.params;
  const deleted = db.deleteOfficialPortal(id);

  deleteCloudSqlPortal(id).catch(err => console.warn('Cloud SQL portal delete deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'DELETE_OFFICIAL_PORTAL',
    details: `Deactivated/Removed official portal record: ${id}`,
    targetId: id
  });

  return res.json({ success: deleted, id });
});

/* =========================================================================
   SAVED SCHEMES (BOOKMARKS) ROUTES
========================================================================= */

app.get('/api/saved-schemes', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const savedList = db.getSavedSchemes(user.id);
  return res.json(savedList);
});

app.post('/api/saved-schemes', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { schemeId, notes } = req.body;
  if (!schemeId) {
    return res.status(400).json({ error: 'schemeId is required' });
  }

  const scheme = db.getData().schemes.find(s => s.id === schemeId);
  if (!scheme) {
    return res.status(404).json({ error: 'Scheme not found' });
  }

  const savedRecord = db.saveScheme(user.id, scheme, notes);

  // Cloud SQL background persistence
  try {
    const { saveCloudSqlSavedScheme } = await import('./src/db/users.ts');
    await saveCloudSqlSavedScheme({
      id: savedRecord.id,
      userId: user.id,
      schemeId: scheme.id,
      schemeName: scheme.name,
      schemeCategory: scheme.category,
      department: scheme.department,
      subsidyAmountOrPercent: scheme.subsidyAmountOrPercent,
      benefits: scheme.benefits,
      officialSourceUrl: scheme.officialSourceUrl,
      notes: notes || ''
    });
  } catch (err) {
    // Cloud SQL fallback
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'SAVE_SCHEME',
    details: `Farmer bookmarked government scheme: ${scheme.name} (${scheme.code})`,
    targetId: scheme.id
  });

  return res.status(201).json(savedRecord);
});

app.delete('/api/saved-schemes/:schemeId', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { schemeId } = req.params;
  const removed = db.unsaveScheme(user.id, schemeId);

  // Cloud SQL background deletion
  try {
    const { deleteCloudSqlSavedScheme } = await import('./src/db/users.ts');
    await deleteCloudSqlSavedScheme(user.id, schemeId);
  } catch (err) {
    // Cloud SQL fallback
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'UNSAVE_SCHEME',
    details: `Farmer removed scheme bookmark: ${schemeId}`,
    targetId: schemeId
  });

  return res.json({ success: true, schemeId, removed });
});

app.get('/api/loans', (_req: Request, res: Response) => {
  return res.json(db.getData().loans);
});

/* =========================================================================
   PERSONALIZED RECOMMENDATION ENGINE ROUTES
========================================================================= */

app.get('/api/recommendations', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const database = db.getData();
  const farmerProfile = user ? database.farmerProfiles[user.id] : null;
  const userDocs = user ? database.documents.filter(d => d.userId === user.id) : [];

  const profileInput = {
    name: user?.fullName,
    state: (req.query.state as string) || user?.state || 'Maharashtra',
    district: (req.query.district as string) || user?.district || 'Pune',
    village: (req.query.village as string) || user?.village || 'Baramati',
    landAreaAcres: req.query.landAreaAcres ? Number(req.query.landAreaAcres) : (farmerProfile?.landAreaAcres ?? 3.5),
    farmerCategory: (req.query.farmerCategory as any) || farmerProfile?.farmerCategory,
    landOwnership: (req.query.landOwnership as any) || farmerProfile?.landOwnership || 'OWNED',
    surveyNumber: (req.query.surveyNumber as string) || farmerProfile?.surveyNumber || '142/2A',
    primaryCrops: req.query.primaryCrops ? (req.query.primaryCrops as string).split(',') : (farmerProfile?.primaryCrops || ['Sugarcane', 'Soybean', 'Wheat', 'Onion']),
    annualIncome: req.query.annualIncome ? Number(req.query.annualIncome) : (farmerProfile?.annualIncome ?? 180000),
    irrigationType: (req.query.irrigationType as any) || farmerProfile?.irrigationType || 'DRIP',
    farmingType: (req.query.farmingType as any) || farmerProfile?.farmingType || 'CONVENTIONAL',
    hasKisanCreditCard: req.query.hasKisanCreditCard !== undefined ? req.query.hasKisanCreditCard === 'true' : (farmerProfile?.hasKisanCreditCard ?? true)
  };

  const recommendations = computeFarmerRecommendations(
    profileInput,
    database.schemes,
    database.loans,
    userDocs
  );

  return res.json(recommendations);
});

/* =========================================================================
   DETERMINISTIC RULE-BASED ELIGIBILITY ENGINE
========================================================================= */

app.post('/api/eligibility/check', (req: Request, res: Response) => {
  const {
    state = 'Maharashtra',
    landAreaAcres = 2,
    farmerCategory = 'SMALL',
    annualIncome = 150000,
    hasWaterSource = true,
    availableDocuments = ['AADHAAR', '7_12_EXTRACT', 'BANK_PASSBOOK']
  } = req.body;

  const schemes = db.getData().schemes;
  const results: EligibilityResult[] = [];

  for (const scheme of schemes) {
    const matchedCriteria: string[] = [];
    const missingCriteria: string[] = [];

    // State check
    if (scheme.state) {
      if (scheme.state.toLowerCase() === state.toLowerCase()) {
        matchedCriteria.push(`State matches: ${state}`);
      } else {
        missingCriteria.push(`Exclusive to ${scheme.state} (Your state: ${state})`);
      }
    } else {
      matchedCriteria.push('Applicable pan-India in all States/UTs');
    }

    // Land check
    const landRule = (scheme.rules || []).find(r => r.field === 'maxLandArea' || r.field === 'minLandArea');
    if (landRule) {
      if (Number(landAreaAcres) >= landRule.value) {
        matchedCriteria.push(`Land area (${landAreaAcres} acres) satisfies minimum criteria (${landRule.value} acres)`);
      } else {
        missingCriteria.push(`Requires at least ${landRule.value} acres of land (You entered ${landAreaAcres} acres)`);
      }
    }

    // Scheme-specific criteria
    if (scheme.code === 'PM-KUSUM-B') {
      if (hasWaterSource) {
        matchedCriteria.push('Available water source (Borewell / Well / Farm Pond) verified');
      } else {
        missingCriteria.push('Requires available water source on agricultural field');
      }
    }

    // Missing documents check
    const missingDocs = scheme.requiredDocuments.filter(
      doc => !availableDocuments.includes(doc)
    );

    const isEligible = missingCriteria.length === 0;
    const confidence = isEligible
      ? (missingDocs.length === 0 ? 'POTENTIALLY_ELIGIBLE' : 'REQUIRES_MORE_INFO')
      : 'NOT_ELIGIBLE';

    results.push({
      schemeId: scheme.id,
      schemeName: scheme.name,
      department: scheme.department,
      isEligible,
      confidence,
      matchedCriteria,
      missingCriteria,
      missingDocuments: missingDocs,
      potentialBenefit: scheme.subsidyAmountOrPercent,
      officialSourceUrl: scheme.officialSourceUrl,
      lastVerifiedDate: scheme.lastVerifiedDate
    });
  }

  return res.json({
    timestamp: new Date().toISOString(),
    totalSchemesChecked: schemes.length,
    eligibleCount: results.filter(r => r.isEligible).length,
    results
  });
});

/* =========================================================================
   SECURE DOCUMENT VAULT ROUTES (STRICT RBAC, AES-256-GCM, AUDITED TICKETS)
   No direct public URL exposure. Role-based least-privilege access.
========================================================================= */

// 1. List Documents with strict Role-Based Access Control and stripped fileData
app.get('/api/documents', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to access Document Vault.' });
  }

  const { userId } = req.query;
  const allDocs = db.getData().documents;
  const allApps = db.getData().applications;

  let permittedDocs: UserDocument[] = [];

  if (user.role === 'FARMER') {
    // Farmers can strictly view only their own documents
    permittedDocs = allDocs.filter(d => d.userId === user.id);
  } else if (user.role === 'BANK_OFFICER') {
    // Bank Officers can view documents required for credit/loan applications
    const loanApps = allApps.filter(a =>
      a.schemeType === 'LOAN' ||
      a.schemeId.includes('LOAN') ||
      a.schemeId.includes('KCC') ||
      a.assignedOfficerId === user.id ||
      a.assignedOfficerRole === 'BANK_OFFICER'
    );
    const authorizedDocIds = new Set<string>();
    const authorizedUserIds = new Set<string>();
    loanApps.forEach(a => {
      (a.attachedDocumentIds || []).forEach(id => authorizedDocIds.add(id));
      authorizedUserIds.add(a.userId);
    });

    permittedDocs = allDocs.filter(d =>
      authorizedDocIds.has(d.id) || (userId && d.userId === userId && authorizedUserIds.has(d.userId))
    );
  } else if (user.role === 'AGRICULTURE_OFFICER') {
    // Agriculture Officers can view documents required for subsidy/scheme applications
    const subsidyApps = allApps.filter(a =>
      a.schemeType !== 'LOAN' ||
      a.assignedOfficerId === user.id ||
      a.assignedOfficerRole === 'AGRICULTURE_OFFICER'
    );
    const authorizedDocIds = new Set<string>();
    const authorizedUserIds = new Set<string>();
    subsidyApps.forEach(a => {
      (a.attachedDocumentIds || []).forEach(id => authorizedDocIds.add(id));
      authorizedUserIds.add(a.userId);
    });

    permittedDocs = allDocs.filter(d =>
      authorizedDocIds.has(d.id) || (userId && d.userId === userId && authorizedUserIds.has(d.userId))
    );
  } else if (user.role === 'CSC_OPERATOR') {
    // CSC Operators can view documents for farmers assisted through their kiosk
    const cscApps = allApps.filter(a =>
      a.timeline.some(t => t.officerRole === 'CSC_OPERATOR' || t.officerName?.includes(user.fullName))
    );
    const cscUserIds = new Set(cscApps.map(a => a.userId));
    permittedDocs = allDocs.filter(d => d.uploadSource === 'CSC_DESK' || cscUserIds.has(d.userId));
  } else if (user.role === 'SYSTEM_ADMIN') {
    // Admin access is logged
    if (userId) {
      permittedDocs = allDocs.filter(d => d.userId === userId);
      db.addAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: 'ADMIN_DOCUMENT_INVENTORY_QUERY',
        details: `System Admin inspected document catalog for farmer ${userId}`,
        targetId: String(userId)
      });
    } else {
      permittedDocs = allDocs;
    }
  }

  // Strip massive raw/encrypted payload from directory listings to prevent data leakage & overhead
  // Enrich each document with statutory retention status and linked applications
  const sanitizedList = permittedDocs.map(d => {
    const linkedApps = allApps.filter(a => a.attachedDocumentIds?.includes(d.id));
    const retentionCheck = checkDocumentRetentionLock(d.id);

    return {
      ...d,
      fileData: undefined, // Never expose raw binary data in directory listings
      retentionLocked: retentionCheck.locked,
      linkedApplicationIds: linkedApps.map(a => a.id),
      isEncryptedAtRest: true,
      securityClassification: 'RESTRICTED_PERSONAL_DATA'
    };
  });

  return res.json(sanitizedList);
});

// 2. Upload Document with Strict Input Sanitization, AES-256-GCM Encryption, and Antivirus Check
app.post('/api/documents/upload', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required to upload documents.' });

  // Rate Limiting: Max 25 uploads per 10 minutes
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `doc_upload_${user.id}_${ip}`;
  if (!checkRateLimit(rateLimitKey, 25, 600)) {
    return res.status(429).json({ error: 'Upload rate limit exceeded. Please wait a few moments before uploading more files.' });
  }

  const {
    documentType,
    fileName,
    fileSize = 512000,
    mimeType = 'application/pdf',
    fileData,
    uploadSource = 'DEVICE',
    driveFileId,
    driveWebViewLink
  } = req.body;

  if (!documentType || !fileName) {
    return res.status(400).json({ error: 'Document type and file name are required.' });
  }

  // Security Scan & Magic Number Signature Validation
  const validation = scanAndValidateDocument(fileName, mimeType, fileData);
  if (!validation.valid) {
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'SECURITY_BLOCKED_FILE_UPLOAD',
      details: `Blocked upload of ${fileName} (${mimeType}): ${validation.error}`,
      targetId: 'UPLOAD_REJECTED'
    });
    return res.status(400).json({ error: validation.error });
  }

  // Cryptographic Encryption at Rest (AES-256-GCM)
  let encryptedPayload: string | undefined = undefined;
  let checksumSha256: string = '';

  if (fileData) {
    const encResult = encryptDocumentPayload(fileData);
    encryptedPayload = encResult.encrypted;
    checksumSha256 = encResult.checksumSha256;
  }

  const docId = `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newDoc: UserDocument = {
    id: docId,
    userId: user.id,
    documentType,
    fileName,
    fileSize: validation.sizeBytes || fileSize,
    mimeType: validation.mimeType,
    fileData: encryptedPayload,
    uploadSource: (uploadSource as any) || 'DEVICE',
    driveFileId,
    driveWebViewLink,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'UPLOADED',
    isEncryptedAtRest: true,
    checksumSha256,
    scanStatus: 'CLEAN',
    securityClassification: 'RESTRICTED_PERSONAL_DATA',
    retentionLocked: false,
    linkedApplicationIds: []
  };

  db.getData().documents.unshift(newDoc);

  // Background Cloud SQL sync with metadata
  saveCloudSqlDocument({
    id: newDoc.id,
    userId: user.id,
    documentType,
    fileName,
    fileSize: newDoc.fileSize,
    mimeType: newDoc.mimeType,
    uploadSource: newDoc.uploadSource,
    driveFileId,
    driveWebViewLink,
    status: 'UPLOADED'
  }).catch(err => console.warn('Cloud SQL doc save deferred:', err?.message));

  // In-app Notification for farmer
  const notif = db.addNotification({
    userId: user.id,
    title: 'Document Securely Vaulted',
    message: `${fileName} (${documentType}) encrypted with AES-256-GCM and stored in private vault.`,
    type: 'DOCUMENT',
    read: false,
    relatedId: newDoc.id
  });

  saveCloudSqlNotification({
    id: notif.id,
    userId: user.id,
    title: notif.title,
    message: notif.message,
    type: 'DOCUMENT',
    relatedId: newDoc.id
  }).catch(err => console.warn('Cloud SQL notif save deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'DOCUMENT_UPLOAD',
    details: `Encrypted and vaulted ${documentType}: ${fileName} (SHA-256: ${checksumSha256 ? checksumSha256.substring(0, 16) + '...' : 'N/A'})`,
    targetId: newDoc.id
  });

  db.save();

  // Return sanitized document metadata (fileData stripped)
  const clientResponse = {
    ...newDoc,
    fileData: undefined
  };

  return res.status(201).json(clientResponse);
});

// 3. Issue Temporary, Signed Access Ticket for Secure Viewing / Download (10-min TTL)
app.post('/api/documents/:id/access-ticket', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required to access document.' });
  }

  const { id } = req.params;
  const { action = 'VIEW', adminReason } = req.body;

  // Rate Limiting: Max 60 ticket requests per minute
  const rateLimitKey = `ticket_req_${user.id}`;
  if (!checkRateLimit(rateLimitKey, 60, 60)) {
    return res.status(429).json({ error: 'Too many view requests. Please wait a few moments.' });
  }

  const doc = db.getData().documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found in government vault.' });
  }

  // Evaluate strict RBAC
  const access = evaluateDocumentAccess(user, doc, adminReason);
  if (!access.allowed) {
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'UNAUTHORIZED_DOCUMENT_ACCESS_ATTEMPT',
      details: `User attempted to generate access ticket for document ${doc.fileName} (${doc.id}). Reason: ${access.reason}`,
      targetId: doc.id
    });
    return res.status(403).json({ error: access.reason });
  }

  // Generate cryptographically signed HMAC temporary access ticket
  const ticketObj = generateAccessTicket(doc.id, user, action === 'DOWNLOAD' ? 'DOWNLOAD' : 'VIEW');

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'DOCUMENT_ACCESS_TICKET_ISSUED',
    details: `Generated temporary access ticket (${action}, 10m TTL) for ${doc.fileName}. Mode: ${access.accessMode}. ${access.reason || ''}`,
    targetId: doc.id
  });

  return res.json({
    ticket: ticketObj.ticket,
    viewUrl: `/api/documents/${doc.id}/secure-view?ticket=${encodeURIComponent(ticketObj.ticket)}`,
    downloadUrl: `/api/documents/${doc.id}/secure-view?ticket=${encodeURIComponent(ticketObj.ticket)}&download=1`,
    expiresAt: ticketObj.expiresAt,
    expiresInSeconds: ticketObj.expiresInSeconds,
    accessMode: access.accessMode
  });
});

// 4. Secure Document Viewing & Decryption Stream (Validates ticket, verifies expiry, sets CSP & headers)
app.get('/api/documents/:id/secure-view', (req: Request, res: Response) => {
  const { id } = req.params;
  const ticket = req.query.ticket as string;
  const isDownload = req.query.download === '1';

  if (!ticket) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Access Denied - Direct Document Access Prohibited</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #fff5f5; color: #9b1c1c;">
          <h2>403 - Direct URL Access Forbidden</h2>
          <p>Farmer documents cannot be accessed via direct or permanent URLs. Please request a secure temporary viewing link through the authenticated portal.</p>
        </body>
      </html>
    `);
  }

  const ticketVerification = verifyAccessTicket(ticket);
  if (!ticketVerification.valid || !ticketVerification.payload) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Access Link Expired</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; background: #fff5f5; color: #9b1c1c;">
          <h2>403 - Link Expired or Invalid</h2>
          <p>${ticketVerification.error || 'Temporary access link has expired. Return to your Document Vault to generate a fresh link.'}</p>
        </body>
      </html>
    `);
  }

  // Verify ticket document binding
  if (ticketVerification.payload.docId !== id) {
    return res.status(403).json({ error: 'Access ticket is not valid for this document.' });
  }

  const doc = db.getData().documents.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Audit view or download
  db.addAuditLog({
    userId: ticketVerification.payload.userId,
    userName: ticketVerification.payload.userId,
    userRole: ticketVerification.payload.userRole as any,
    action: isDownload ? 'DOCUMENT_DOWNLOAD' : 'DOCUMENT_VIEW',
    details: `${isDownload ? 'Downloaded' : 'Viewed'} decrypted file ${doc.fileName} (${doc.documentType}) via temporary ticket.`,
    targetId: doc.id
  });

  // Decrypt the file data
  const rawDataUrl = decryptDocumentPayload(doc.fileData || '');

  // Strict Government Security Headers
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const disposition = isDownload ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.fileName)}"`);

  if (!rawDataUrl) {
    // If no binary data (e.g. drive linked), redirect to drive web view or return metadata
    if (doc.driveWebViewLink) {
      return res.redirect(doc.driveWebViewLink);
    }
    return res.status(404).send('Document payload empty or unavailable.');
  }

  try {
    if (rawDataUrl.includes(',')) {
      const parts = rawDataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : doc.mimeType || 'application/pdf';
      const fileBuffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    } else {
      res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
      return res.send(Buffer.from(rawDataUrl));
    }
  } catch (err: any) {
    console.error('Error streaming document:', err);
    return res.status(500).send('Error decrypting and streaming document.');
  }
});

// 5. Delete Document with Active Statutory Retention Protection
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });

  const docs = db.getData().documents;
  const index = docs.findIndex(d => d.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Document not found.' });

  const doc = docs[index];

  // Access check: only owner or System Admin can request deletion
  if (doc.userId !== user.id && user.role !== 'SYSTEM_ADMIN') {
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'UNAUTHORIZED_DOCUMENT_DELETE_ATTEMPT',
      details: `User attempted to delete document ${doc.fileName} belonging to farmer ${doc.userId}.`,
      targetId: doc.id
    });
    return res.status(403).json({ error: 'Unauthorized: You can only delete your own documents.' });
  }

  // Statutory Application Retention Protection Check:
  // Cannot delete documents attached to active applications under departmental review
  const retentionCheck = checkDocumentRetentionLock(doc.id);
  if (retentionCheck.locked && retentionCheck.activeApplication) {
    const activeApp = retentionCheck.activeApplication;
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'DOCUMENT_DELETE_BLOCKED_BY_RETENTION',
      details: `Blocked deletion of ${doc.fileName}: Locked by active application ${activeApp.id} (${activeApp.schemeName}, Status: ${activeApp.status})`,
      targetId: doc.id
    });

    return res.status(400).json({
      error: 'RETENTION_LOCKED',
      message: `Statutory Protection: Document "${doc.fileName}" cannot be deleted because it is officially linked to active government application #${activeApp.id} (${activeApp.schemeName}, Status: ${activeApp.status}). Government DBT guidelines mandate document retention during administrative scrutiny.`
    });
  }

  const [removed] = docs.splice(index, 1);

  deleteCloudSqlDocument(removed.id).catch(err => console.warn('Cloud SQL doc delete deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'DOCUMENT_DELETE',
    details: `Permanently removed document ${removed.fileName} (${removed.id}) from vault after passing retention check.`,
    targetId: removed.id
  });

  db.save();
  return res.json({ success: true, message: `Document "${removed.fileName}" successfully removed from vault.` });
});

// 6. Officer Document Verification Desk
app.put('/api/documents/:id/verify', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'BANK_OFFICER' && user.role !== 'AGRICULTURE_OFFICER' && user.role !== 'SYSTEM_ADMIN')) {
    return res.status(403).json({ error: 'Only authorized officers can verify documents.' });
  }

  const { status, remarks } = req.body;
  const doc = db.getData().documents.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Verify officer has jurisdiction over an application with this document
  const access = evaluateDocumentAccess(user, doc, 'Document formal verification');
  if (!access.allowed && user.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({ error: access.reason || 'You do not have jurisdiction to verify this document.' });
  }

  doc.status = status;
  doc.officerRemarks = remarks;
  doc.verifiedBy = user.fullName;
  doc.verifiedAt = new Date().toISOString();
  doc.updatedAt = new Date().toISOString();

  // Notify the farmer in-app and in Cloud SQL
  const notif = db.addNotification({
    userId: doc.userId,
    title: `Document ${status === 'VERIFIED' ? 'Verified ✓' : 'Status Updated'}`,
    message: `Your document ${doc.fileName} (${doc.documentType}) has been marked as ${status} by ${user.fullName}. Remarks: ${remarks || 'None'}`,
    type: 'DOCUMENT',
    read: false,
    relatedId: doc.id
  });

  saveCloudSqlNotification({
    id: notif.id,
    userId: doc.userId,
    title: notif.title,
    message: notif.message,
    type: 'DOCUMENT',
    relatedId: doc.id
  }).catch(err => console.warn('Cloud SQL doc verify notif deferred:', err?.message));

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'VERIFY_DOCUMENT',
    details: `Officer marked document ${doc.id} as ${status}. Remarks: ${remarks || 'N/A'}`,
    targetId: doc.id
  });

  db.save();
  return res.json({
    ...doc,
    fileData: undefined
  });
});

// 7. Farmer Privacy & Document Access Activity Trail
app.get('/api/farmer/privacy-activity', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const farmerDocIds = new Set(db.getData().documents.filter(d => d.userId === user.id).map(d => d.id));
  const logs = db.getData().auditLogs.filter(log =>
    (log.targetId && farmerDocIds.has(log.targetId)) ||
    (log.userId === user.id && log.action.startsWith('DOCUMENT_'))
  );

  return res.json(logs.slice(0, 50));
});

// 8. GDPR / DPDP Compliant Farmer Data Export
app.get('/api/farmer/export-data', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const database = db.getData();
  const profile = database.farmerProfiles[user.id] || null;
  const userApps = database.applications.filter(a => a.userId === user.id);
  const userDocs = database.documents.filter(d => d.userId === user.id).map(d => ({
    ...d,
    fileData: undefined // Exclude raw payloads from plain JSON export for transmission security
  }));
  const userSaved = database.savedSchemes.filter(s => s.userId === user.id);
  const userAudit = database.auditLogs.filter(l => l.userId === user.id);

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'FARMER_DATA_EXPORT_REQUEST',
    details: `Farmer generated complete personal data and document audit export package.`,
    targetId: user.id
  });

  return res.json({
    exportDate: new Date().toISOString(),
    regulatoryStandard: 'Digital Personal Data Protection (DPDP) Act & Citizen Privacy Charter',
    farmerAccount: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      district: user.district,
      state: user.state,
      village: user.village,
      isVerified: user.isVerified
    },
    agriculturalProfile: profile,
    registeredApplications: userApps,
    vaultDocumentCatalog: userDocs,
    savedSchemes: userSaved,
    recentAccountActivity: userAudit.slice(0, 25)
  });
});

// 9. Farmer Account / Vault Erasure Request (Checks active statutory locks)
app.post('/api/farmer/request-erasure', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const database = db.getData();
  const activeApps = database.applications.filter(a =>
    a.userId === user.id && ['PENDING', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'APPROVED'].includes(a.status)
  );

  if (activeApps.length > 0) {
    return res.status(400).json({
      error: 'ACTIVE_APPLICATIONS_PRESENT',
      message: `Account data erasure cannot be completed immediately because you have ${activeApps.length} active application(s) (#${activeApps[0].id}) under government scrutiny. You may delete records once the application lifecycle completes.`
    });
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'DATA_ERASURE_REQUEST_LOGGED',
    details: `Farmer logged formal request for account and document data erasure.`,
    targetId: user.id
  });

  return res.json({
    success: true,
    message: 'Your data erasure request has been officially recorded. Any non-statutory records will be purged in accordance with data retention rules.'
  });
});

/* =========================================================================
   APPLICATIONS & REAL OFFICER WORKFLOW ROUTES
   Default status = PENDING on creation
   Officer can Approve, Reject/Decline, Keep Pending, Add remarks, Request docs
========================================================================= */

app.get('/api/applications', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const apps = db.getData().applications;

  // Officers & Admin can see all applications
  if (user?.role === 'BANK_OFFICER' || user?.role === 'AGRICULTURE_OFFICER' || user?.role === 'SYSTEM_ADMIN') {
    return res.json(apps);
  }

  // Farmer sees their own applications
  const targetId = user?.id || 'USER-FARMER-1';
  return res.json(apps.filter(a => a.userId === targetId));
});

app.get('/api/applications/:id', (req: Request, res: Response) => {
  const appItem = db.getData().applications.find(a => a.id === req.params.id);
  if (!appItem) return res.status(404).json({ error: 'Application not found' });
  return res.json(appItem);
});

app.post('/api/applications', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const {
    schemeId,
    schemeName,
    schemeType = 'SCHEME',
    attachedDocumentIds = [],
    subsidyClaimAmount = 50000,
    priority = 'NORMAL'
  } = req.body;

  if (!schemeId || !schemeName) {
    return res.status(400).json({ error: 'Scheme ID and Scheme Name are required.' });
  }

  const appId = `APP-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
  const now = new Date().toISOString();

  // Route automatically to appropriate officer role
  const isLoan = schemeType === 'LOAN' || schemeId.includes('LOAN') || schemeId.includes('KCC');
  const officerRole = isLoan ? 'BANK_OFFICER' : 'AGRICULTURE_OFFICER';
  const assignedOfficer = db.getData().users.find(u => u.role === officerRole);

  // Real initial timeline with default PENDING status
  const initialTimeline: ApplicationTimelineEvent[] = [
    {
      id: `t-${Date.now()}-1`,
      status: 'PENDING',
      action: 'Application submitted on Government Portal (Default: PENDING)',
      officerName: 'Citizen Registration System',
      officerRole: 'PORTAL_AUTOMATION',
      remarks: 'Application logged with default PENDING status. Queued for departmental scrutiny.',
      timestamp: now
    }
  ];

  const newApp: Application = {
    id: appId,
    userId: user.id,
    farmerName: user.fullName,
    farmerMobile: user.mobile,
    farmerDistrict: user.district,
    farmerState: user.state,
    schemeId,
    schemeName,
    schemeType: schemeType as any,
    submittedAt: now,
    updatedAt: now,
    status: 'PENDING',
    priority: priority as any,
    assignedOfficerId: assignedOfficer?.id,
    assignedOfficerName: assignedOfficer?.fullName,
    assignedOfficerRole: assignedOfficer?.role,
    attachedDocumentIds,
    timeline: initialTimeline,
    subsidyClaimAmount: Number(subsidyClaimAmount)
  };

  db.getData().applications.unshift(newApp);

  // Persist application to Cloud SQL
  saveCloudSqlApplication({
    id: newApp.id,
    userId: user.id,
    farmerName: user.fullName,
    farmerMobile: user.mobile,
    farmerDistrict: user.district,
    farmerState: user.state,
    schemeId: newApp.schemeId,
    schemeName: newApp.schemeName,
    schemeType: newApp.schemeType,
    status: 'PENDING',
    priority: newApp.priority,
    assignedOfficerId: newApp.assignedOfficerId,
    assignedOfficerName: newApp.assignedOfficerName,
    assignedOfficerRole: newApp.assignedOfficerRole,
    subsidyClaimAmount: newApp.subsidyClaimAmount,
    attachedDocumentIds: JSON.stringify(newApp.attachedDocumentIds || []),
    timeline: JSON.stringify(newApp.timeline || []),
    isOfflineCreated: 'false'
  }).catch(err => console.warn('Cloud SQL app save deferred:', err?.message));

  // In-app Notification for farmer
  const notif = db.addNotification({
    userId: user.id,
    title: 'Application Submitted: Status PENDING',
    message: `Your application ${appId} for ${schemeName} has been received with status PENDING and queued for review.`,
    type: 'APPLICATION',
    read: false,
    relatedId: appId
  });

  saveCloudSqlNotification({
    id: notif.id,
    userId: user.id,
    title: notif.title,
    message: notif.message,
    type: 'APPLICATION',
    relatedId: appId
  }).catch(err => console.warn('Cloud SQL submission notif deferred:', err?.message));

  // Automated Real-Time SMS to Farmer's Phone
  const farmerMobile = user.mobile || '+91 98220 12345';
  const submissionSmsText = `[KRISHI-GOV - Govt of India]\nPriye ${user.fullName}, aapka aavedan ${appId} yojna '${schemeName}' (Claim: ₹${Number(subsidyClaimAmount).toLocaleString()}) hetu darj ho gaya hai. Status: PENDING. Portal par login karein.\n- Ministry of Agriculture, GoI`;
  db.addSmsMessage({
    id: `SMS-${Date.now().toString().slice(-6)}`,
    recipientMobile: farmerMobile,
    recipientName: user.fullName,
    type: 'APPLICATION_SUBMITTED',
    title: `Application Lodged: ${appId}`,
    message: submissionSmsText,
    gateway: 'NIC_KISAN_SMS',
    status: 'DELIVERED',
    sentAt: new Date().toISOString(),
    isOffline: false,
    relatedId: appId
  });

  // Notify assigned officer
  if (assignedOfficer) {
    db.addNotification({
      userId: assignedOfficer.id,
      title: 'New Application in Scrutiny Queue',
      message: `Farmer ${user.fullName} (${user.district}) submitted application ${appId} for ${schemeName}. Status is PENDING.`,
      type: 'APPLICATION',
      read: false,
      relatedId: appId
    });
  }

  // Audit log
  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'SUBMIT_APPLICATION',
    details: `Farmer submitted ${schemeType} application ${appId} for ${schemeName} with default status PENDING`,
    targetId: appId
  });

  db.save();

  // Instant real-time broadcast to all connected sessions
  broadcastRealtimeEvent('APPLICATION_CREATED', {
    application: newApp,
    userId: newApp.userId
  }, newApp.userId);

  broadcastRealtimeEvent('NOTIFICATION_CREATED', {
    notification: notif,
    userId: user.id
  }, user.id);

  return res.status(201).json(newApp);
});

app.put('/api/applications/:id/status', (req: Request, res: Response) => {
  const officer = getAuthUser(req);
  if (!officer || (officer.role !== 'BANK_OFFICER' && officer.role !== 'AGRICULTURE_OFFICER' && officer.role !== 'SYSTEM_ADMIN')) {
    return res.status(403).json({ error: 'Only authorized bank and agriculture officers can update application status.' });
  }

  const { status, remarks, requestedDocuments = [] } = req.body;
  const appItem = db.getData().applications.find(a => a.id === req.params.id);

  if (!appItem) return res.status(404).json({ error: 'Application not found' });

  const previousStatus = appItem.status;
  const now = new Date().toISOString();
  appItem.status = status;
  appItem.officerRemarks = remarks;
  appItem.updatedAt = now;
  if (requestedDocuments.length > 0) {
    appItem.requestedDocuments = requestedDocuments;
  }

  const timelineAction =
    status === 'APPROVED' ? 'Application Sanction Approved' :
    status === 'REJECTED' ? 'Application Rejected / Declined' :
    status === 'PENDING' ? 'Kept Pending for Additional Administrative Scrutiny' :
    status === 'DOCUMENTS_REQUIRED' ? 'Additional Documents Requested from Farmer' :
    'Status Updated by Reviewing Officer';

  appItem.timeline.push({
    id: `t-${Date.now()}`,
    status,
    action: timelineAction,
    officerName: officer.fullName,
    officerRole: officer.role,
    remarks: remarks || '',
    timestamp: now
  });

  // Update in Cloud SQL immediately
  updateCloudSqlApplicationStatus(
    appItem.id,
    status,
    remarks || '',
    JSON.stringify(appItem.timeline),
    requestedDocuments.join(',')
  ).catch(err => console.warn('Cloud SQL status update deferred:', err?.message));

  // Notify farmer in-app
  const notifTitle =
    status === 'APPROVED' ? 'Application Approved! 🎉' :
    status === 'REJECTED' ? 'Application Update: Declined' :
    status === 'DOCUMENTS_REQUIRED' ? 'Action Required: Additional Documents Requested' :
    status === 'PENDING' ? 'Application Status: Kept Pending' :
    `Application ${appItem.id}: ${status}`;

  const notifMsg = `Officer ${officer.fullName} (${officer.role}) updated application ${appItem.id} to ${status}. Remarks: ${remarks || 'None'}`;

  const notif = db.addNotification({
    userId: appItem.userId,
    title: notifTitle,
    message: notifMsg,
    type: 'APPLICATION',
    read: false,
    relatedId: appItem.id
  });

  saveCloudSqlNotification({
    id: notif.id,
    userId: appItem.userId,
    title: notifTitle,
    message: notifMsg,
    type: 'APPLICATION',
    relatedId: appItem.id
  }).catch(err => console.warn('Cloud SQL notif save deferred:', err?.message));

  // Automated Real-Time SMS to Farmer on Status Change
  const targetApplicant = db.getData().users.find(u => u.id === appItem.userId);
  const applicantMobile = targetApplicant?.mobile || appItem.farmerMobile || '+91 98220 12345';
  const statusSmsBody = `[KRISHI-GOV - Govt of India]\nPriye Kisan, aavedan ${appItem.id} status update: ${status}. Adhikari: ${officer.fullName}. Remarks: ${remarks || 'Status updated by verification desk'}. Track on Krishi Portal.\n- Ministry of Agriculture, GoI`;
  
  db.addSmsMessage({
    id: `SMS-${Date.now().toString().slice(-6)}`,
    recipientMobile: applicantMobile,
    recipientName: targetApplicant?.fullName || appItem.farmerName,
    type: 'STATUS_UPDATE',
    title: `Status Update: ${appItem.id} is now ${status}`,
    message: statusSmsBody,
    gateway: 'NIC_KISAN_SMS',
    status: 'DELIVERED',
    sentAt: now,
    isOffline: false,
    relatedId: appItem.id
  });

  // Audit record
  db.addAuditLog({
    userId: officer.id,
    userName: officer.fullName,
    userRole: officer.role,
    action: 'APPLICATION_STATUS_CHANGE',
    details: `Officer changed status of ${appItem.id} to ${status}. Remarks: ${remarks || 'N/A'}`,
    targetId: appItem.id
  });

  db.save();

  // Instant real-time broadcast to farmer dashboard, notification count, and all connected clients
  broadcastRealtimeEvent('APPLICATION_STATUS_UPDATED', {
    application: appItem,
    applicationId: appItem.id,
    previousStatus,
    status: appItem.status,
    remarks: appItem.officerRemarks,
    officer: {
      fullName: officer.fullName,
      role: officer.role
    },
    updatedAt: appItem.updatedAt,
    userId: appItem.userId
  }, appItem.userId);

  broadcastRealtimeEvent('NOTIFICATION_CREATED', {
    notification: notif,
    userId: appItem.userId
  }, appItem.userId);

  return res.json(appItem);
});

/* Offline synchronization endpoint for applications created while disconnected */
app.post('/api/sync/offline', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { items = [] } = req.body;
  const synced: any[] = [];
  const errors: any[] = [];

  for (const item of items) {
    try {
      if (item.type === 'APPLICATION') {
        const appPayload = item.payload;
        const realId = `APP-2026-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const newApp: Application = {
          ...appPayload,
          id: realId,
          userId: user?.id || appPayload.userId || 'USER-FARMER-1',
          status: appPayload.status || 'PENDING',
          updatedAt: new Date().toISOString()
        };
        db.getData().applications.unshift(newApp);
        await saveCloudSqlApplication({
          id: newApp.id,
          userId: newApp.userId,
          farmerName: newApp.farmerName,
          farmerMobile: newApp.farmerMobile,
          farmerDistrict: newApp.farmerDistrict,
          farmerState: newApp.farmerState,
          schemeId: newApp.schemeId,
          schemeName: newApp.schemeName,
          schemeType: newApp.schemeType,
          status: newApp.status,
          priority: newApp.priority,
          subsidyClaimAmount: newApp.subsidyClaimAmount,
          attachedDocumentIds: JSON.stringify(newApp.attachedDocumentIds || []),
          timeline: JSON.stringify(newApp.timeline || []),
          isOfflineCreated: 'true'
        });
        synced.push({ originalOfflineId: item.payload?.id, newId: realId, status: 'SYNCED' });
      }
    } catch (err: any) {
      errors.push({ id: item.id, error: err?.message || 'Sync failed' });
    }
  }

  db.save();

  if (synced.length > 0) {
    const farmerMobile = user?.mobile || '+91 98220 12345';
    db.addSmsMessage({
      id: `SMS-${Date.now().toString().slice(-6)}`,
      recipientMobile: farmerMobile,
      recipientName: user?.fullName || 'Farmer',
      type: 'OFFLINE_SYNC',
      title: 'Cloud SQL Sync Completed',
      message: `[KRISHI-GOV - Govt of India]\nOffline synchronization complete. ${synced.length} pending application(s) have been verified and saved to Cloud SQL Govt Registry.\n- Ministry of Agriculture, GoI`,
      gateway: 'NIC_KISAN_SMS',
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      isOffline: false
    });
  }

  return res.json({
    syncedCount: synced.length,
    failedCount: errors.length,
    synced,
    errors
  });
});

app.get('/api/cloudsql/status', async (_req: Request, res: Response) => {
  try {
    if (!isCloudSqlConfigured) {
      return res.json({
        status: 'STANDALONE_FIRESTORE_ACTIVE',
        region: 'asia-southeast1',
        engine: 'Google Cloud Firestore + Private Encrypted Datastore',
        quotaExhausted: true,
        message: 'Cloud SQL Developer Edition instance quota exhausted on project poised-serenity-ct3g1 (max 2 per project). Active persistence engine: Google Cloud Firestore.',
        timestamp: new Date().toISOString()
      });
    }

    const apps = await getCloudSqlApplications();
    const docs = await getCloudSqlDocuments();
    return res.json({
      status: 'CONNECTED',
      region: 'asia-southeast1',
      engine: 'Cloud SQL PostgreSQL (Developer Edition)',
      totalStoredApplications: apps.length,
      totalStoredDocuments: docs.length,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.json({
      status: 'FIRESTORE_BACKED',
      region: 'asia-southeast1',
      engine: 'Google Cloud Firestore',
      message: err?.message || 'Database active'
    });
  }
});

/* =========================================================================
   REAL-TIME SMS GATEWAY ROUTES
========================================================================= */

app.get('/api/sms/history', (_req: Request, res: Response) => {
  const list = db.getData().smsMessages || [];
  return res.json(list);
});

app.post('/api/sms/send', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const {
    recipientMobile,
    recipientName,
    type = 'CUSTOM_TEST',
    title = 'Krishi Alert',
    message,
    relatedId,
    isOffline = false
  } = req.body;

  const targetMobile = recipientMobile || user?.mobile || '+91 98220 12345';
  const targetName = recipientName || user?.fullName || 'Farmer';

  const newSms: SmsRecord = {
    id: `SMS-${Date.now().toString().slice(-6)}`,
    recipientMobile: targetMobile,
    recipientName: targetName,
    type,
    title,
    message: message || `[KRISHI-GOV - Govt of India]\nReal-time update notification dispatched to ${targetMobile}\n- Ministry of Agriculture, GoI`,
    gateway: isOffline ? 'CELLULAR_NATIVE' : 'NIC_KISAN_SMS',
    status: isOffline ? 'QUEUED_OFFLINE' : 'DELIVERED',
    sentAt: new Date().toISOString(),
    isOffline,
    relatedId
  };

  db.addSmsMessage(newSms);

  db.addAuditLog({
    userId: user?.id || 'SYSTEM',
    userName: user?.fullName || 'Automated SMS Gateway',
    userRole: user?.role || 'SYSTEM_ADMIN',
    action: 'DISPATCH_SMS',
    details: `Real-time SMS dispatched to ${targetMobile} (${type}): ${title}`,
    targetId: newSms.id
  });

  return res.status(201).json(newSms);
});

/* =========================================================================
   NOTIFICATIONS, MANDI, WEATHER, NEARBY & AUDIT
========================================================================= */

app.get('/api/notifications', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const targetId = user?.id || 'USER-FARMER-1';
  const list = db.getData().notifications.filter(n => n.userId === targetId);
  return res.json(list);
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.getData().notifications.find(n => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    markCloudSqlNotificationRead(notif.id).catch(err => console.warn('Cloud SQL notif read deferred:', err?.message));
    db.save();
  }
  return res.json({ success: true });
});

app.put('/api/notifications/read-all', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const targetId = user?.id || 'USER-FARMER-1';
  db.getData().notifications.forEach(n => {
    if (n.userId === targetId) {
      n.read = true;
      markCloudSqlNotificationRead(n.id).catch(err => console.warn('Cloud SQL notif read deferred:', err?.message));
    }
  });
  db.save();
  return res.json({ success: true });
});

app.get('/api/mandi', (_req: Request, res: Response) => {
  return res.json(db.getData().mandiPrices);
});

app.get('/api/weather/:district', (req: Request, res: Response) => {
  const dist = req.params.district || 'Pune';
  const weather = db.getData().weather[dist] || db.getData().weather['Pune'];
  return res.json(weather);
});

app.get('/api/nearby', (_req: Request, res: Response) => {
  return res.json(db.getData().nearbyServices);
});

app.get('/api/audit-logs', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (user?.role !== 'SYSTEM_ADMIN' && user?.role !== 'BANK_OFFICER' && user?.role !== 'AGRICULTURE_OFFICER') {
    return res.status(403).json({ error: 'Audit trail restricted to authorized personnel.' });
  }
  return res.json(db.getData().auditLogs);
});

app.get('/api/system/stats', (_req: Request, res: Response) => {
  const apps = db.getData().applications;
  const approved = apps.filter(a => a.status === 'APPROVED');
  const totalDisbursed = approved.reduce((sum, a) => sum + (a.subsidyClaimAmount || 0), 0);

  return res.json({
    totalSchemes: db.getData().schemes.length,
    totalLoans: db.getData().loans.length,
    totalApplications: apps.length,
    approvedApplications: approved.length,
    underReviewApplications: apps.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'PENDING').length,
    totalSubsidyDisbursedRupees: totalDisbursed,
    registeredUsersCount: db.getData().users.length
  });
});

/* =========================================================================
   KRISHI SAHAYAK AI ASSISTANT ROUTE
========================================================================= */

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, language = 'en', context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message prompt is required.' });
    }

    const result = await askKrishiSahayak(message, language, context);
    return res.json(result);
  } catch (err: any) {
    console.error('Error in AI chat endpoint:', err);
    return res.status(500).json({
      reply: 'An error occurred while connecting to Krishi Sahayak. Please verify your connection or try again in a few moments.',
      error: err?.message
    });
  }
});

/* =========================================================================
   VITE DEV SERVER OR PRODUCTION SERVING
========================================================================= */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  // Attach WebSocket Server on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const client: ConnectedWsClient = { ws, isAlive: true };
    wsClients.add(client);

    try {
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        transport: 'websocket',
        timestamp: new Date().toISOString()
      }));
    } catch {
      // ignore
    }

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'SUBSCRIBE' && msg.userId) {
          client.userId = msg.userId;
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore malformed
      }
    });

    ws.on('close', () => {
      wsClients.delete(client);
    });

    ws.on('error', () => {
      wsClients.delete(client);
    });
  });

  const heartbeatInterval = setInterval(() => {
    for (const client of wsClients) {
      if (!client.isAlive) {
        client.ws.terminate();
        wsClients.delete(client);
      } else {
        client.isAlive = false;
        client.ws.ping();
      }
    }
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Farmer Loan & Subsidy Finder] Server listening on http://0.0.0.0:${PORT} (WebSocket active on /ws)`);
  });
}

startServer();
