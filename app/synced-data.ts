import rawSyncData from "../data/sync-data.json";
import type { Competition } from "./competitions";
import type { ActivityParticipants } from "./participants";
import type { ActivityResult } from "./results";
import type { CertificateStatus } from "./lib/certificate-model";
import type { ActivityPayload } from "./lib/content-model";

export type SnapshotCertificate = {
  id: string;
  activityId: string;
  recipientName: string;
  recipientRoom: string | null;
  teamName: string | null;
  award: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  externalUrl: string | null;
  status: CertificateStatus;
  createdAt: string;
  createdBy: string;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type SyncSnapshot = {
  schemaVersion: 1;
  meta: {
    participantDataUpdated: string;
    resultAnnouncementNote: string;
  };
  activities: Record<string, ActivityPayload>;
  certificates: SnapshotCertificate[];
};

export const syncSnapshot = rawSyncData as unknown as SyncSnapshot;

export const competitions: Competition[] = Object.values(syncSnapshot.activities)
  .map((activity) => activity.competition)
  .sort((left, right) => left.order - right.order);

export const participantDirectory: Record<string, ActivityParticipants> = Object.fromEntries(
  Object.entries(syncSnapshot.activities).map(([activityId, activity]) => [activityId, activity.participants]),
);

export const resultDirectory: Record<string, ActivityResult> = Object.fromEntries(
  Object.entries(syncSnapshot.activities).map(([activityId, activity]) => [activityId, activity.result]),
);

export const participantDataUpdated = syncSnapshot.meta.participantDataUpdated;
export const resultAnnouncementNote = syncSnapshot.meta.resultAnnouncementNote;
export const syncedCertificates = syncSnapshot.certificates;
