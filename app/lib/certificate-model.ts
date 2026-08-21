export type CertificateStatus = "draft" | "published";

export type StoredCertificate = {
  id: string;
  activityId: string;
  recipientName: string;
  recipientRoom: string | null;
  teamName: string | null;
  award: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  objectKey: string;
  status: CertificateStatus;
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type PublicCertificate = Omit<StoredCertificate, "contentType" | "objectKey" | "createdBy" | "publishedBy" | "status"> & {
  activityTitle: string;
  activityLevel: string;
  downloadUrl: string;
};

export type CertificateMetadata = {
  recipientName: string;
  recipientRoom?: string;
  teamName?: string;
  award?: string;
  status: CertificateStatus;
};
