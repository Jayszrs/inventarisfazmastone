import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Search, ShieldCheck, UserCog, UserPlus, Trash2 } from "lucide-react";

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
  const { refreshRole, user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // State untuk Form Create (Tambah Akses)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("staff");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // 1. READ: Memuat seluruh daftar user beserta rolenya
  const loadUsers = async () => {
    setLoading(true);
    try {
      await (supabase as any).rpc("claim_allowed_admin_role");
      await refreshRole();

      const { data, error } = await (supabase as any).rpc("admin_list_users_with_roles");
      if (error) throw error;
      setUsers((data || []) as ManagedUser[]);
    } catch (error: any) {
      toast({
        title: "Gagal memuat user",
        description: error.message || "Terjadi kesalahan hak akses database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. CREATE: Menambahkan baris hak akses baru ke tabel user_roles
  const handleAddUserRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim()) {
      toast({ title: "ID User Wajib Diisi", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: newUserId.trim(),
          role: newRole
        });

      if (error) throw error;

      toast({
        title: "Akses Berhasil Ditambahkan",
        description: `User ID tersebut kini memiliki hak akses sebagai ${roleLabels[newRole]}.`,
      });
      
      setIsAddDialogOpen(false);
      setNewUserId("");
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Gagal menambahkan akses",
        description: error.message || "Pastikan UUID User ID valid dan terdaftar di sistem Auth.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 3. UPDATE: Mengubah hak akses yang sudah ada
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
      
      await refreshRole();
    } catch (error: any) {
      toast({ title: "Gagal mengubah role", description: error.message, variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

  // 4. DELETE: Mencabut/Menghapus entri role milik user menggunakan RPC yang aman
  const handleDeleteUserRole = async (userId: string, email: string) => {
    try {
      const { error } = await (supabase as any).rpc("admin_delete_user_role", {
        target_user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Akses Dicabut",
        description: `Seluruh hak akses khusus untuk ${email} berhasil dihapus.`,
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Gagal mencabut akses",
        description: error.message || "Terjadi kesalahan pada server database.",
        variant: "destructive",
      });
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
        
        {/* Header Section */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Role Management</h1>
            <p className="text-sm text-muted-foreground">Kelola hak akses penuh akun Admin, Staff, atau User lapangan.</p>
          </div>
          <div className="flex gap-2">
            {/* Dialog Create / Tambah Akses */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Tambah Akses
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddUserRole}>
                  <DialogHeader>
                    <DialogTitle>Tambah Akses User</DialogTitle>
                    <DialogDescription>
                      Masukkan User ID (UUID) dari pengguna yang sudah terdaftar untuk diberikan hak akses khusus.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="userId">User ID (UUID)</Label>
                      <Input
                        id="userId"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        placeholder="Contoh: 123e4567-e89b-12d3-a456-426614174000"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="role">Pilih Tingkat Akses (Role)</Label>
                      <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Pilih Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin (Akses Penuh)</SelectItem>
                          <SelectItem value="staff">Staff (Invoice & Nota)</SelectItem>
                          <SelectItem value="user">User (Hanya Dashboard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button type="submit" disabled={isCreating} className="bg-primary text-white">
                      {isCreating ? "Menyimpan..." : "Simpan Akses"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar Container */}
        <div className="glass-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Cari Anggota Tim</h2>
          </div>
          <div className="space-y-2">
            <Label>Email atau Role</Label>
            <Input 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Ketik email atau tingkatan role untuk menyaring data..." 
            />
          </div>
        </div>

        {/* CRUD Table List */}
        <div className="glass-card overflow-hidden rounded-lg">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Daftar Pengguna Sistem</h2>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary px-3 py-1">
              {filteredUsers.length} Terdaftar
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alamat Email</TableHead>
                  <TableHead>Tanggal Bergabung</TableHead>
                  <TableHead>Status Jabatan</TableHead>
                  <TableHead className="w-48">Ubah Jabatan</TableHead>
                  <TableHead className="w-24 text-center">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Memuat baris data tim...</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Tidak ada user ditemukan</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const role = getPrimaryRole(user.roles);
                    const isSelf = currentUser?.id === user.user_id;

                    return (
                      <TableRow key={user.user_id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {user.email} {isSelf && <span className="text-xs text-primary font-bold">(Anda)</span>}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary font-medium">
                            <ShieldCheck className="mr-1 h-3 w-3 inline" /> {roleLabels[role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={role} 
                            onValueChange={(value) => updateRole(user, value as AppRole)} 
                            disabled={savingUserId === user.user_id || isSelf}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Alert Dialog Delete / Cabut Akses */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-md transition-colors"
                                disabled={isSelf}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cabut Hak Akses?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Apakah Anda yakin ingin menghapus hak akses khusus untuk <strong>{user.email}</strong>? Pengguna ini akan kehilangan semua privilese di dalam aplikasi.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUserRole(user.user_id, user.email)}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Ya, Cabut Akses
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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