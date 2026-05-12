import { apiFetch } from './api';

export interface SuperuserConfig {
  restaurant_name: string;
  address:         string | null;
  phone:           string | null;
  logo_url:        string | null;
  operation_mode:  'autoservicio' | 'mesero' | 'ambos';
  tax_rate:        number;
  tip_suggestion:  number;
  currency:        string;
  timezone:        string;
}

export const getSuperuserConfig = (): Promise<SuperuserConfig> =>
  apiFetch<SuperuserConfig>('/superuser/config');

export const updateSuperuserConfig = (data: Partial<SuperuserConfig>): Promise<{ message: string }> =>
  apiFetch<{ message: string }>('/superuser/config', {
    method: 'PUT',
    body:   JSON.stringify(data),
  });