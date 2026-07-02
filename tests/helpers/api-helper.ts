import { type Page } from '@playwright/test';
import { parseGender } from '../../lib/types/common';

export class APIHelper {
  readonly page: Page;
  private accessToken: string | null = null;
  private userId: string | null = null;

  constructor(page: Page) {
    this.page = page;
  }

  async authenticate(email: string, password: string) {
    const response = await this.page.request.post('/api/auth/mobile', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (result.success && result.access_token) {
      this.accessToken = result.access_token;
      this.userId = result.user?.id || null;
      return result;
    }
    throw new Error(`Authentication failed: ${JSON.stringify(result)}`);
  }

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  async setAccessToken(token: string) {
    this.accessToken = token;
  }

  async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.page.request.get(endpoint, {
      headers: await this.getHeaders(),
    });
    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await this.page.request.post(endpoint, {
      headers: await this.getHeaders(),
      data: JSON.stringify(data),
    });
    return response.json();
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await this.page.request.put(endpoint, {
      headers: await this.getHeaders(),
      data: JSON.stringify(data),
    });
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.page.request.delete(endpoint, {
      headers: await this.getHeaders(),
    });
    return response.json();
  }

  async getCats(): Promise<unknown> {
    return this.get('/api/v2/cats');
  }

  async getCat(catId: string): Promise<unknown> {
    return this.get(`/api/v2/cats/${catId}`);
  }

  async createCat(data: {
    name: string;
    householdId?: string;
    birthDate?: string;
    weight?: string;
    portion_size?: string;
    portionSize?: string;
    portion_unit?: string;
    portionUnit?: string;
    feedingInterval?: number;
    notes?: string;
    gender?: 'male' | 'female';
  }): Promise<unknown> {
    const body: Record<string, unknown> = {
      name: data.name,
      birthdate: data.birthDate,
      weight: data.weight,
      portion_size: data.portion_size ?? data.portionSize,
      portion_unit: data.portion_unit ?? data.portionUnit,
      feeding_interval: data.feedingInterval,
      notes: data.notes,
      gender: data.gender === undefined ? undefined : parseGender(data.gender),
    };
    if (data.householdId) body.householdId = data.householdId;
    return this.post('/api/v2/cats', body);
  }

  async updateCat(catId: string, data: Partial<{
    name: string;
    birthDate: string;
    weight: string;
    portionSize: string;
    portionUnit: string;
    feedingInterval: number;
    notes: string;
    gender: 'male' | 'female' | null;
  }>): Promise<unknown> {
    return this.put(`/api/v2/cats/${catId}`, data);
  }

  async deleteCat(catId: string): Promise<unknown> {
    return this.delete(`/api/v2/cats/${catId}`);
  }

