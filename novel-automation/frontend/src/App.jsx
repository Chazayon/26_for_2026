import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Library = lazy(() => import('./pages/Library'));
const NewProduction = lazy(() => import('./pages/NewProduction'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const ProjectView = lazy(() => import('./pages/ProjectView'));
const ChapterView = lazy(() => import('./pages/ChapterView'));

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="h-64 flex items-center justify-center text-base-400">Loading...</div>}>
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
      </Suspense>
    </Layout>
  );
}
