import { competitions, type Competition } from "../competitions";
import { participantDirectory, type ActivityParticipants } from "../participants";
import { resultDirectory, type ActivityResult } from "../results";

export type ActivityPayload = {
  competition: Competition;
  participants: ActivityParticipants;
  result: ActivityResult;
};

export type ActivityPublicationStatus = "draft" | "published";

export type ActivityAdminState = {
  activityId: string;
  draft: ActivityPayload;
  published: ActivityPayload;
  status: ActivityPublicationStatus;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type ActivitySummary = {
  activityId: string;
  order: number;
  shortTitle: string;
  levelLabel: string;
  status: ActivityPublicationStatus;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  resultStatus: ActivityResult["status"];
  resultCount: number;
  teamCount: number;
  participantCount: number;
};

export type AuditLogEntry = {
  id: string;
  activityId: string | null;
  action: string;
  actorName: string;
  summary: string;
  revision: number | null;
  createdAt: string;
};

export const activityIds = competitions.map((item) => item.id);

export function isActivityId(value: string): boolean {
  return activityIds.includes(value);
}

export function getDefaultActivityPayload(activityId: string): ActivityPayload {
  const competition = competitions.find((item) => item.id === activityId);
  const participants = participantDirectory[activityId];
  const result = resultDirectory[activityId];

  if (!competition || !participants || !result) {
    throw new Error(`Unknown activity: ${activityId}`);
  }

  return structuredClone({ competition, participants, result });
}

export function getDefaultPublicDirectory(): Record<string, ActivityPayload> {
  return Object.fromEntries(activityIds.map((activityId) => [activityId, getDefaultActivityPayload(activityId)]));
}

export function summarizeActivity(state: ActivityAdminState): ActivitySummary {
  const people = state.draft.participants.teams.reduce((total, team) => total + team.members.length, 0);
  return {
    activityId: state.activityId,
    order: state.draft.competition.order,
    shortTitle: state.draft.competition.shortTitle,
    levelLabel: state.draft.competition.levelLabel,
    status: state.status,
    revision: state.revision,
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
    publishedAt: state.publishedAt,
    publishedBy: state.publishedBy,
    resultStatus: state.published.result.status,
    resultCount: state.published.result.entries.length,
    teamCount: state.draft.participants.teams.length,
    participantCount: people,
  };
}
