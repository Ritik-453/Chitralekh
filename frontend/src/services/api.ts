import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthTokens, LoginCredentials, RegisterData, Note, NoteCreate, NoteUpdate, Folder, FolderCreate, FolderUpdate, Tag, TagCreate, TagUpdate, User, UserPreferences, PreferencesUpdate, PaginatedResponse, SearchParams, FlowchartData, OAuthAccount, NoteVersion, FileConvertResponse, CentralRepoItem, CentralRepoItemCreate, CentralRepoVersionCreate, CentralRepoItemListResponse, CentralRepoMeta, StoragePathsInfo, CloudSyncStatus, CentralRepoCloudInfo } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  paramsSerializer: {
    indexes: null,
  },
});

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                           originalRequest?.url?.includes('/auth/register') ||
                           originalRequest?.url?.includes('/auth/refresh') ||
                           originalRequest?.url?.includes('/auth/logout');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { access_token } = response.data;
        setAccessToken(access_token);
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        localStorage.removeItem('auth_tokens');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: LoginCredentials) => {
    const params = new URLSearchParams();
    params.append('username', credentials.email);
    params.append('password', credentials.password);
    return api.post<AuthTokens>('/auth/login', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  register: (data: RegisterData) => api.post<User>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post<AuthTokens>('/auth/refresh'),
  getMe: () => api.get<User>('/auth/me'),
  updateMe: (data: Partial<User>) => api.patch<User>('/auth/me', data),
  changePassword: (data: { current_password: string; new_password: string }) => api.patch('/auth/me/password', data),
  deleteAccount: () => api.delete('/auth/me'),
  getOAuthAccounts: () => api.get<OAuthAccount[]>('/auth/oauth/accounts'),
  unlinkOAuth: (provider: string) => api.delete(`/auth/oauth/accounts/${provider}`),
  oauthLogin: (provider: string) => api.get<{ redirect_url: string }>(`/auth/oauth/${provider}`),
};

export const notesApi = {
  list: (params?: SearchParams) => api.get<PaginatedResponse<Note>>('/notes', { params }),
  getRecent: (limit?: number) => api.get<Note[]>('/notes/recent', { params: { limit } }),
  getPinned: () => api.get<Note[]>('/notes/pinned'),
  getFavorites: () => api.get<Note[]>('/notes/favorites'),
  get: (id: string) => api.get<Note>(`/notes/${id}`),
  create: (data: NoteCreate) => api.post<Note>('/notes', data),
  update: (id: string, data: NoteUpdate) => api.patch<Note>(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
  pin: (id: string) => api.post<{ is_pinned: boolean }>(`/notes/${id}/pin`),
  favorite: (id: string) => api.post<{ is_favorite: boolean }>(`/notes/${id}/favorite`),
  archive: (id: string) => api.post<{ is_archived: boolean }>(`/notes/${id}/archive`),
  getVersions: (id: string) => api.get<NoteVersion[]>(`/notes/${id}/versions`),
  restoreVersion: (noteId: string, versionId: string) => api.post<Note>(`/notes/${noteId}/versions/${versionId}/restore`),
  convertFile: (file: File, mode?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mode) {
      formData.append('mode', mode);
    }
    return api.post<FileConvertResponse>('/notes/convert-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importFile: (file: File, folderId?: string, mode?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    if (mode) {
      formData.append('mode', mode);
    }
    return api.post<Note>('/notes/import-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; filename: string; size: number }>('/notes/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkSyncToggle: (noteIds: string[], syncToCloud: boolean) =>
    api.post<{ updated_count: number; sync_to_cloud: boolean }>('/notes/bulk-sync-toggle', {
      note_ids: noteIds,
      sync_to_cloud: syncToCloud,
    }),
};

export const foldersApi = {
  list: () => api.get<Folder[]>('/folders'),
  listFlat: () => api.get<Folder[]>('/folders/flat'),
  get: (id: string) => api.get<Folder>(`/folders/${id}`),
  create: (data: FolderCreate) => api.post<Folder>('/folders', data),
  update: (id: string, data: FolderUpdate) => api.patch<Folder>(`/folders/${id}`, data),
  delete: (id: string, moveNotesTo?: string) => api.delete(`/folders/${id}`, { params: { move_notes_to: moveNotesTo } }),
  reorder: (folderOrders: { id: string; sort_order: number; parent_id?: string }[]) => api.post('/folders/reorder', folderOrders),
};

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags'),
  listWithCounts: () => api.get<{ id: string; name: string; color: string; note_count: number }[]>('/tags/with-counts'),
  get: (id: string) => api.get<Tag>(`/tags/${id}`),
  create: (data: TagCreate) => api.post<Tag>('/tags', data),
  update: (id: string, data: TagUpdate) => api.patch<Tag>(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  bulkDelete: (tagIds: string[]) => api.post('/tags/bulk-delete', tagIds),
};

export const preferencesApi = {
  get: () => api.get<UserPreferences>('/preferences'),
  update: (data: PreferencesUpdate) => api.patch<UserPreferences>('/preferences', data),
  reset: () => api.post<UserPreferences>('/preferences/reset'),
  getStoragePaths: () => api.get<StoragePathsInfo>('/preferences/storage-paths'),
};

export const syncApi = {
  getStatus: () => api.get<CloudSyncStatus>('/sync/status'),
  connectGoogleDrive: (data: { email?: string; folder_name?: string; auto_sync?: boolean; compress_before_upload?: boolean }) =>
    api.post<{ message: string; google_drive_connected: boolean; google_drive_email: string; google_drive_folder_name: string }>('/sync/google-drive/connect', data),
  disconnectGoogleDrive: () => api.post<{ message: string; google_drive_connected: boolean }>('/sync/google-drive/disconnect'),
  triggerSync: () => api.post<{ status: string; synced_notes_count: number; last_synced_at: string; message: string }>('/sync/trigger'),
  getCentralRepoCloud: () => api.get<CentralRepoCloudInfo>('/sync/central-repository-cloud'),
};

export const flowchartsApi = {
  validate: (code: string) => api.post<{ valid: boolean; error?: string; ast?: any }>('/flowcharts/validate', { code }),
  render: (data: FlowchartData) => api.post<{ svg: string }>('/flowcharts/render', data),
  export: (noteId: string, data: { format: string; theme: string }) => api.post(`/flowcharts/export`, { ...data, note_id: noteId }, { responseType: 'blob' }),
  getTemplates: () => api.get<{ templates: any[] }>('/flowcharts/templates'),
  getThemes: () => api.get<{ themes: any[] }>('/flowcharts/themes'),
};

export const searchApi = {
  notes: (params: SearchParams) => api.get<PaginatedResponse<Note>>('/search/notes', { params }),
  suggestions: (q: string, limit?: number) => api.get<{ suggestions: { title: string; id: string }[] }>('/search/suggestions', { params: { q, limit } }),
  tags: (q?: string, limit?: number) => api.get<{ tags: Tag[] }>('/search/tags', { params: { q, limit } }),
  folders: (q?: string, limit?: number) => api.get<{ folders: Folder[] }>('/search/folders', { params: { q, limit } }),
  stats: () => api.get('/search/stats'),
};

export const usersApi = {
  getProfile: () => api.get<User>('/users/me'),
  getById: (id: string) => api.get<User>(`/users/${id}`),
};

export const centralRepoApi = {
  list: (params?: {
    search?: string;
    institution?: string;
    department?: string;
    course_code?: string;
    batch?: string;
    semester?: string;
    note_type?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    page_size?: number;
  }) => api.get<CentralRepoItemListResponse>('/central-repository', { params }),
  getMeta: () => api.get<CentralRepoMeta>('/central-repository/meta'),
  addMeta: (category: string, value: string, code?: string) =>
    api.post<CentralRepoMeta>('/central-repository/meta', { category, value, code }),
  get: (id: string) => api.get<CentralRepoItem>(`/central-repository/${id}`),
  create: (data: CentralRepoItemCreate) => api.post<CentralRepoItem>('/central-repository', data),
  createVersion: (id: string, data: CentralRepoVersionCreate) => api.post<CentralRepoItem>(`/central-repository/${id}/version`, data),
  fork: (id: string) => api.post<Note>(`/central-repository/${id}/fork`),
  like: (id: string) => api.post<{ status: string; likes_count: number }>(`/central-repository/${id}/like`),
  download: (id: string) => api.post<{ status: string; downloads_count: number }>(`/central-repository/${id}/download`),
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ file_url: string; file_name: string; file_size: number; content_type: string }>('/central-repository/upload-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;