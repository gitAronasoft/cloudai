import { Sidebar } from "./sidebar";
import { MobileHeader } from "./mobile-header";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isMobile, isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileHeader />
      
      <div 
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          isMobile && "pt-14" // Add padding-top for mobile header
        )}
      >
        {children}
      </div>
    </div>
  );
}
