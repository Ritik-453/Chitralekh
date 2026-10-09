export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin';
  institution?: string;
  department?: string;
  batch?: string;
  is_active: boolean;
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  font_family: string;
  font_size: number;
  line_height: number;
  editor_mode: 'split' | 'edit' | 'preview';
  auto_save: boolean;
  auto_save_interval: number;
  show_line_numbers: boolean;
  word_wrap: boolean;
  vim_mode: boolean;
  sidebar_width: number;
  show_toolbar: boolean;
  show_status_bar: boolean;
  language: string;
  date_format: string;
  time_format: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  google_drive_connected?: boolean;
  google_drive_email?: string | null;
  google_drive_folder_name?: string;
  auto_cloud_sync?: boolean;
  compress_before_upload?: boolean;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  note_count?: number;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  note_count?: number;
}

export type NoteType = 'text' | 'markdown' | 'flowchart' | 'diagram' | 'code';

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string | null;
  content_html: string | null;
  note_type: NoteType;
  is_pinned: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  sync_to_cloud?: boolean;
  word_count: number;
  reading_time: number;
  version: number;
  last_edited_at: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  folder: Folder | null;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  title: string;
  content: string | null;
  content_html: string | null;
  version: number;
  change_summary: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchParams {
  query?: string;
  folder_id?: string;
  tag_ids?: string[];
  note_type?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_favorite?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface FlowchartData {
  code: string;
  theme: string;
  direction: string;
}

export interface FlowchartExport {
  format: 'svg' | 'png' | 'pdf';
  theme: string;
}

export interface OAuthAccount {
  id: string;
  provider: string;
  provider_user_id: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface NoteCreate {
  title: string;
  content?: string;
  note_type?: NoteType;
  folder_id?: string;
  sync_to_cloud?: boolean;
  tags?: string[];
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  note_type?: NoteType;
  folder_id?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_favorite?: boolean;
  sync_to_cloud?: boolean;
  tags?: string[];
}

export interface FolderCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface FolderUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
}

export interface TagCreate {
  name: string;
  color?: string;
}

export interface TagUpdate {
  name?: string;
  color?: string;
}

export interface PreferencesUpdate {
  theme?: 'light' | 'dark' | 'system';
  font_family?: string;
  font_size?: number;
  line_height?: number;
  editor_mode?: 'split' | 'edit' | 'preview';
  auto_save?: boolean;
  auto_save_interval?: number;
  show_line_numbers?: boolean;
  word_wrap?: boolean;
  vim_mode?: boolean;
  sidebar_width?: number;
  show_toolbar?: boolean;
  show_status_bar?: boolean;
  language?: string;
  date_format?: string;
  time_format?: string;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
}

export interface PDFPageImage {
  page_number: number;
  image_url: string;
  width: number;
  height: number;
}

export interface FileConvertResponse {
  filename: string;
  extension: string;
  file_type: 'image' | 'pdf' | 'docx' | 'pptx' | 'text' | string;
  text: string;
  suggested_title: string;
  word_count: number;
  reading_time: number;
  metadata?: Record<string, any>;
  file_url?: string;
  data_url?: string;
  file_size?: number;
  page_images?: PDFPageImage[];
}

export interface CentralRepoVersion {
  id: string;
  item_id: string;
  user_id?: string;
  version_number: number;
  title: string;
  content: string;
  content_html?: string;
  updater_name: string;
  updater_batch: string;
  change_summary?: string;
  original_file_url?: string;
  created_at: string;
}

export interface CentralRepoItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content: string;
  content_html?: string;
  institution: string;
  department: string;
  course_code?: string;
  course_name?: string;
  batch: string;
  semester?: string;
  note_type: NoteType;
  current_version: number;
  downloads_count: number;
  views_count: number;
  likes_count: number;
  original_file_url?: string;
  original_file_name?: string;
  original_file_type?: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  versions: CentralRepoVersion[];
}

export interface CentralRepoItemCreate {
  title: string;
  description?: string;
  content: string;
  institution: string;
  department: string;
  course_code?: string;
  course_name?: string;
  batch: string;
  semester?: string;
  note_type?: string;
  original_file_url?: string;
  original_file_name?: string;
  original_file_type?: string;
  initial_change_summary?: string;
}

export interface CentralRepoVersionCreate {
  title: string;
  content: string;
  updater_name: string;
  updater_batch: string;
  change_summary: string;
  original_file_url?: string;
}

export interface CentralRepoItemListResponse {
  items: CentralRepoItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CentralRepoMeta {
  institutions: string[];
  departments: string[];
  courses: { code: string; name: string }[];
  batches: string[];
  semesters: string[];
}

export interface StoragePathsInfo {
  database_path: string;
  database_filename: string;
  database_exists: boolean;
  database_size_bytes: number;
  uploads_path: string;
  uploads_exists: boolean;
  uploads_size_bytes: number;
  uploads_file_count: number;
  os_name: string;
  platform_release: string;
}

export interface CloudSyncStatus {
  google_drive_connected: boolean;
  google_drive_email: string | null;
  google_drive_folder_name: string;
  auto_cloud_sync: boolean;
  compress_before_upload: boolean;
  last_synced_at: string | null;
  total_notes_count: number;
  synced_notes_count: number;
  local_only_notes_count: number;
  estimated_uncompressed_bytes: number;
  estimated_compressed_bytes: number;
  saved_bandwidth_percent: number;
}

export interface CentralRepoCloudInfo {
  active_provider: string;
  database_provider: string;
  primary_storage_name: string;
  database_name: string;
  free_tier_storage_bytes: number;
  free_tier_db_bytes: number;
  total_free_tier_bytes: number;
  used_storage_bytes: number;
  files_count: number;
  egress_fee: string;
  is_configured: boolean;
  description: string;
}