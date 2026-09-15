import { Routes, Route } from 'react-router-dom'
import InputScreen from './pages/InputScreen'
import InsightsScreen from './pages/InsightsScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<InputScreen />} />
      <Route path="/insights" element={<InsightsScreen />} />
    </Routes>
  )
}
