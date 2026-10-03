import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/Guards'
import Layout from '@/components/Layout'

// Public & Auth Pages
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import CompanyOnboarding from '@/pages/CompanyOnboarding'

// Protected ERP Modules
import Dashboard from '@/pages/Dashboard'
import Vendas from '@/pages/Vendas'
import Orcamentos from '@/pages/Orcamentos'
import Cotacoes from '@/pages/Cotacoes'
import Clientes from '@/pages/Clientes'
import Estoque from '@/pages/Estoque'
import FormacaoDePrecos from '@/pages/FormacaoDePrecos'
import Receitas from '@/pages/Receitas'
import Despesas from '@/pages/Despesas'
import ContasAPagar from '@/pages/ContasAPagar'
import ContasAReceber from '@/pages/ContasAReceber'
import EntradasSaidas from '@/pages/EntradasSaidas'
import CompanySettings from '@/pages/CompanySettings'
import Metas from '@/pages/Metas'
import Agenda from '@/pages/Agenda'
import Relatorios from '@/pages/Relatorios'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* Mandatory Onboarding (Protected: Requires Auth, Requires NO company) */}
          <Route
            path="/onboarding/company"
            element={
              <ProtectedRoute>
                <CompanyOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Protected ERP Modules inside Authenticated Shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/cotacoes" element={<Cotacoes />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/formacao-de-precos" element={<FormacaoDePrecos />} />
            <Route path="/receitas" element={<Receitas />} />
            <Route path="/despesas" element={<Despesas />} />
            <Route path="/contas-a-pagar" element={<ContasAPagar />} />
            <Route path="/contas-a-receber" element={<ContasAReceber />} />
            <Route path="/entradas-saidas" element={<EntradasSaidas />} />
            <Route path="/configuracoes" element={<CompanySettings />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
