import { getWorkspaceAccessToken, signInWithGoogleWorkspace } from '../lib/firebase';

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
  isUnread: boolean;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  labelIds: string[];
  bodyText: string;
  bodyHtml?: string;
  isUnread: boolean;
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  from?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

// Convert string to base64url format for RFC 2822 email
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Safely decode base64url encoded content
function base64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn('Failed to decode base64url body:', e);
    return '';
  }
}

// Build RFC 2822 email string
export function buildRawEmail({
  to,
  subject,
  body,
  from,
  isHtml = false
}: SendEmailParams): string {
  const lines: string[] = [];
  if (from) {
    lines.push(`From: ${from}`);
  }
  lines.push(`To: ${to}`);
  // Encode subject in UTF-8 base64
  const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  lines.push(`Subject: ${utf8Subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push(isHtml ? 'Content-Type: text/html; charset=UTF-8' : 'Content-Type: text/plain; charset=UTF-8');
  lines.push('Content-Transfer-Encoding: 8bit');
  lines.push('');
  lines.push(body);

  return base64UrlEncode(lines.join('\r\n'));
}

// Fetch user profile from Gmail API
export async function getGmailUserProfile(accessToken: string): Promise<GmailUserProfile> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gmail profile fetch failed (${res.status})`);
  }

  return await res.json();
}

// List messages from user's Gmail
export async function fetchGmailMessages(
  accessToken: string,
  query?: string,
  maxResults = 20
): Promise<GmailMessageSummary[]> {
  try {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
      includeSpamTrash: 'false',
    });
    if (query && query.trim()) {
      params.append('q', query.trim());
    }

    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gmail list messages error (${listRes.status})`);
    }

    const listData = await listRes.json();
    const rawMessages: { id: string; threadId: string }[] = listData.messages || [];

    if (rawMessages.length === 0) {
      return [];
    }

    // Fetch message metadata in parallel (up to 15 items for fast performance)
    const detailPromises = rawMessages.slice(0, 15).map(async (msg) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!itemRes.ok) return null;
        const item = await itemRes.json();
        const headers = item.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
        const labelIds = item.labelIds || [];
        const isUnread = labelIds.includes('UNREAD');

        return {
          id: item.id,
          threadId: item.threadId,
          snippet: item.snippet || '',
          subject,
          from,
          to,
          date,
          labelIds,
          isUnread,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(detailPromises);
    return results.filter((m): m is GmailMessageSummary => m !== null);
  } catch (error: any) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
}

// Fetch single message details (full body & HTML)
export async function fetchGmailMessageDetails(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch email details (${res.status})`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
  const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
  const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
  const labelIds = data.labelIds || [];

  let bodyText = '';
  let bodyHtml = '';

  // Recursive extractor for body parts
  const extractParts = (part: any) => {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += base64UrlDecode(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += base64UrlDecode(part.body.data);
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractParts);
    }
  };

  if (data.payload?.body?.data) {
    const decoded = base64UrlDecode(data.payload.body.data);
    if (data.payload.mimeType === 'text/html') {
      bodyHtml = decoded;
    } else {
      bodyText = decoded;
    }
  }

  if (data.payload?.parts) {
    extractParts(data.payload);
  }

  if (!bodyText && data.snippet) {
    bodyText = data.snippet;
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    date,
    labelIds,
    bodyText: bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]+>/g, ' ') : '(No content)'),
    bodyHtml: bodyHtml || undefined,
    isUnread: labelIds.includes('UNREAD'),
  };
}

// Send an email directly through user's Gmail
export async function sendGmailEmail(
  accessToken: string,
  params: SendEmailParams
): Promise<{ id: string; threadId: string }> {
  if (!params.to || !params.to.trim()) {
    throw new Error('Recipient email address is required.');
  }
  if (!params.subject || !params.subject.trim()) {
    throw new Error('Email subject is required.');
  }

  const raw = buildRawEmail(params);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to send email via Gmail (${res.status})`);
  }

  return await res.json();
}

// Move email to trash
export async function trashGmailMessage(
  accessToken: string,
  messageId: string
): Promise<void> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to trash email (${res.status})`);
  }
}

// Mark message as read
export async function markGmailMessageAsRead(
  accessToken: string,
  messageId: string
): Promise<void> {
  try {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    });
  } catch (err) {
    console.warn('Could not mark message as read:', err);
  }
}

// Create a draft in user's Gmail
export async function createGmailDraft(
  accessToken: string,
  params: SendEmailParams
): Promise<{ id: string }> {
  const raw = buildRawEmail(params);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create draft in Gmail (${res.status})`);
  }

  return await res.json();
}
