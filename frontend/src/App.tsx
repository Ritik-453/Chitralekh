import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotesListPage } from './pages/NotesListPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { FolderNotesPage } from './pages/FolderNotesPage';
import { TagNotesPage } from './pages/TagNotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { ProfilePage } from './pages/ProfilePage';
import { PinnedNotesPage } from './pages/PinnedNotesPage';
import { FavoritesNotesPage } from './pages/FavoritesNotesPage';
import { ArchivedNotesPage } from './pages/ArchivedNotesPage';
import { FlowchartEditorPage } from './pages/FlowchartEditorPage';
import { CentralRepositoryPage } from './pages/CentralRepositoryPage';
import { NewbieStickyNotesGuide } from './components/NewbieStickyNotesGuide';
import { GuestBanner } from './components/GuestBanner';
import { useTourStatus } from './hooks/useTourStatus';
import { cn } from './utils';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (isAuthenticated || isGuest) ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isCompleted: isTourCompleted } = useTourStatus();

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-secondary-900 flex relative">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isCollapsed={sidebarCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <GuestBanner />
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative flex flex-col">
          <Outlet />
        </main>
      </div>

      {/* Floating Global Newbie Feature Tour Button (Only visible before tour completion) */}
      {!isTourCompleted && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('start-newbie-tour'))}
          className="fixed bottom-5 right-5 z-40 px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs shadow-xl border-2 border-amber-500/60 flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all select-none cursor-pointer"
          title="Start Feature Tour"
          style={{
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4), 0 8px 10px -6px rgba(245, 158, 11, 0.2)',
          }}
        >
          <span className="text-base animate-bounce leading-none">📌</span>
          <span className="hidden sm:inline">Feature Tour</span>
        </button>
      )}

      <NewbieStickyNotesGuide />
    </div>
  );
}

function NoteEditorRoute() {
  const location = useLocation();
  return <NoteEditorPage key={location.pathname + location.search} />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/notes" element={<NotesListPage />} />
        <Route path="/central-repository" element={<CentralRepositoryPage />} />
        <Route path="/notes/new" element={<NoteEditorRoute />} />
        <Route path="/notes/:id" element={<NoteEditorRoute />} />
        <Route path="/notes/:id/flowchart" element={<FlowchartEditorPage />} />
        <Route path="/folders/:id" element={<FolderNotesPage />} />
        <Route path="/tags/:id" element={<TagNotesPage />} />
        <Route path="/notes/pinned" element={<PinnedNotesPage />} />
        <Route path="/notes/favorites" element={<FavoritesNotesPage />} />
        <Route path="/notes/archived" element={<ArchivedNotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;