import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSearchStats } from '../hooks/useNotes';
import { User, Mail, Shield, Calendar, Clock, Edit, Save, X, Camera, Trash2, Key, Bell, Palette, Download, Upload, RotateCcw, Activity, Info, AlertTriangle, CheckCircle, ChevronRight, ExternalLink, Github, Globe, Lock, Unlock, LogOut, Eye, EyeOff, Chrome, Sun, Moon, Monitor } from 'lucide-react';
import { cn, formatDate, formatRelativeTime } from '../utils';
import toast from 'react-hot-toast';

export function ProfilePage() {
  const { user, updateUser, logout, changePassword } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { stats } = useSearchStats();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'preferences' | 'activity'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: '', avatar_url: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  const saveProfile = async () => {
    if (typeof updateUser === 'function') {
      try {
        await updateUser({ full_name: editData.full_name, avatar_url: editData.avatar_url });
      } catch (e) {
        /* ignore */
      }
    }
    setIsEditing(false);
    toast.success('Profile updated');
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData({ full_name: user?.full_name || '', avatar_url: user?.avatar_url || '' });
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="card">
        <div className="p-6 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-6">
            <div className="relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-24 h-24 rounded-full" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-700 dark:text-primary-300">
                    {user?.full_name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editData.full_name}
                    onChange={e => setEditData({ ...editData, full_name: e.target.value })}
                    className="input text-2xl font-bold bg-transparent border-none focus:ring-0"
                  />
                  <input
                    type="url"
                    value={editData.avatar_url}
                    onChange={e => setEditData({ ...editData, avatar_url: e.target.value })}
                    className="input"
                    placeholder="Avatar URL"
                  />
                  <div className="flex gap-2">
                      <button onClick={async () => { await saveProfile(); }} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                      <button onClick={() => cancelEdit()} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{user?.full_name || 'Unnamed User'}</h1>
                  <p className="text-secondary-500 dark:text-secondary-400 mt-1">{user?.email}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-secondary-500">
                    <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> {user?.role}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {user?.created_at ? formatDate(user.created_at) : '—'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last active {user?.last_login ? formatRelativeTime(user.last_login) : '—'}</span>
                  </div>
                </div>
              )}
            </div>
            {!isEditing && (
              <button onClick={() => { setEditData({ full_name: user?.full_name || '', avatar_url: user?.avatar_url || '' }); setIsEditing(true); }} className="btn-secondary flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-secondary-200 dark:border-secondary-700 overflow-x-auto">
          <nav className="flex gap-1 p-1" role="tablist">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab user={user} stats={stats} />}
          {activeTab === 'security' && <SecurityTab user={user} passwordData={passwordData} setPasswordData={setPasswordData} showCurrentPassword={showCurrentPassword} setShowCurrentPassword={setShowCurrentPassword} showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword} changePassword={changePassword} />}
          {activeTab === 'preferences' && <PreferencesTab theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />}
          {activeTab === 'activity' && <ActivityTab user={user} />}
        </div>
      </div>

      <div className="card border-red-200 dark:border-red-800">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-medium text-secondary-900 dark:text-white">Danger Zone</h3>
              <p className="text-sm text-secondary-500">Permanently delete your account and all data</p>
            </div>
          </div>
          <button className="btn-danger flex items-center gap-2" onClick={() => { if (confirm('Are you sure? This cannot be undone.')) logout(); }}>
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ user, stats }: any) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Notes" value={stats?.total_notes || 0} icon="📝" color="blue" />
        <StatCard label="Total Words" value={stats?.total_words || 0} icon="✍️" color="green" />
        <StatCard label="Reading Time" value={`${stats?.total_reading_time_minutes || 0} min`} icon="⏱️" color="purple" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard title="Account Info" items={[
          { label: 'Email', value: user?.email, icon: Mail },
          { label: 'Role', value: user?.role, icon: Shield },
          { label: 'Member since', value: formatDate(user?.created_at), icon: Calendar },
          { label: 'Last login', value: formatRelativeTime(user?.last_login), icon: Clock },
        ]} />
        <InfoCard title="Quick Actions" items={[
          { label: 'Export all data', action: 'Export', icon: Download },
          { label: 'Change password', action: 'Change', icon: Key },
          { label: 'Manage OAuth', action: 'Manage', icon: Shield },
          { label: 'Notification settings', action: 'Configure', icon: Bell },
        ]} />
      </div>
    </div>
  );
}

