import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";

interface Barang {
  id: string;
  nama_barang: string;
  kategori: string;
  stok: number;
  harga_beli: number;
  harga_jual: number;
  supplier: string;
}

// Inisialisasi form kosong (ditambahkan state ukuran lokal untuk UI)
const emptyForm = { nama_barang: "", kategori: "", ukuran: "", stok: 0, harga_beli: 0, harga_jual: 0, supplier: "" };

export default function Inventaris() {
  const [barang, setBarang] = useState<Barang[]>([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("semua");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadBarang(); }, []);

  const loadBarang = async () => {
    const { data } = await supabase.from("barang").select("*").order("created_at", { ascending: false });
    // Perbaikan Error 1: Type casting ke Barang[] agar garis merah hilang
    setBarang((data as Barang[]) || []);
  };

  // LOGIKA AUTO-FILL: Otomatis mengisi data ketika nama produk lama dipilih
  const handleNamaBarangChange = (nama: string) => {
    const barangSama = barang.find((b) => b.nama_barang.toLowerCase() === nama.toLowerCase());

    if (barangSama && !editId) {
      setForm({
        ...form,
        nama_barang: nama,
        kategori: barangSama.kategori || "",
        harga_beli: barangSama.harga_beli || 0,
        harga_jual: barangSama.harga_jual || 0,
        supplier: barangSama.supplier || "",
        ukuran: "", // Bersihkan ukuran agar user bisa menentukan ukuran baru jika bervariasi
      });
    } else {
      setForm({ ...form, nama_barang: nama });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Memisahkan 'ukuran' dari data database utama agar tidak memicu error skema Supabase
    const { ukuran, ...payloadDatabase } = form;

    // Jika user mengisi ukuran, gabungkan ke dalam nama produk (misal: "Semen Tiga Roda - 50kg")
    const namaFinal = ukuran ? `${payloadDatabase.nama_barang} - ${ukuran}` : payloadDatabase.nama_barang;
    const dataToSave = { ...payloadDatabase, nama_barang: namaFinal };

    try {
      if (editId) {
        // Perbaikan Error 2: Gunakan (dataToSave as any) untuk menghindari error skema strict TypeScript
        const { error } = await supabase.from("barang").update(dataToSave as any).eq("id", editId);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Barang berhasil diupdate" });
      } else {
        const { error } = await supabase.from("barang").insert(dataToSave as any);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Barang berhasil ditambahkan" });
      }
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      loadBarang();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Barang) => {
    setForm({
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      ukuran: "", // Kosongkan ukuran saat edit agar tidak menumpuk teks nama
      stok: item.stok,
      harga_beli: item.harga_beli,
      harga_jual: item.harga_jual,
      supplier: item.supplier
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    await supabase.from("barang").delete().eq("id", id);
    toast({ title: "Dihapus", description: "Barang berhasil dihapus" });
    loadBarang();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  // Mengambil daftar nama unik untuk opsi dropdown otomatis (datalist)
  const namaBarangList = [...new Set(barang.map((b) => b.nama_barang.split(" - ")[0]))];
  const kategoriList = [...new Set(barang.map((b) => b.kategori).filter(Boolean))];

  const filtered = barang.filter((b) => {
    const matchSearch = b.nama_barang.toLowerCase().includes(search.toLowerCase()) || b.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === "semua" || b.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Inventaris</h1>
            <p className="text-muted-foreground">Kelola stok barang Anda</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">{editId ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Auto-Suggest Input dengan datalist */}
                <div>
                  <Label>Nama Barang</Label>
                  <Input
                    value={form.nama_barang}
                    onChange={(e) => handleNamaBarangChange(e.target.value)}
                    list="nama-barang-options"
                    required
                    className="bg-secondary border-border mt-1"
                    placeholder="Ketik nama atau klik opsi yang muncul..."
                  />
                  <datalist id="nama-barang-options">
                    {namaBarangList.map((nama) => (
                      <option key={nama} value={nama} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kategori</Label>
                    <Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} required className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label>Ukuran / Varian</Label>
                    <Input value={form.ukuran} onChange={(e) => setForm({ ...form, ukuran: e.target.value })} className="bg-secondary border-border mt-1" placeholder="Contoh: XL, 40x40, 10ml" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Stok</Label>
                    <Input type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: parseInt(e.target.value) || 0 })} className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label>Harga Beli</Label>
                    <Input type="number" value={form.harga_beli} onChange={(e) => setForm({ ...form, harga_beli: parseInt(e.target.value) || 0 })} className="bg-secondary border-border mt-1" />
                  </div>
                  <div>
                    <Label>Harga Jual</Label>
                    <Input type="number" value={form.harga_jual} onChange={(e) => setForm({ ...form, harga_jual: parseInt(e.target.value) || 0 })} className="bg-secondary border-border mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Supplier</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? "Menyimpan..." : editId ? "Update" : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari barang..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={filterKategori} onValueChange={setFilterKategori}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary border-border">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="semua">Semua Kategori</SelectItem>
              {kategoriList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nama & Ukuran</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Kategori</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stok</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Harga Beli</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Harga Jual</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">Supplier</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Belum ada barang
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-4 font-medium">{b.nama_barang}</td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{b.kategori}</span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 ${b.stok < 10 ? "text-destructive" : ""}`}>
                          {b.stok < 10 && <AlertTriangle className="h-3 w-3" />}
                          {b.stok}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{formatCurrency(b.harga_beli)}</td>
                      <td className="p-4">{formatCurrency(b.harga_jual)}</td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">{b.supplier}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(b)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}