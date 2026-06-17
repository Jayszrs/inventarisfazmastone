import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Package, Maximize2, DollarSign, PlusCircle, MinusCircle, Save, RotateCcw } from "lucide-react";

interface Barang {
  id: string;
  nama_barang: string;
  kategori: string;
  stok: number;
  harga_beli: number;
  harga_jual: number;
  supplier: string;
}

interface BarangHistory {
  nama_barang: string;
  ukuran: string;
  harga: number;
}

const emptyForm = { nama_barang: "", kategori: "", stok: 0, harga_beli: 0, harga_jual: 0, supplier: "" };
const HISTORY_SUGGESTION_LIMIT = 50;
const HIDDEN_HISTORY_STORAGE_KEY = "fazma_hidden_barang_histories";
const LOW_STOCK_LIMIT = 10;

const isMissingUkuranColumn = (error?: { message?: string } | null) =>
  Boolean(error?.message?.toLowerCase().includes("detail_transaksi.ukuran"));

const normalizeHistoryText = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeHistoryPrice = (value: number) => Number(value) || 0;
const getHistoryKey = (history: BarangHistory) =>
  `${normalizeHistoryText(history.nama_barang)}|${normalizeHistoryText(history.ukuran)}|${normalizeHistoryPrice(history.harga)}`;
const getHistoryIdentity = (history: Pick<BarangHistory, "nama_barang" | "ukuran">) =>
  `${normalizeHistoryText(history.nama_barang)}|${normalizeHistoryText(history.ukuran)}`;
const normalizeStoredHistoryKey = (key: string) => {
  const [namaBarang = "", ukuran = "", harga = "0"] = key.split("|");
  return `${normalizeHistoryText(namaBarang)}|${normalizeHistoryText(ukuran)}|${normalizeHistoryPrice(Number(harga))}`;
};

const readHiddenHistoryKeys = () => {
  try {
    const keys = JSON.parse(localStorage.getItem(HIDDEN_HISTORY_STORAGE_KEY) || "[]") as string[];
    return Array.from(new Set(keys.map(normalizeStoredHistoryKey)));
  } catch {
    return [];
  }
};

const saveHiddenHistoryKeys = (keys: string[]) => {
  localStorage.setItem(HIDDEN_HISTORY_STORAGE_KEY, JSON.stringify(keys));
};

