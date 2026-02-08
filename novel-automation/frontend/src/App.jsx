import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import NewProduction from './pages/NewProduction';
import Pipeline from './pages/Pipeline';
import History from './pages/History';
import Settings from './pages/Settings';
import ProjectView from './pages/ProjectView';
import ChapterView from './pages/ChapterView';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:projectId" element={<ProjectView />} />
        <Route path="/library/:projectId/books/:bookId/chapters/:chapterId" element={<ChapterView />} />
        <Route path="/produce" element={<NewProduction />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
