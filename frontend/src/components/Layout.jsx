import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    const items = [];

    if (employee?.role === 'Admin') {
      items.push(
        { path: '/admin/users', label: 'إدارة المستخدمين', icon: '👥' },
        { path: '/admin/products', label: 'المنتجات', icon: '📦' },
        { path: '/admin/operations', label: 'العمليات', icon: '⚙️' },
        { path: '/planner/job-orders', label: 'أوامر العمل', icon: '📋' },
        { path: '/admin/statistics', label: 'الإحصائيات', icon: '📊' },
        { path: '/admin/analytics', label: 'الرسومات البيانية', icon: '📈' }
      );
    }

    if (employee?.role === 'Planner') {
      items.push(
        { path: '/planner/dashboard', label: 'لوحة التحكم', icon: '📈' },
        { path: '/planner/job-orders', label: 'أوامر العمل', icon: '📋' },
        // Access admin stats/analytics like admin, but without user management
        { path: '/admin/statistics', label: 'الإحصائيات', icon: '📊' },
        { path: '/admin/analytics', label: 'الرسومات البيانية', icon: '📈' }
      );
    }

    if (employee?.role === 'Supervisor') {
      items.push(
        { path: '/supervisor/pending', label: 'قيد الانتظار', icon: '⏳' },
        { path: '/supervisor/dashboard', label: 'لوحة التحكم', icon: '📊' }
      );
    }

    if (employee?.role === 'Technician') {
      items.push(
        { path: '/technician/work-entries', label: 'قائمة العمل', icon: '📝' },
        { path: '/technician/history', label: 'سجل الأعمال', icon: '📜' },
        { path: '/technician/breaks', label: 'الاستراحات', icon: '☕' },
        { path: '/technician/leaves', label: 'الإجازات', icon: '🏖️' }
      );
    }

    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={() => setShowSidebar((s) => !s)}
                className="p-2 rounded-md border border-gray-200 hover:bg-gray-100"
                title={showSidebar ? 'إخفاء القائمة' : 'إظهار القائمة'}
                aria-label="Toggle sidebar"
              >
                {/* Icon: hamburger/menu */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-700">
                  <path d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25c0-.414.336-.75.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-primary-700">نظام تتبع العمليات</h1>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-gray-700">
                {employee?.name} ({employee?.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-4rem)]">
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center space-x-3 space-x-reverse p-3 rounded-lg transition ${
                        location.pathname === item.path
                          ? 'bg-primary-100 text-primary-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