export default function Inventaris() {
  const [barang, setBarang] = useState<Barang[]>([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("semua");
  const [filterStok, setFilterStok] = useState("semua");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState<Barang | null>(null);
  const [stockMode, setStockMode] = useState<"add" | "subtract">("add");
  const [stockAmount, setStockAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState<BarangHistory[]>([]);
  const [hiddenHistoryKeys, setHiddenHistoryKeys] = useState<string[]>(readHiddenHistoryKeys);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();

  useEffect(() => {
    loadBarang();
    loadBarangHistories();
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!formRef.current?.contains(event.target as Node)) {
        setSuggestionOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const loadBarang = async () => {
    const { data } = await supabase.from("barang").select("*").order("created_at", { ascending: false });
    setBarang(data || []);
  };

  const loadBarangHistories = async () => {
    const master = await supabase
      .from("barang")
      .select("nama_barang,kategori,harga_jual")
      .order("created_at", { ascending: false });

    let details: any = await (supabase as any)
      .from("detail_transaksi")
      .select("ukuran,harga,barang:barang_id(nama_barang,kategori)")
      .order("created_at", { ascending: false });

    if (isMissingUkuranColumn(details.error)) {
      details = await (supabase as any)
        .from("detail_transaksi")
        .select("harga,barang:barang_id(nama_barang,kategori)")
        .order("created_at", { ascending: false });
    }

    const rows: BarangHistory[] = [
      ...((master.data || []) as any[]).map((item) => ({
        nama_barang: item.nama_barang,
        ukuran: item.kategori || "-",
        harga: Number(item.harga_jual) || 0,
      })),
      ...((details.data || []) as any[]).map((item) => ({
        nama_barang: item.barang?.nama_barang,
        ukuran: item.ukuran || item.barang?.kategori || "-",
        harga: Number(item.harga) || 0,
      })),
    ].filter((item) => item.nama_barang?.trim());

    const unique = Array.from(
      new Map(rows.map((item) => [`${item.nama_barang.toLowerCase()}|${item.ukuran.toLowerCase()}|${item.harga}`, item])).values(),
    );

    const hiddenKeys = readHiddenHistoryKeys();
    setHistories(unique.filter((item) => !hiddenKeys.includes(getHistoryKey(item))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        const { error } = await supabase.from("barang").update(form).eq("id", editId);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Barang berhasil diupdate" });
      } else {
        const { error } = await supabase.from("barang").insert(form);
        if (error) throw error;
        toast({ title: "Berhasil", description: "Barang berhasil ditambahkan" });
      }
      const savedHistoryIdentity = getHistoryIdentity({
        nama_barang: form.nama_barang,
        ukuran: form.kategori,
      });
      const nextHiddenKeys = readHiddenHistoryKeys().filter((key) => !key.startsWith(`${savedHistoryIdentity}|`));
      saveHiddenHistoryKeys(nextHiddenKeys);
      setHiddenHistoryKeys(nextHiddenKeys);
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
      setSuggestionOpen(false);
      loadBarang();
      loadBarangHistories();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Barang) => {
    setForm({ nama_barang: item.nama_barang, kategori: item.kategori, stok: item.stok, harga_beli: item.harga_beli, harga_jual: item.harga_jual, supplier: item.supplier });
    setEditId(item.id);
    setOpen(true);
    setSuggestionOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (role !== "admin") {
      toast({ title: "Akses ditolak", description: "Hanya admin yang bisa menghapus barang.", variant: "destructive" });
      return;
    }
    if (!confirm("Yakin ingin menghapus barang ini?")) return;
    const { error } = await supabase.from("barang").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dihapus", description: "Barang berhasil dihapus" });
    loadBarang();
  };

  const openStockAdjust = (item: Barang, mode: "add" | "subtract") => {
    setStockItem(item);
    setStockMode(mode);
    setStockAmount(1);
    setStockOpen(true);
  };

  const submitStockAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stockItem) return;

    const amount = Math.max(0, Number(stockAmount) || 0);
    if (amount <= 0) {
      toast({ title: "Jumlah stok wajib lebih dari 0", variant: "destructive" });
      return;
    }

    const nextStock = stockMode === "add" ? stockItem.stok + amount : stockItem.stok - amount;
    if (nextStock < 0) {
      toast({ title: "Stok tidak boleh minus", description: `Stok tersedia saat ini ${stockItem.stok}.`, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("barang").update({ stok: nextStock }).eq("id", stockItem.id);
    setLoading(false);

    if (error) {
      toast({ title: "Gagal update stok", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Stok diperbarui",
      description: `${stockItem.nama_barang}: ${stockItem.stok} menjadi ${nextStock}.`,
    });
    setStockOpen(false);
    setStockItem(null);
    loadBarang();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const kategoriList = [...new Set(barang.map((b) => b.kategori).filter(Boolean))];

  const stockSummary = useMemo(() => {
    const totalItem = barang.length;
    const totalStok = barang.reduce((sum, item) => sum + (Number(item.stok) || 0), 0);
    const stokRendah = barang.filter((item) => item.stok > 0 && item.stok < LOW_STOCK_LIMIT).length;
    const stokKosong = barang.filter((item) => item.stok <= 0).length;
    const nilaiStok = barang.reduce((sum, item) => sum + (Number(item.stok) || 0) * (Number(item.harga_jual) || 0), 0);
    return { totalItem, totalStok, stokRendah, stokKosong, nilaiStok };
  }, [barang]);

  const filteredHistories = useMemo(() => {
    const query = form.nama_barang.trim().toLowerCase();
    const visibleHistories = histories.filter((item) => !hiddenHistoryKeys.includes(getHistoryKey(item)));
    if (!query) return visibleHistories.slice(0, HISTORY_SUGGESTION_LIMIT);
    return visibleHistories.filter((item) => item.nama_barang.toLowerCase().includes(query)).slice(0, HISTORY_SUGGESTION_LIMIT);
  }, [form.nama_barang, hiddenHistoryKeys, histories]);

  const handleHistorySelect = (history: BarangHistory) => {
    setForm((current) => ({
      ...current,
      nama_barang: history.nama_barang,
      kategori: history.ukuran,
      harga_jual: history.harga,
    }));
    setSuggestionOpen(false);
  };

  const handleHistoryDelete = (history: BarangHistory) => {
    const key = getHistoryKey(history);
    setHiddenHistoryKeys((current) => {
      const next = Array.from(new Set([...current, key]));
      saveHiddenHistoryKeys(next);
      return next;
    });
    setHistories((current) => current.filter((item) => getHistoryKey(item) !== key));
    toast({ title: "Riwayat dihapus", description: "Item tidak akan muncul lagi di autocomplete." });
  };

  const filtered = barang.filter((b) => {
    const matchSearch = b.nama_barang.toLowerCase().includes(search.toLowerCase()) || b.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === "semua" || b.kategori === filterKategori;
    const matchStok =
      filterStok === "semua" ||
      (filterStok === "rendah" && b.stok > 0 && b.stok < LOW_STOCK_LIMIT) ||
      (filterStok === "kosong" && b.stok <= 0) ||
      (filterStok === "aman" && b.stok >= LOW_STOCK_LIMIT);
    return matchSearch && matchKategori && matchStok;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Stok Barang</h1>
            <p className="text-muted-foreground">Kelola stok, harga, ukuran, dan supplier barang Fazma Stone.</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditId(null); } }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Tambah Barang
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-heading">{editId ? "Edit Data Barang" : "Tambah Stok Barang"}</DialogTitle>
              </DialogHeader>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Label>Nama Barang</Label>
                  <div className="relative mt-1">
                    <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <Input
                      value={form.nama_barang}
                      onChange={(e) => {
                        setForm({ ...form, nama_barang: e.target.value });
                        setSuggestionOpen(true);
                      }}
                      onFocus={() => setSuggestionOpen(true)}
                      required
                      className="bg-secondary border-border pl-10 focus-visible:ring-emerald-500"
                      placeholder="Ketik nama barang..."
                    />
                  </div>
                  {suggestionOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-emerald-200 bg-card shadow-xl shadow-emerald-950/10">
                      {filteredHistories.length === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          Belum ada riwayat yang cocok
                        </div>
                      )}
                      {filteredHistories.map((history) => (
                        <div
                          key={`${history.nama_barang}-${history.ukuran}-${history.harga}`}
                          className="flex w-full items-start gap-2 border-b border-border/60 px-3 py-3 transition-colors last:border-b-0 hover:bg-emerald-50/80"
                        >
                          <button
                            type="button"
                            onClick={() => handleHistorySelect(history)}
                            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left focus:outline-none"
                          >
                            <span className="min-w-0">
                            <span className="flex items-center gap-2 font-medium text-foreground">
                              <Package className="h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="truncate">{history.nama_barang}</span>
                            </span>
                            </span>
                            <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">
                              <Maximize2 className="h-3 w-3" /> {history.ukuran}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                              <DollarSign className="h-3 w-3" /> {formatCurrency(history.harga)}
                            </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHistoryDelete(history)}
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/30"
                            aria-label={`Hapus riwayat ${history.nama_barang}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Ukuran</Label>
                  <div className="relative mt-1">
                    <Maximize2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <Input value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} required className="bg-secondary border-border pl-10 focus-visible:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
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
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                      <Input type="number" value={form.harga_jual} onChange={(e) => setForm({ ...form, harga_jual: parseInt(e.target.value) || 0 })} className="bg-secondary border-border pl-10 focus-visible:ring-emerald-500" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="bg-secondary border-border mt-1" />
                </div>
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(emptyForm);
                      setEditId(null);
                      setSuggestionOpen(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Reset Form
                  </Button>
                  <Button type="submit" className="gradient-primary text-primary-foreground" disabled={loading}>
                    <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Simpan Barang"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StockSummaryCard label="Jenis Barang" value={stockSummary.totalItem.toLocaleString("id-ID")} />
          <StockSummaryCard label="Total Stok" value={stockSummary.totalStok.toLocaleString("id-ID")} />
          <StockSummaryCard label="Stok Rendah" value={stockSummary.stokRendah.toLocaleString("id-ID")} danger={stockSummary.stokRendah > 0} />
          <StockSummaryCard label="Stok Kosong" value={stockSummary.stokKosong.toLocaleString("id-ID")} danger={stockSummary.stokKosong > 0} />
          <StockSummaryCard label="Nilai Stok" value={formatCurrency(stockSummary.nilaiStok)} />
        </div>

        {/* Filters */}
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari barang..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Select value={filterStok} onValueChange={setFilterStok}>
            <SelectTrigger className="w-full bg-secondary border-border">
              <SelectValue placeholder="Status Stok" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="semua">Semua Status</SelectItem>
              <SelectItem value="aman">Stok Aman</SelectItem>
              <SelectItem value="rendah">Stok Rendah</SelectItem>
              <SelectItem value="kosong">Stok Kosong</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterKategori} onValueChange={setFilterKategori}>
            <SelectTrigger className="w-full bg-secondary border-border">
              <SelectValue placeholder="Ukuran" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="semua">Semua Ukuran</SelectItem>
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nama</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">Ukuran</th>
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
                      <td className="p-4 font-medium">
                        <div className="min-w-0">
                          <p className="break-words">{b.nama_barang}</p>
                          <p className="mt-1 text-xs text-muted-foreground sm:hidden">{b.kategori || "-"}</p>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{b.kategori}</span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 ${b.stok < LOW_STOCK_LIMIT ? "text-destructive" : ""}`}>
                          {b.stok < LOW_STOCK_LIMIT && <AlertTriangle className="h-3 w-3" />}
                          {b.stok}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{formatCurrency(b.harga_beli)}</td>
                      <td className="p-4">{formatCurrency(b.harga_jual)}</td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">{b.supplier}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button title="Edit barang" variant="ghost" size="icon" onClick={() => handleEdit(b)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button title="Tambah stok" variant="ghost" size="icon" onClick={() => openStockAdjust(b, "add")} className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button title="Kurangi stok" variant="ghost" size="icon" onClick={() => openStockAdjust(b, "subtract")} className="h-8 w-8 text-muted-foreground hover:text-warning">
                            <MinusCircle className="h-3.5 w-3.5" />
                          </Button>
                          {role === "admin" && (
                            <Button title="Hapus barang" variant="ghost" size="icon" onClick={() => handleDelete(b.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={stockOpen} onOpenChange={setStockOpen}>
          <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {stockMode === "add" ? "Tambah Stok" : "Kurangi Stok"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={submitStockAdjust} className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/60 p-4">
                <p className="font-semibold">{stockItem?.nama_barang || "-"}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase">Ukuran</p>
                    <p className="font-medium text-foreground">{stockItem?.kategori || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase">Stok Saat Ini</p>
                    <p className="font-medium text-foreground">{stockItem?.stok ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{stockMode === "add" ? "Jumlah Masuk" : "Jumlah Keluar"}</Label>
                <Input
                  type="number"
                  min={1}
                  value={stockAmount}
                  onChange={(event) => setStockAmount(parseInt(event.target.value) || 0)}
                  className="bg-secondary border-border"
                  autoFocus
                />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                Stok setelah update:{" "}
                <span className="font-bold text-primary">
                  {stockItem ? (stockMode === "add" ? stockItem.stok + (Number(stockAmount) || 0) : stockItem.stok - (Number(stockAmount) || 0)) : 0}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setStockOpen(false)}>Batal</Button>
                <Button type="submit" disabled={loading}>
                  {stockMode === "add" ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                  {loading ? "Menyimpan..." : "Simpan Stok"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function StockSummaryCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${danger ? "border-destructive/20 bg-destructive/5" : "border-border bg-card/80"}`}>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-2 break-words font-heading text-xl font-bold ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
