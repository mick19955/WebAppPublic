import { Route, Routes, Navigate } from "react-router-dom";
import SkillsPage from "./pages/SkillsPage";
import NodePage from "./pages/NodePage";
import PracticePage from "./pages/PracticePage";
import HomePage from "./pages/HomePage";
import GroupPage from "./pages/GroupPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/skills" element={<SkillsPage />} />
      <Route path="/node/:nodeId" element={<NodePage />} />
      <Route path="/practice/:nodeId" element={<PracticePage />} />
      <Route path="/group" element={<GroupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
