export type SmsType =
  | 'APPLICATION_SUBMITTED'
  | 'STATUS_UPDATE'
  | 'DBT_CREDIT'
  | 'LOAN_SANCTION'
  | 'OFFLINE_SYNC'
  | 'WEATHER_ALERT'
  | 'CUSTOM_TEST';

export type SmsGateway = 'NIC_KISAN_SMS' | 'CELLULAR_NATIVE' | 'GOI_SANDES';

export type SmsDeliveryStatus =
  | 'DELIVERED'
  | 'SENT'
  | 'QUEUED_OFFLINE'
  | 'OPENED_IN_MESSAGES';

export interface SmsRecord {
  id: string;
  recipientMobile: string;
  recipientName: string;
  type: SmsType;
  title: string;
  message: string;
  gateway: SmsGateway;
  status: SmsDeliveryStatus;
  sentAt: string;
  isOffline: boolean;
  relatedId?: string;
  directSmsUri?: string;
}

export interface SmsPreferences {
  registeredMobile: string;
  autoLaunchMessagesApp: boolean;
  notifyOnSubmission: boolean;
  notifyOnStatusChange: boolean;
  notifyOnDbtCredit: boolean;
}
