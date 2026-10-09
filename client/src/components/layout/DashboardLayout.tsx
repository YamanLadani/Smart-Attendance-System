import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-[260px] transition-all duration-300 min-h-screen">
        <Header />
        <main className="px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
