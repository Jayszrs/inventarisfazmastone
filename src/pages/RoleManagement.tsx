import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, ShieldCheck, UserCog } from "lucide-react";

type ManagedUser = {
  user_id: string;
  email: string;
  created_at: string;
  roles: AppRole[];
};

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  staff: "Staff",
  user: "User",
};

const formatDate = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getPrimaryRole = (roles: AppRole[] = []): AppRole => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return "user";
};

export default function RoleManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      await (supabase as any).rpc("claim_allowed_admin_role");
      const { data, error } = await (supabase as any).rpc("admin_list_users_with_roles");
      if (error) throw error;
      setUsers((data || []) as ManagedUser[]);
    } catch (error: any) {
      toast({
        title: "Gagal memuat user",
        description: error.message || "Pastikan migration role management sudah dijalankan di Supabase.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (user: ManagedUser, role: AppRole) => {
    setSavingUserId(user.user_id);
    try {
      const { error } = await (supabase as any).rpc("admin_set_user_role", {
        target_user_id: user.user_id,
        target_role: role,
      });
      if (error) throw error;

      setUsers((items) =>
        items.map((item) => (item.user_id === user.user_id ? { ...item, roles: [role] } : item)),
      );
      toast({ title: "Role diperbarui", description: `${user.email} sekarang menjadi ${roleLabels[role]}.` });
    } catch (error: any) {
      toast({ title: "Gagal mengubah role", description: error.message, variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return users;
    return users.filter((user) => {
      const role = getPrimaryRole(user.roles);
      return `${user.email} ${role}`.toLowerCase().includes(query);
    });
  }, [users, search]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Role Management</h1>
            <p className="text-sm text-muted-foreground">Lihat semua user dan atur hak akses admin, staff, atau user.</p>
          </div>
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </Button>
        </div>

        <div className="glass-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Cari User</h2>
          </div>
          <div className="space-y-2">
            <Label>Email atau Role</Label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari email, admin, staff, atau user" />
          </div>
        </div>

        <div className="glass-card overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Daftar User</h2>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
              {filteredUsers.length} user
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Tanggal Daftar</TableHead>
                  <TableHead>Role Saat Ini</TableHead>
                  <TableHead className="w-56">Ubah Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Memuat user...</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada user ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const role = getPrimaryRole(user.roles);
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                            <ShieldCheck className="mr-1 h-3 w-3" /> {roleLabels[role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={role} onValueChange={(value) => updateRole(user, value as AppRole)} disabled={savingUserId === user.user_id}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
