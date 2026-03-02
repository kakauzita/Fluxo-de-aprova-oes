import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppShell from './components/Sidebar'
import LoginPage from './pages/LoginPage'

// Admin
import ConfiguracaoPage from './pages/admin/ConfiguracaoPage'
import UnidadesPage from './pages/admin/UnidadesPage'

// Solicitante
import PecasListPage from './pages/solicitante/PecasListPage'
import NovaPecaPage from './pages/solicitante/NovaPecaPage'
import EditarPecaPage from './pages/solicitante/EditarPecaPage'
import PecaDetailPage from './pages/solicitante/PecaDetailPage'

// Aprovador
import AprovacoesPage from './pages/aprovador/AprovacoesPage'

function RequireAuth({ children, allowedProfiles }: { children: React.ReactNode; allowedProfiles?: string[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedProfiles && !allowedProfiles.includes(user.perfil)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function DefaultRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (user.perfil === 'ADMIN') return <Navigate to="/admin/configuracao" />
  if (user.perfil === 'SOLICITANTE') return <Navigate to="/pecas" />
  if (user.perfil === 'APROVADOR') return <Navigate to="/aprovacoes/pendentes" />
  return <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DefaultRedirect />} />

          {/* Admin — unified config page (single route) */}
          <Route path="/admin/configuracao" element={
            <RequireAuth allowedProfiles={['ADMIN']}>
              <AppShell><ConfiguracaoPage /></AppShell>
            </RequireAuth>
          } />

          {/* Legacy admin routes redirect to unified config */}
          <Route path="/admin/grupos" element={<Navigate to="/admin/configuracao" replace />} />
          <Route path="/admin/publicos-alvo" element={<Navigate to="/admin/configuracao" replace />} />
          <Route path="/admin/segmentos" element={<Navigate to="/admin/configuracao" replace />} />
          <Route path="/admin/assuntos" element={<Navigate to="/admin/configuracao" replace />} />

          {/* Admin — Unidades */}
          <Route path="/admin/unidades" element={
            <RequireAuth allowedProfiles={['ADMIN']}>
              <AppShell><UnidadesPage /></AppShell>
            </RequireAuth>
          } />

          {/* Solicitante */}
          <Route path="/pecas" element={
            <RequireAuth allowedProfiles={['SOLICITANTE']}>
              <AppShell><PecasListPage /></AppShell>
            </RequireAuth>
          } />
          <Route path="/pecas/nova" element={
            <RequireAuth allowedProfiles={['SOLICITANTE']}>
              <AppShell><NovaPecaPage /></AppShell>
            </RequireAuth>
          } />
          <Route path="/pecas/:id" element={
            <RequireAuth allowedProfiles={['SOLICITANTE', 'APROVADOR']}>
              <AppShell><PecaDetailPage /></AppShell>
            </RequireAuth>
          } />
          <Route path="/pecas/:id/editar" element={
            <RequireAuth allowedProfiles={['SOLICITANTE']}>
              <AppShell><EditarPecaPage /></AppShell>
            </RequireAuth>
          } />

          {/* Aprovador */}
          <Route path="/aprovacoes/pendentes" element={
            <RequireAuth allowedProfiles={['APROVADOR']}>
              <AppShell><AprovacoesPage /></AppShell>
            </RequireAuth>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
