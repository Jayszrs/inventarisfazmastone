import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  LogOut,
  UserCog,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { AppRole, useAuth } from "@/contexts/AuthContext";
import LOGO_URL from "@/assets/logo-fazma.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems: Array<{ title: string; url: string; icon: typeof LayoutDashboard; roles?: AppRole[] }> = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Invoice", url: "/invoice", icon: FileText, roles: ["admin", "staff"] },
  { title: "Dokumentasi", url: "/dokumentasi", icon: FolderOpen, roles: ["admin"] },
  { title: "Role Management", url: "/roles", icon: UserCog, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, signOut } = useAuth();
  const visibleMenuItems = menuItems.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-auto py-3">
            <div className={collapsed ? "flex w-full justify-center" : "flex w-full items-center gap-3"}>
              <img
                src={LOGO_URL}
                alt="Fazma Stone"
                className={collapsed ? "h-8 w-8 object-contain" : "h-10 w-auto max-w-[150px] object-contain"}
              />
              {!collapsed && role && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {role}
                </span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-accent/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              className="hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Keluar</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