function SecurityTab({ user, passwordData, setPasswordData, showCurrentPassword, setShowCurrentPassword, showNewPassword, setShowNewPassword, changePassword }: any) {
  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) { toast.error('Passwords do not match'); return; }
    if (passwordData.new.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await changePassword(passwordData.current, passwordData.new);
      setPasswordData({ current: '', new: '', confirm: '' });
      toast.success('Password changed');
    } catch { toast.error('Failed to change password'); }
  };

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-medium text-secondary-900 dark:text-white mb-4">Change Password</h3>
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input type={showCurrentPassword ? 'text' : 'password'} value={passwordData.current} onChange={e => setPasswordData({ ...passwordData, current: e.target.value })} className="input pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">{showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input type={showNewPassword ? 'text' : 'password'} value={passwordData.new} onChange={e => setPasswordData({ ...passwordData, new: e.target.value })} className="input pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400">{showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={passwordData.confirm} onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })} className="input" placeholder="••••••••" />
          </div>
          <button onClick={handleChangePassword} className="btn-primary" disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}>Change Password</button>
        </div>
      </section>

      <section>
        <h3 className="font-medium text-secondary-900 dark:text-white mb-4">Connected Accounts</h3>
        <div className="card p-4 space-y-3">
          {[
            { provider: 'google', label: 'Google', icon: Chrome, connected: false },
            { provider: 'github', label: 'GitHub', icon: Github, connected: false },
          ].map(item => (
            <div key={item.provider} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-secondary-800 flex items-center justify-center"><item.icon className="w-5 h-5" /></div>
                <div><p className="font-medium">{item.label}</p><p className="text-sm text-secondary-500">{item.connected ? 'Connected' : 'Not connected'}</p></div>
              </div>
              <button className={cn('btn-secondary text-sm', item.connected ? 'text-red-600 hover:bg-red-50' : '')}>{item.connected ? 'Disconnect' : 'Connect'}</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-medium text-secondary-900 dark:text-white mb-4">Two-Factor Authentication</h3>
        <div className="card p-4">
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">Add an extra layer of security to your account.</p>
          <button className="btn-primary">Enable 2FA</button>
        </div>
      </section>
    </div>
  );
}

function PreferencesTab({ theme, setTheme, resolvedTheme }: any) {
  const themes = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Match system preference' },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-medium text-secondary-900 dark:text-white mb-4">Theme</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.value} onClick={() => setTheme(t.value as 'light' | 'dark' | 'system')} className={cn('p-4 rounded-xl border-2 transition-all text-left', theme === t.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600')}>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', theme === t.value ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-secondary-100 dark:bg-secondary-800')}><Icon className={cn('w-5 h-5', theme === t.value ? 'text-primary-600' : 'text-secondary-600')} /></div>
                <h4 className="font-medium text-secondary-900 dark:text-white">{t.label}</h4>
                <p className="text-sm text-secondary-500 mt-1">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ActivityTab({ user }: any) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-medium text-secondary-900 dark:text-white mb-4">Recent Activity</h3>
        <p className="text-secondary-600 dark:text-secondary-400">Activity tracking coming soon. This will show your recent notes, edits, and login history.</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };
  const colorClass = (colors as any)[color] || '';
  return (
    <div className="card p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-2xl mb-3', colorClass)}>{icon}</div>
      <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-secondary-500">{label}</p>
    </div>
  );
}

function InfoCard({ title, items }: any) {
  return (
    <div className="card p-4">
      <h3 className="font-medium text-secondary-900 dark:text-white mb-3">{title}</h3>
      <div className="space-y-3">
        {items.map((item: any, i: number) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center justify-between py-2 border-b border-secondary-100 dark:border-secondary-800 last:border-0">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-secondary-400" />
                <div>
                  <p className="text-sm text-secondary-500">{item.label}</p>
                  <p className="font-medium text-secondary-900 dark:text-white">{item.value}</p>
                </div>
              </div>
              {item.action && <button className="btn-secondary text-sm flex items-center gap-1">{item.action} <ChevronRight className="w-3.5 h-3.5" /></button>}
            </div>
          );
        })}
      </div>
    </div>
  );
  }