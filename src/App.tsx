import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Alerts } from './pages/Alerts'
import { Investigations } from './pages/Investigations'
import { ModelInsights } from './pages/ModelInsights'
import { Overview } from './pages/Overview'
import { Pipeline } from './pages/Pipeline'
import { Rules } from './pages/Rules'
import { SignIn } from './pages/SignIn'
import { Simulator } from './pages/Simulator'
import { Transactions } from './pages/Transactions'
import { useApp, AppProvider } from './state/store'

function Protected() {
  const { data } = useApp()
  if (!data.signedIn) return <SignIn />
  return <Shell />
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Protected />}>
            <Route index element={<Overview />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transactions/:id" element={<Transactions />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="investigations" element={<Investigations />} />
            <Route path="rules" element={<Rules />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="model" element={<ModelInsights />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
