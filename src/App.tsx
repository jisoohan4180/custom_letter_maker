import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { UploadPage } from './pages/UploadPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { ResultsPage } from './pages/ResultsPage'
import { CourseListPage } from './pages/CourseListPage'
import { CourseEditPage } from './pages/CourseEditPage'
import { PrivateRoute } from './components/PrivateRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <UploadPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <PrivateRoute>
              <AnalysisPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/results"
          element={
            <PrivateRoute>
              <ResultsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <PrivateRoute>
              <CourseListPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/new"
          element={
            <PrivateRoute>
              <CourseEditPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <PrivateRoute>
              <CourseEditPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
