import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/contexts/sidebar-context";
import { 
  Square, 
  BarChart3, 
  Users, 
  Plus, 
  Mail, 
  Edit,
  Shield,
  LogOut,
  Home as HomeIcon
} from "lucide-react";

const navigationItems = [
  { name: "Home", path: "/", icon: HomeIcon },
  { name: "Cases", path: "/cases", icon: Users },
  { name: "Reports", path: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { name: "Support", path: "/support", icon: Mail },
  { name: "Settings", path: "/settings", icon: Edit },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { isCollapsed, isMobile } = useSidebar();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const showText = !isCollapsed || isMobile;

  return (
    <div className="h-full bg-card flex flex-col">
      {/* App Header */}
      <div className={cn("p-6 border-b border-border", isCollapsed && !isMobile && "p-3")}>
        {showText ? (
          <>
            <h1 className="text-xl font-bold text-primary">CloudnotesAI</h1>
            {user && (
              <div className="mt-2 text-xs text-muted-foreground">
                {user.firstName} {user.lastName}
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3" />
                  {user.role === 'admin' ? 'Administrator' : 'Team Member'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Menu */}
      <nav className={cn("flex-1 p-4 space-y-2", isCollapsed && !isMobile && "p-2")}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary hover:bg-muted",
                isCollapsed && !isMobile && "justify-center px-2"
              )}
              data-testid={`link-${item.name.toLowerCase()}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {showText && <span>{item.name}</span>}
            </Link>
          );
        })}
        
        {/* Admin-only sections */}
        {user?.role === 'admin' && (
          <>
            <Link
              href="/templates"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                location === "/templates"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary hover:bg-muted",
                isCollapsed && !isMobile && "justify-center px-2"
              )}
              data-testid="link-templates"
            >
              <Plus className="w-5 h-5 shrink-0" />
              {showText && <span>Templates</span>}
            </Link>
            <Link
              href="/team-management"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                location === "/team-management"
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary hover:bg-muted",
                isCollapsed && !isMobile && "justify-center px-2"
              )}
              data-testid="link-team"
            >
              <Shield className="w-5 h-5 shrink-0" />
              {showText && <span>Users</span>}
            </Link>
          </>
        )}
      </nav>
      
      {/* Bottom Navigation */}
      <div className={cn("p-4 border-t border-border space-y-2", isCollapsed && !isMobile && "p-2")}>
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary hover:bg-muted",
                isCollapsed && !isMobile && "justify-center px-2"
              )}
              data-testid={`link-${item.name.toLowerCase()}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {showText && <span>{item.name}</span>}
            </Link>
          );
        })}
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 px-3",
            isCollapsed && !isMobile && "justify-center px-2"
          )}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {showText && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { isOpen, closeSidebar, isMobile, isCollapsed } = useSidebar();

  // Mobile: render as Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeSidebar()}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onNavigate={closeSidebar} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: render as fixed sidebar with collapse
  return (
    <aside
      className={cn(
        "hidden lg:block border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <SidebarContent />
    </aside>
  );
}
