export type IssueStatus = 'open' | 'in-progress' | 'resolved';

export interface Issue {
  id: string;
  description: string;
  status: IssueStatus;
  screenshotUrl?: string; // Base64 or URL
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: any;
  createdBy: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
