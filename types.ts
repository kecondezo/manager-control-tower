export enum Priority {
  P0 = 'P0', // Critical
  P1 = 'P1', // High
  P2 = 'P2', // Medium
  P3 = 'P3', // Low
}

export enum Status {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Blocked = 'Blocked',
  Done = 'Done',
}

export interface Team {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface Person {
  id: string;
  name: string;
  avatar?: string;
  teamIds?: string[];
}

export interface ActivityLog {
  id: string;
  activityId: string;
  createdAt: string;
  authorId: string;
  message: string;
}

export interface Activity {
  id: string;
  initiativeId: string;
  title: string;
  description?: string;
  ownerId: string;
  priority: Priority;
  status: Status;
  startDate?: string;
  endDate?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  teamId: string;
  ownerId: string;
  platformId?: string;
  priority: Priority;
  status: Status;
  progress: number;
  startDate?: string;
  endDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface Platform {
  id: string;
  name: string;
}

export interface DatabaseSchema {
  meta: { version: number; updatedAt: string };
  teams: Team[];
  people: Person[];
  platforms: Platform[];
  initiatives: Initiative[];
  activities: Activity[];
  activityLogs: ActivityLog[];
  capacityAssignments: CapacityAssignment[];
}

export interface CapacityAssignment {
  id: string;
  personId: string;
  initiativeId: string;
  year: number;
  month: number; // 1-12
  percentage: number;
  updatedAt: string;
}