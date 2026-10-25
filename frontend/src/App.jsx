import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { VendorDashboard } from './features/vendor/VendorDashboard'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route
            path="/"
            element={<LandingPage theme={theme} onToggleTheme={toggleTheme} />}
          />
          <Route
            path="/login"
            element={<LoginPage theme={theme} onToggleTheme={toggleTheme} />}
          />
          <Route
            path="/dashboard/vendor"
            element={<VendorDashboard theme={theme} onToggleTheme={toggleTheme} />}
          />
          <Route
            path="/dashboard/vendor/*"
            element={<VendorDashboard theme={theme} onToggleTheme={toggleTheme} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
