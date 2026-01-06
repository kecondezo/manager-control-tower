import { Initiative, Activity, ActivityLog, Team, Person } from '../types';

const API_URL = 'http://localhost:3001/api';

class DatabaseService {
  // --- Initiatives ---

  async getInitiatives(): Promise<Initiative[]> {
    const res = await fetch(`${API_URL}/initiatives`);
    return res.json();
  }

  async getInitiative(id: string): Promise<Initiative | undefined> {
    const res = await fetch(`${API_URL}/initiatives/${id}`);
    if (!res.ok) return undefined;
    return res.json();
  }

  async saveInitiative(initiative: Initiative): Promise<void> {
    await fetch(`${API_URL}/initiatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initiative)
    });
  }

  async archiveInitiative(id: string): Promise<void> {
    await fetch(`${API_URL}/initiatives/${id}/archive`, {
      method: 'PATCH'
    });
  }

  // --- Activities ---

  async getActivities(initiativeId?: string): Promise<Activity[]> {
    const url = initiativeId 
      ? `${API_URL}/activities?initiativeId=${initiativeId}`
      : `${API_URL}/activities`;
    const res = await fetch(url);
    return res.json();
  }

  async saveActivity(activity: Activity): Promise<void> {
    await fetch(`${API_URL}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
  }

  async archiveActivity(id: string): Promise<void> {
    await fetch(`${API_URL}/activities/${id}/archive`, {
      method: 'PATCH'
    });
  }

  // --- Logs ---

  async getLogs(activityId: string): Promise<ActivityLog[]> {
    const res = await fetch(`${API_URL}/logs?activityId=${activityId}`);
    return res.json();
  }

  async addLog(log: ActivityLog): Promise<void> {
    await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  }

  // --- Meta & Teams ---

  async getTeams(): Promise<Team[]> {
    const res = await fetch(`${API_URL}/teams`);
    return res.json();
  }

  async saveTeam(team: Team): Promise<void> {
    await fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });
  }

  // --- People ---

  async getPeople(): Promise<Person[]> {
    const res = await fetch(`${API_URL}/people`);
    return res.json();
  }

  async savePerson(person: Person): Promise<void> {
    await fetch(`${API_URL}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    });
  }

  async deletePerson(id: string): Promise<void> {
    await fetch(`${API_URL}/people/${id}`, {
      method: 'DELETE'
    });
  }
}

export const dbService = new DatabaseService();
