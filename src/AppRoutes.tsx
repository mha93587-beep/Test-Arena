import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Index from './pages/Index';
import TestArena from './pages/TestArena';
import FinalReview from './pages/FinalReview';
import Discovery from './pages/Discovery';
import ExamPage from './pages/ExamPage';
import NotFound from './pages/NotFound';

const AppRoutes = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<Index />} />
      <Route path="/test-arena/:slug" element={<TestArena />} />
      <Route path="/test-arena" element={<TestArena />} />
      <Route path="/review/:sessionId" element={<FinalReview />} />
      <Route path="/review" element={<FinalReview />} />
      <Route path="/discovery" element={<Discovery />} />
      <Route path="/exam/:slug" element={<ExamPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
