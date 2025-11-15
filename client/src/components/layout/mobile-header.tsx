import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const { toggleSidebar, isMobile, toggleCollapse, isCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile hamburger menu */}
      {isMobile && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-40 flex items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="ml-3 text-lg font-bold text-primary">CloudnotesAI</h1>
        </div>
      )}

      {/* Desktop toggle button */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "fixed top-4 z-50 transition-all duration-300 hover:bg-accent hover:text-accent-foreground",
            "rounded-full shadow-md border border-border bg-card",
            "h-9 w-9",
            isCollapsed ? "left-[72px]" : "left-[268px]"
          )}
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}
    </>
  );
}
