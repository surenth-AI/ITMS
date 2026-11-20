import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Users, 
  AlertTriangle, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  Building,
  Package,
  MapPin,
  Warehouse,
  ShieldCheck,
  BellRing,
  Clock,
  Brain,
  BookOpen,
  Tag,
  DollarSign,
  Calculator,
  FileText,
  FileWarning
} from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();

  const allNavItems = [
    { icon: LayoutDashboard, name: 'Dashboard', path: '/dashboard', roles: ['admin', 'dispatcher', 'analyst', 'client'] },
    { icon: BookOpen, name: 'Bookings', path: '/bookings', roles: ['admin', 'dispatcher', 'client'] },
    { icon: Map, name: 'Trip Management', path: '/trips', roles: ['admin', 'dispatcher'] },
    { icon: Tag, name: 'Service Types', path: '/service-types', roles: ['admin'] },
    { icon: DollarSign, name: 'Price Lists', path: '/price-lists', roles: ['admin'] },
    { icon: Calculator, name: 'Quotes', path: '/quotes', roles: ['admin', 'dispatcher'] },
    { icon: FileText, name: 'Invoices', path: '/invoices', roles: ['admin', 'dispatcher'] },
    { icon: FileWarning, name: 'POD Outstanding', path: '/pod-outstanding', roles: ['admin', 'dispatcher'] },
    { icon: Truck, name: 'Fleet Status', path: '/fleet', roles: ['admin', 'dispatcher', 'fleet_manager', 'analyst'] },
    { icon: Package, name: 'Shipments', path: '/shipments', roles: ['admin', 'dispatcher', 'warehouse_manager'] },
    { icon: Warehouse, name: 'Warehouses', path: '/warehouses', roles: ['admin', 'warehouse_manager'] },
    { icon: MapPin, name: 'Locations', path: '/locations', roles: ['admin', 'warehouse_manager'] },
    { icon: Building, name: 'Clients', path: '/clients', roles: ['admin', 'dispatcher'] },
    { icon: Users, name: 'Drivers', path: '/drivers', roles: ['admin', 'fleet_manager'] },
    { icon: ShieldCheck, name: 'Users', path: '/users', roles: ['admin'] },
    { icon: Clock, name: 'Attendance', path: '/attendance', roles: ['admin', 'fleet_manager'] },
    { icon: AlertTriangle, name: 'Alerts', path: '/alerts', roles: ['admin', 'dispatcher', 'fleet_manager'] },
    { icon: Brain, name: 'AI Audit', path: '/ai-audit', roles: ['admin', 'analyst'] },
    { icon: BellRing, name: 'Notifications', path: '/notifications', roles: ['admin'] },
    { icon: Settings, name: 'Settings', path: '/settings', roles: ['admin'] },
  ];

  const navItems = allNavItems.filter(item => {
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 h-full min-h-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-colors duration-200">
        <div className="p-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-wide flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Map size={14} className="text-white" />
            </div>
            ITMS
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs tracking-wider uppercase mt-2 font-medium">Command Center</p>
        </div>
        
        {/* Only the menu scrolls; header and user footer stay fixed at any zoom level */}
        <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 border-l-2 border-primary' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <p className="text-sm text-zinc-900 dark:text-zinc-200 font-medium">{user?.full_name}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">{user?.role}</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-white hover:bg-red-50 dark:hover:bg-zinc-800 py-2 rounded-md transition-colors text-sm font-medium w-full"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
        {children}
      </main>
    </div>
  );
};

export default Layout;
