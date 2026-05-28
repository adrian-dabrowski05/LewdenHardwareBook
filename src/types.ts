export interface Section {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  columns: string[];
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

export type RequestStatus = 'pending' | 'added' | 'dismissed';

export interface ItemRequest {
  id: string;
  part_number: string | null;
  description: string | null;
  requester_name: string;
  notes: string | null;
  status: RequestStatus;
  created_at: string;
}