  async getFeedings(params?: Record<string, string>): Promise<unknown> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.get(`/api/v2/feedings${queryString}`);
  }

  async createFeeding(data: {
    catId: string;
    amount: number;
    unit: string;
    mealType?: string;
    foodType?: string;
    notes?: string;
    fedAt?: string;
  }): Promise<unknown> {
    return this.post('/api/v2/feedings', {
      catId: data.catId,
      amount: data.amount,
      unit: data.unit,
      meal_type: data.mealType ?? 'manual',
      food_type: data.foodType,
      notes: data.notes,
    });
  }

  async getNotifications(params?: { limit?: number; unreadOnly?: boolean }): Promise<unknown> {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.unreadOnly) search.set('unreadOnly', 'true');
    const query = search.toString();
    return this.get(`/api/v2/notifications${query ? `?${query}` : ''}`);
  }

  async postFeedingRaw(data: Record<string, unknown>): Promise<{ status: number; body: unknown }> {
    const response = await this.page.request.post('/api/v2/feedings', {
      headers: await this.getHeaders(),
      data: JSON.stringify(data),
    });
    return { status: response.status(), body: await response.json() };
  }

  async deleteFeeding(feedingId: string): Promise<unknown> {
    return this.delete(`/api/v2/feedings/${feedingId}`);
  }

  async getHouseholds(): Promise<unknown> {
    return this.get('/api/v2/households');
  }

  async createHousehold(data: {
    name: string;
    description?: string;
  }): Promise<unknown> {
    return this.post('/api/v2/households', data);
  }

  async getWeightLogs(catId: string): Promise<unknown> {
    return this.get(`/api/v2/weight-logs?catId=${catId}`);
  }

  async createWeightLog(data: {
    catId: string;
    weight: number;
    date: string;
    notes?: string;
  }): Promise<unknown> {
    return this.post('/api/v2/weight-logs', data);
  }

  async getSchedules(catId?: string): Promise<unknown> {
    const params = catId ? `?catId=${catId}` : '';
    return this.get(`/api/v2/schedules${params}`);
  }

  async createSchedule(data: {
    catId: string;
    type: string;
    interval?: number;
    times?: string[];
    enabled?: boolean;
  }): Promise<unknown> {
    return this.post('/api/v2/schedules', data);
  }

  async deleteSchedule(scheduleId: string): Promise<unknown> {
    return this.delete(`/api/v2/schedules/${scheduleId}`);
  }

  async completeFeeding(feedingId: string, data?: { notes?: string; amount?: number; fed_at?: string }): Promise<unknown> {
    return this.post(`/api/v2/feedings/${feedingId}/complete`, data || {});
  }

  async skipFeeding(feedingId: string, data?: { reason?: string }): Promise<unknown> {
    return this.post(`/api/v2/feedings/${feedingId}/skip`, data || {});
  }

  async createBatchFeeding(data: {
    logs: Array<{
      catId: string;
      portionSize: number;
      timestamp: string;
      notes?: string;
      status?: string;
      mealType: string;
      food_type?: string;
      unit?: string;
      tempId?: string;
    }>;
  }): Promise<unknown> {
    return this.post('/api/v2/feedings/batch', data);
  }

  async getStatistics(period?: string, catId?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (period) params.set('period', period);
    if (catId) params.set('catId', catId);
    const query = params.toString();
    return this.get(`/api/v2/statistics${query ? `?${query}` : ''}`);
  }

  async getNextFeeding(catId: string): Promise<unknown> {
    return this.get(`/api/v2/cats/${catId}/next-feeding`);
  }

  async createGoal(data: {
    cat_id: string;
    goal_name: string;
    start_date: string;
    target_date: string;
    initial_weight: number;
    target_weight: number;
    unit: 'kg' | 'lbs';
    description?: string;
  }): Promise<unknown> {
    return this.post('/api/v2/goals', data);
  }

  async getGoals(): Promise<unknown> {
    return this.get('/api/v2/goals');
  }

  async uploadFile(file: Buffer, filename: string, type: 'user' | 'cat' | 'thumbnail' = 'user'): Promise<unknown> {
    // Use page.request for multipart upload
    const response = await this.page.request.post('/api/v2/upload', {
      multipart: {
        file: {
          name: filename,
          mimeType: 'image/png',
          buffer: file,
        },
        type,
      },
    });
    return response.json();
  }

  async getUserPreferences(userId: string): Promise<unknown> {
    return this.get(`/api/v2/users/${userId}/preferences`);
  }

  async updateUserPreferences(userId: string, data: {
    language?: string;
    timezone?: string;
    notifications?: Record<string, boolean>;
  }): Promise<unknown> {
    return this.put(`/api/v2/users/${userId}/preferences`, data);
  }

  async getHouseholdDetail(householdId: string): Promise<unknown> {
    return this.get(`/api/v2/households/${householdId}`);
  }

  async getHouseholdCats(householdId: string): Promise<unknown> {
    return this.get(`/api/v2/households/${householdId}/cats`);
  }

  async getHouseholdMembers(householdId: string): Promise<unknown> {
    return this.get(`/api/v2/households/${householdId}/members`);
  }

  async acceptInvite(notificationId: string): Promise<unknown> {
    return this.post(`/api/v2/households/invites/${notificationId}/accept`, {});
  }

  async rejectInvite(notificationId: string): Promise<unknown> {
    return this.post(`/api/v2/households/invites/${notificationId}/reject`, {});
  }
}
