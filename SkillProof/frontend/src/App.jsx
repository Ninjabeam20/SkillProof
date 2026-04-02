import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell.jsx'
import { SkillInputPage } from './pages/SkillInputPage.jsx'
import { GraphPage } from './pages/GraphPage.jsx'
import { EvaluationPage } from './pages/EvaluationPage.jsx'
import { ResultsPage } from './pages/ResultsPage.jsx'
import { RoadmapPage } from './pages/RoadmapPage.jsx'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<SkillInputPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/evaluate/:skillId" element={<EvaluationPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
