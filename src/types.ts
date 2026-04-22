export interface Section {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  columns: string[];   // ordered attribute column names for table view
  is_active: boolean;
  created_at: string;
}

export type ItemStatus = 'active' | 'obsolete' | 'no_location';

export interface Item {
  id: string;
  section_id: string;
  part_number: string;
  description: string | null;
  status: ItemStatus;
  attributes: Record<string, string>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  message: string;
}

export type AppView = 'search' | 'admin';
