import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { UserProvider } from './context/UserContext';
import { Layout } from './components/Layout';
import { TaskList } from './pages/TaskList';
import { CreateTask } from './pages/CreateTask';
import { TaskDetail } from './pages/TaskDetail';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { RoomStatusGrid } from './pages/RoomStatusGrid';
// import { KanbanBoard } from './pages/KanbanBoard';
import { EquipmentInventory } from './pages/EquipmentInventory';
import { ShiftManager } from './pages/ShiftManager';
import { TeamManagement } from './pages/TeamManagement';
import { InspectorQueue } from './pages/InspectorQueue';
import RequestStatus from './pages/RequestStatus';

function App() {
  console.log('DOMA App Version: 2026-01-13 vNew - Build Verification');
  return (
    <LanguageProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<TaskList />} />
              <Route path="rooms" element={<RoomStatusGrid />} />
              {/* <Route path="kanban" element={<KanbanBoard />} /> */}
              <Route path="equipment" element={<EquipmentInventory />} />
              <Route path="task/:id" element={<TaskDetail />} />
              <Route path="create" element={<CreateTask />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="shifts" element={<ShiftManager />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="inspection" element={<InspectorQueue />} />
              <Route path="requests" element={<RequestStatus />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </LanguageProvider>
  );
}

export default App;
