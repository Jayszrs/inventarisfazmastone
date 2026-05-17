import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, ClipboardList, Clock, Eye, PackagePlus, Pencil, Printer, Save, Send, Trash2, Truck } from "lucide-react";

const LOGO_URL = encodeURI("/Logo Fazma Stone Hitam.png");
const SIGNATURE_URL = encodeURI("/Signature.png");
const DELIVERY_STORAGE_KEY = "fazma_delivery_notes";
const CUSTOMER_STORAGE_KEY = "fazma_invoice_customers";

type Barang = {
  id: string;
  nama_barang: string;
  kategori: string;
  stok: number;
  harga_jual: number;
};

type CartItem = {
  barang_id?: string;
  nama_barang: string;
  kategori: string;
  ukuran: string;
  jumlah: number;
  harga: number;
  subtotal: number;
};

type TransaksiRow = {
  id: string;
  nomor_invoice: string;
  created_at: string;
  status: string;
  total: number;
  subtotal: number;
  diskon: number;
  pajak: number;
  jumlah_bayar: number;
  metode_pembayaran: string;
  nama_pelanggan?: string;
};

type InvoiceDetail = TransaksiRow & {
  items: CartItem[];
};

export type DeliveryNoteMeta = {
  transaksi_id: string;
  nomor_invoice: string;
  driver: string;
  no_polisi: string;
  lokasi_proyek: string;
  tanggal_pengiriman: string;
  created_at: string;
};

type PrintMode = "invoice" | "delivery" | null;

const today = () => new Date().toISOString().split("T")[0];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const formatDate = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatDateInput = (date?: string) => {
  if (!date) return today();
  return new Date(date).toISOString().slice(0, 10);
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const period = `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getFullYear()).slice(-2)}`;
  const suffix = String(Date.now()).slice(-5).padStart(5, "0");
  return `FZ/${period}/${suffix}`;
};

const generateDeliveryNumber = (invoiceNumber?: string) =>
  `SJ-${(invoiceNumber || "INV").replace(/[^A-Za-z0-9]/g, "-")}`;

const readDeliveryArchive = (): DeliveryNoteMeta[] => {
  try {
    return JSON.parse(localStorage.getItem(DELIVERY_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDeliveryArchive = (note: DeliveryNoteMeta) => {
  const archive = readDeliveryArchive();
  const next = [note, ...archive.filter((item) => item.transaksi_id !== note.transaksi_id)];
  localStorage.setItem(DELIVERY_STORAGE_KEY, JSON.stringify(next));
};

const readCustomerCache = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveCustomerCache = (transactionId: string, invoiceNumber: string, customerName: string) => {
  const cleanName = customerName.trim();
  if (!cleanName) return;
  const cache = readCustomerCache();
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify({
    ...cache,
    [transactionId]: cleanName,
    [invoiceNumber]: cleanName,
  }));
};

const getCachedCustomer = (transaction: Pick<TransaksiRow, "id" | "nomor_invoice" | "nama_pelanggan">) => {
  if (transaction.nama_pelanggan?.trim()) return transaction.nama_pelanggan;
  const cache = readCustomerCache();
  return cache[transaction.id] || cache[transaction.nomor_invoice] || "";
};

export default function Invoice() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransaksiRow[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemNamaBarang, setItemNamaBarang] = useState("");
  const [itemUkuran, setItemUkuran] = useState("");
  const [itemJumlah, setItemJumlah] = useState(1);
  const [itemHarga, setItemHarga] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);
  const [deliveryMeta, setDeliveryMeta] = useState<DeliveryNoteMeta | null>(null);
  const [form, setForm] = useState({
    nomor_invoice: generateInvoiceNumber(),
    tanggal_transaksi: today(),
    nama_pelanggan: "",
    metode_pembayaran: "cash",
    status: "lunas",
  });
  const [deliveryForm, setDeliveryForm] = useState({
    driver: "",
    no_polisi: "",
    lokasi_proyek: "",
    tanggal_pengiriman: today(),
  });
  const [editForm, setEditForm] = useState({
    nomor_invoice: "",
    tanggal_transaksi: today(),
    nama_pelanggan: "",
    metode_pembayaran: "cash",
    status: "lunas",
  });
  const [editCart, setEditCart] = useState<CartItem[]>([]);
  const [editItemNamaBarang, setEditItemNamaBarang] = useState("");
  const [editItemUkuran, setEditItemUkuran] = useState("");
  const [editItemJumlah, setEditItemJumlah] = useState(1);
  const [editItemHarga, setEditItemHarga] = useState(0);

  const grandTotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const editGrandTotal = useMemo(() => editCart.reduce((sum, item) => sum + item.subtotal, 0), [editCart]);

  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel("invoice-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transaksi" }, loadTransactions)
      .subscribe();

    const clearPrintState = () => setPrintMode(null);
    window.addEventListener("afterprint", clearPrintState);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("afterprint", clearPrintState);
    };
  }, []);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("transaksi")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Gagal memuat invoice", description: error.message, variant: "destructive" });
      return;
    }

    setTransactions(((data || []) as TransaksiRow[]).map((transaction) => ({
      ...transaction,
      nama_pelanggan: getCachedCustomer(transaction),
    })));
  };

  const addCartItem = () => {
    const namaBarang = itemNamaBarang.trim();
    if (!namaBarang) {
      toast({ title: "Nama barang wajib diisi", variant: "destructive" });
      return;
    }

    if (itemJumlah <= 0 || itemHarga <= 0) {
      toast({ title: "Jumlah dan harga harus lebih dari 0", variant: "destructive" });
      return;
    }

    setCart((items) => [
      ...items,
      {
        nama_barang: namaBarang,
        kategori: itemUkuran || "-",
        ukuran: itemUkuran || "-",
        jumlah: itemJumlah,
        harga: itemHarga,
        subtotal: itemJumlah * itemHarga,
      },
    ]);
    setItemNamaBarang("");
    setItemUkuran("");
    setItemJumlah(1);
    setItemHarga(0);
  };

  const removeCartItem = (index: number) => {
    setCart((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const insertMasterTransaction = async () => {
    const payload = {
      nomor_invoice: form.nomor_invoice,
      created_at: `${form.tanggal_transaksi}T00:00:00`,
      subtotal: grandTotal,
      total: grandTotal,
      diskon: 0,
      pajak: 0,
      metode_pembayaran: form.metode_pembayaran,
      status: form.status,
      jumlah_bayar: form.status === "lunas" ? grandTotal : 0,
      user_id: user?.id,
      nama_pelanggan: form.nama_pelanggan,
    };

    const first = await supabase.from("transaksi").insert(payload as any).select("*").single();
    if (!first.error) return first.data as TransaksiRow;

    if (!first.error.message.toLowerCase().includes("nama_pelanggan")) throw first.error;

    const { nama_pelanggan, ...fallbackPayload } = payload;
    const second = await supabase.from("transaksi").insert(fallbackPayload as any).select("*").single();
    if (second.error) throw second.error;
    return { ...(second.data as TransaksiRow), nama_pelanggan: form.nama_pelanggan };
  };

  const resolveBarangForItem = async (item: CartItem): Promise<CartItem & { barang_id: string }> => {
    const cleanName = item.nama_barang.trim();
    const { data: existing, error: findError } = await supabase
      .from("barang")
      .select("id,nama_barang,kategori,stok,harga_jual")
      .ilike("nama_barang", cleanName)
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    if (existing?.id) {
      return {
        ...item,
        barang_id: existing.id,
        kategori: item.kategori || existing.kategori || "-",
      };
    }

    const { data: created, error: createError } = await supabase
      .from("barang")
      .insert({
        nama_barang: cleanName,
        kategori: item.ukuran || "Custom",
        stok: 0,
        harga_beli: 0,
        harga_jual: item.harga,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    return {
      ...item,
      barang_id: created.id,
      kategori: item.kategori || item.ukuran || "Custom",
    };
  };

  const insertDetailTransactions = async (transaksiId: string, sourceItems = cart) => {
    const resolvedItems = await Promise.all(sourceItems.map(resolveBarangForItem));
    const detailPayload = resolvedItems.map((item) => ({
      transaksi_id: transaksiId,
      barang_id: item.barang_id,
      jumlah: item.jumlah,
      harga: item.harga,
      ukuran: item.ukuran,
    }));

    const first = await supabase.from("detail_transaksi").insert(detailPayload as any);
    if (!first.error) return;

    if (!first.error.message.toLowerCase().includes("ukuran")) throw first.error;

    const fallbackPayload = detailPayload.map(({ ukuran, ...item }) => item);
    const second = await supabase.from("detail_transaksi").insert(fallbackPayload as any);
    if (second.error) throw second.error;
  };

  const submitInvoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nama_pelanggan.trim()) {
      toast({ title: "Nama pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Keranjang masih kosong", description: "Tambahkan minimal satu barang.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const transaksi = await insertMasterTransaction();
      await insertDetailTransactions(transaksi.id);

      saveCustomerCache(transaksi.id, transaksi.nomor_invoice, form.nama_pelanggan);
      toast({ title: "Invoice tersimpan", description: `${form.nomor_invoice} berhasil dibuat.` });
      setForm({
        nomor_invoice: generateInvoiceNumber(),
        tanggal_transaksi: today(),
        nama_pelanggan: "",
        metode_pembayaran: "cash",
        status: "lunas",
      });
      setCart([]);
      loadTransactions();
    } catch (error: any) {
      toast({ title: "Gagal menyimpan invoice", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addEditCartItem = () => {
    const namaBarang = editItemNamaBarang.trim();
    if (!namaBarang) {
      toast({ title: "Nama barang wajib diisi", variant: "destructive" });
      return;
    }

    if (editItemJumlah <= 0 || editItemHarga <= 0) {
      toast({ title: "Jumlah dan harga harus lebih dari 0", variant: "destructive" });
      return;
    }

    setEditCart((items) => [
      ...items,
      {
        nama_barang: namaBarang,
        kategori: editItemUkuran || "-",
        ukuran: editItemUkuran || "-",
        jumlah: editItemJumlah,
        harga: editItemHarga,
        subtotal: editItemJumlah * editItemHarga,
      },
    ]);
    setEditItemNamaBarang("");
    setEditItemUkuran("");
    setEditItemJumlah(1);
    setEditItemHarga(0);
  };

  const removeEditCartItem = (index: number) => {
    setEditCart((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateEditCartItem = (index: number, patch: Partial<CartItem>) => {
    setEditCart((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        return {
          ...next,
          subtotal: (next.jumlah || 0) * (next.harga || 0),
        };
      }),
    );
  };

  const openEditInvoice = async (transaction: TransaksiRow) => {
    const detail = await getInvoiceDetail(transaction);
    if (!detail) return;

    setEditingInvoiceId(detail.id);
    setEditForm({
      nomor_invoice: detail.nomor_invoice,
      tanggal_transaksi: formatDateInput(detail.created_at),
      nama_pelanggan: detail.nama_pelanggan || "",
      metode_pembayaran: detail.metode_pembayaran || "cash",
      status: detail.status || "lunas",
    });
    setEditCart(detail.items);
    setEditOpen(true);
  };

  const updateMasterTransaction = async (transaksiId: string) => {
    const payload = {
      nomor_invoice: editForm.nomor_invoice,
      created_at: `${editForm.tanggal_transaksi}T00:00:00`,
      subtotal: editGrandTotal,
      total: editGrandTotal,
      metode_pembayaran: editForm.metode_pembayaran,
      status: editForm.status,
      jumlah_bayar: editForm.status === "lunas" ? editGrandTotal : 0,
      nama_pelanggan: editForm.nama_pelanggan,
    };

    const first = await supabase.from("transaksi").update(payload as any).eq("id", transaksiId);
    if (!first.error) return;

    if (!first.error.message.toLowerCase().includes("nama_pelanggan")) throw first.error;

    const { nama_pelanggan, ...fallbackPayload } = payload;
    const second = await supabase.from("transaksi").update(fallbackPayload as any).eq("id", transaksiId);
    if (second.error) throw second.error;
  };

  const replaceDetailTransactions = async (transaksiId: string) => {
    const deleteResult = await supabase.from("detail_transaksi").delete().eq("transaksi_id", transaksiId);
    if (deleteResult.error) throw deleteResult.error;
    await insertDetailTransactions(transaksiId, editCart);
  };

  const submitEditInvoice = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingInvoiceId) return;
    if (!editForm.nama_pelanggan.trim()) {
      toast({ title: "Nama pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    if (editCart.length === 0) {
      toast({ title: "Item invoice tidak boleh kosong", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await updateMasterTransaction(editingInvoiceId);
      await replaceDetailTransactions(editingInvoiceId);
      saveCustomerCache(editingInvoiceId, editForm.nomor_invoice, editForm.nama_pelanggan);
      toast({ title: "Invoice diperbarui", description: `${editForm.nomor_invoice} berhasil disimpan.` });
      setEditOpen(false);
      setEditingInvoiceId(null);
      setEditCart([]);
      loadTransactions();
    } catch (error: any) {
      toast({ title: "Gagal mengedit invoice", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (transaction: TransaksiRow) => {
    const confirmed = window.confirm(`Hapus invoice ${transaction.nomor_invoice}? Detail transaksi akan ikut terhapus.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("transaksi").delete().eq("id", transaction.id);
      if (error) throw error;
      toast({ title: "Invoice dihapus", description: `${transaction.nomor_invoice} sudah dihapus.` });
      loadTransactions();
    } catch (error: any) {
      toast({ title: "Gagal menghapus invoice", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceDetail = async (transaction: TransaksiRow) => {
    const { data, error } = await supabase
      .from("detail_transaksi")
      .select("*, barang:barang_id(id,nama_barang,kategori,harga_jual)")
      .eq("transaksi_id", transaction.id);

    if (error) {
      toast({ title: "Gagal memuat detail", description: error.message, variant: "destructive" });
      return null;
    }

    const items = ((data || []) as any[]).map((detail) => ({
      barang_id: detail.barang_id,
      nama_barang: detail.barang?.nama_barang || "Barang",
      kategori: detail.barang?.kategori || "-",
      ukuran: detail.ukuran || detail.barang?.kategori || "-",
      jumlah: detail.jumlah || 0,
      harga: detail.harga || 0,
      subtotal: (detail.jumlah || 0) * (detail.harga || 0),
    }));

    return { ...transaction, nama_pelanggan: getCachedCustomer(transaction), items };
  };

  const openInvoiceDetail = async (transaction: TransaksiRow) => {
    const detail = await getInvoiceDetail(transaction);
    if (!detail) return;
    setSelectedInvoice(detail);
    setDetailOpen(true);
  };

  const openDeliveryDialog = async (transaction: TransaksiRow) => {
    const detail = await getInvoiceDetail(transaction);
    if (!detail) return;

    const existing = readDeliveryArchive().find((item) => item.transaksi_id === transaction.id);
    setSelectedInvoice(detail);
    setDeliveryForm({
      driver: existing?.driver || "",
      no_polisi: existing?.no_polisi || "",
      lokasi_proyek: existing?.lokasi_proyek || detail.nama_pelanggan || "",
      tanggal_pengiriman: existing?.tanggal_pengiriman || today(),
    });
    setDeliveryOpen(true);
  };

  const printCurrent = (mode: Exclude<PrintMode, null>, detail = selectedInvoice, meta = deliveryMeta) => {
    if (!detail) return;
    setSelectedInvoice(detail);
    setDeliveryMeta(meta || null);
    setPrintMode(mode);
    window.setTimeout(() => window.print(), 150);
  };

  const submitDeliveryPrint = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedInvoice) return;

    const note: DeliveryNoteMeta = {
      transaksi_id: selectedInvoice.id,
      nomor_invoice: selectedInvoice.nomor_invoice,
      driver: deliveryForm.driver,
      no_polisi: deliveryForm.no_polisi,
      lokasi_proyek: deliveryForm.lokasi_proyek,
      tanggal_pengiriman: deliveryForm.tanggal_pengiriman,
      created_at: new Date().toISOString(),
    };

    saveDeliveryArchive(note);
    setDeliveryOpen(false);
    printCurrent("delivery", selectedInvoice, note);
  };

  const getPaymentBadge = (transaction: TransaksiRow) => {
    if (transaction.status === "lunas" || transaction.jumlah_bayar >= transaction.total) {
      return { label: "Lunas", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20" };
    }

    if (transaction.status === "dp" || transaction.jumlah_bayar > 0) {
      return { label: "DP", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" };
    }

    return { label: "Belum Bayar", icon: Clock, className: "bg-destructive/10 text-destructive border-destructive/20" };
  };

  return (
    <DashboardLayout>
      <div className="no-print mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Invoice</h1>
          <p className="text-sm text-muted-foreground">Pusat pembuatan invoice, cetak nota, dan surat jalan Fazma Stone.</p>
        </div>

        <form onSubmit={submitInvoice} className="glass-card rounded-lg p-5">
          <div className="mb-5 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Form Pembuatan Invoice</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>No. Invoice</Label>
              <Input value={form.nomor_invoice} readOnly className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal_transaksi} onChange={(e) => setForm({ ...form, tanggal_transaksi: e.target.value })} />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Nama Pelanggan</Label>
              <Input value={form.nama_pelanggan} onChange={(e) => setForm({ ...form, nama_pelanggan: e.target.value })} placeholder="Nama pelanggan atau proyek" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="dp">DP / Sebagian</SelectItem>
                  <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-lg border border-border bg-secondary/50 p-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="space-y-2 lg:col-span-2">
              <Label>Nama Barang / Produk</Label>
              <Input
                value={itemNamaBarang}
                onChange={(e) => setItemNamaBarang(e.target.value)}
                placeholder="Ketik nama barang bebas"
              />
            </div>
            <div className="space-y-2">
              <Label>Ukuran</Label>
              <Input value={itemUkuran} onChange={(e) => setItemUkuran(e.target.value)} placeholder="30x30 / custom" />
            </div>
            <div className="space-y-2">
              <Label>Jumlah</Label>
              <Input type="number" min={1} value={itemJumlah} onChange={(e) => setItemJumlah(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Harga</Label>
              <Input type="number" min={0} value={itemHarga} onChange={(e) => setItemHarga(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Subtotal</Label>
              <Input value={formatCurrency(itemJumlah * itemHarga)} readOnly />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={addCartItem} className="w-full">
                <PackagePlus className="h-4 w-4" /> Tambah Item
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-16 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Keranjang invoice masih kosong</TableCell>
                  </TableRow>
                ) : (
                  cart.map((item, index) => (
                    <TableRow key={`${item.nama_barang}-${index}`}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama_barang}</TableCell>
                      <TableCell>{item.ukuran}</TableCell>
                      <TableCell className="text-right">{item.jumlah}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.harga)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                      <TableCell className="text-center">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeCartItem(index)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 flex flex-col items-end gap-3 sm:flex-row sm:justify-between">
            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Select value={form.metode_pembayaran} onValueChange={(value) => setForm({ ...form, metode_pembayaran: value })}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash / Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-xs uppercase text-muted-foreground">Grand Total</p>
                <p className="font-heading text-2xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
              </div>
              <Button type="submit" disabled={loading || cart.length === 0} size="lg">
                <Save className="h-4 w-4" /> {loading ? "Menyimpan..." : "Simpan Invoice"}
              </Button>
            </div>
          </div>
        </form>

        <div className="glass-card overflow-hidden rounded-lg">
          <div className="flex items-center gap-2 border-b border-border p-5">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Riwayat Invoice</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Belum ada invoice</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction, index) => {
                    const status = getPaymentBadge(transaction);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell className="font-mono font-semibold text-primary">{transaction.nomor_invoice}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(transaction.total)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="mr-1 h-3 w-3" /> {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openInvoiceDetail(transaction)}>
                              <Eye className="h-4 w-4" /> Detail Invoice
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditInvoice(transaction)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button size="sm" onClick={() => openDeliveryDialog(transaction)}>
                              <Truck className="h-4 w-4" /> Surat Jalan
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteInvoice(transaction)}>
                              <Trash2 className="h-4 w-4" /> Hapus
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto bg-background p-0">
            <InvoicePreview invoice={selectedInvoice} />
            <div className="no-print flex gap-3 border-t border-border bg-muted/40 p-5">
              <Button className="flex-1" onClick={() => printCurrent("invoice")}>
                <Printer className="h-4 w-4" /> Detail Invoice (Cetak Nota)
              </Button>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
          <DialogContent className="max-w-xl bg-background">
            <DialogHeader>
              <DialogTitle className="font-heading">Buat/Cetak Surat Jalan</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitDeliveryPrint} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nama Driver</Label>
                  <Input value={deliveryForm.driver} onChange={(e) => setDeliveryForm({ ...deliveryForm, driver: e.target.value })} placeholder="Nama sopir" required />
                </div>
                <div className="space-y-2">
                  <Label>No. Polisi Kendaraan</Label>
                  <Input value={deliveryForm.no_polisi} onChange={(e) => setDeliveryForm({ ...deliveryForm, no_polisi: e.target.value })} placeholder="B 1234 ABC" required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Penerima / Lokasi Proyek</Label>
                  <Input value={deliveryForm.lokasi_proyek} onChange={(e) => setDeliveryForm({ ...deliveryForm, lokasi_proyek: e.target.value })} placeholder="Nama proyek atau alamat pengiriman" required />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Pengiriman</Label>
                  <Input type="date" value={deliveryForm.tanggal_pengiriman} onChange={(e) => setDeliveryForm({ ...deliveryForm, tanggal_pengiriman: e.target.value })} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setDeliveryOpen(false)}>Batal</Button>
                <Button type="submit">
                  <Send className="h-4 w-4" /> Cetak Surat Jalan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle className="font-heading">Edit Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitEditInvoice} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <Label>No. Invoice</Label>
                  <Input value={editForm.nomor_invoice} onChange={(e) => setEditForm({ ...editForm, nomor_invoice: e.target.value })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input type="date" value={editForm.tanggal_transaksi} onChange={(e) => setEditForm({ ...editForm, tanggal_transaksi: e.target.value })} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label>Nama Pelanggan</Label>
                  <Input value={editForm.nama_pelanggan} onChange={(e) => setEditForm({ ...editForm, nama_pelanggan: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lunas">Lunas</SelectItem>
                      <SelectItem value="dp">DP / Sebagian</SelectItem>
                      <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 rounded-lg border border-border bg-secondary/50 p-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Nama Barang / Produk</Label>
                  <Input value={editItemNamaBarang} onChange={(e) => setEditItemNamaBarang(e.target.value)} placeholder="Tambah item baru" />
                </div>
                <div className="space-y-2">
                  <Label>Ukuran</Label>
                  <Input value={editItemUkuran} onChange={(e) => setEditItemUkuran(e.target.value)} placeholder="30x30 / custom" />
                </div>
                <div className="space-y-2">
                  <Label>Jumlah</Label>
                  <Input type="number" min={1} value={editItemJumlah} onChange={(e) => setEditItemJumlah(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Harga</Label>
                  <Input type="number" min={0} value={editItemHarga} onChange={(e) => setEditItemHarga(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtotal</Label>
                  <Input value={formatCurrency(editItemJumlah * editItemHarga)} readOnly />
                </div>
                <div className="flex items-end">
                  <Button type="button" onClick={addEditCartItem} className="w-full">
                    <PackagePlus className="h-4 w-4" /> Tambah
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Barang</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-16 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editCart.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">Item invoice kosong</TableCell>
                      </TableRow>
                    ) : (
                      editCart.map((item, index) => (
                        <TableRow key={`${item.nama_barang}-${index}`}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>
                            <Input
                              value={item.nama_barang}
                              onChange={(e) => updateEditCartItem(index, { nama_barang: e.target.value })}
                              className="min-w-48"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.ukuran}
                              onChange={(e) => updateEditCartItem(index, { ukuran: e.target.value, kategori: e.target.value || "-" })}
                              className="min-w-32"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              value={item.jumlah}
                              onChange={(e) => updateEditCartItem(index, { jumlah: Number(e.target.value) || 0 })}
                              className="ml-auto w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              value={item.harga}
                              onChange={(e) => updateEditCartItem(index, { harga: Number(e.target.value) || 0 })}
                              className="ml-auto w-32 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                          <TableCell className="text-center">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEditCartItem(index)} className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col items-end gap-3 sm:flex-row sm:justify-between">
                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select value={editForm.metode_pembayaran} onValueChange={(value) => setEditForm({ ...editForm, metode_pembayaran: value })}>
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash / Tunai</SelectItem>
                      <SelectItem value="transfer">Transfer Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">Grand Total</p>
                    <p className="font-heading text-2xl font-bold text-primary">{formatCurrency(editGrandTotal)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={loading || editCart.length === 0}>
                      <Save className="h-4 w-4" /> Simpan Perubahan
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="print-area">
        {printMode === "invoice" && <PrintableInvoice invoice={selectedInvoice} />}
        {printMode === "delivery" && <PrintableDeliveryNote invoice={selectedInvoice} delivery={deliveryMeta} />}
      </div>
    </DashboardLayout>
  );
}

function InvoicePreview({ invoice }: { invoice: InvoiceDetail | null }) {
  if (!invoice) return null;

  return (
    <div className="bg-background p-8 text-foreground">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-primary">Fazma Batu Alam</h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Office: Jl. Alternatif Cibubur - Cileungsi. Factory: Desa Lengkong Wetan blok I Sindang Wangi - Majalengka.
            Mobile: 081221131150
          </p>
        </div>
        <img src={LOGO_URL} alt="Logo Fazma Stone" className="h-auto w-48" />
      </div>
      <div className="my-8 border-y-2 border-primary py-4">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Bill To</p>
            <p className="text-lg font-bold uppercase">{invoice.nama_pelanggan || "-"}</p>
          </div>
          <div className="text-right text-sm">
            <p><span className="font-bold text-primary">Invoice:</span> {invoice.nomor_invoice}</p>
            <p><span className="font-bold text-primary">Tanggal:</span> {formatDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>
      <InvoiceItemTable invoice={invoice} showPrice />
    </div>
  );
}

function InvoiceItemTable({ invoice, showPrice }: { invoice: InvoiceDetail; showPrice?: boolean }) {
  return (
    <table className="print-avoid-break w-full border-collapse text-sm">
      <thead>
        <tr className="bg-primary text-primary-foreground">
          <th className="border border-primary p-2 text-center">No</th>
          <th className="border border-primary p-2 text-left">Nama Barang</th>
          <th className="border border-primary p-2 text-left">Spesifikasi Ukuran</th>
          <th className="border border-primary p-2 text-center">Qty</th>
          {showPrice && <th className="border border-primary p-2 text-right">Harga</th>}
          {showPrice && <th className="border border-primary p-2 text-right">Subtotal</th>}
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item, index) => (
          <tr key={`${item.barang_id}-${index}`}>
            <td className="border p-2 text-center">{index + 1}</td>
            <td className="border p-2 font-medium">{item.nama_barang}</td>
            <td className="border p-2">{item.ukuran || item.kategori}</td>
            <td className="border p-2 text-center">{item.jumlah}</td>
            {showPrice && <td className="border p-2 text-right">{formatCurrency(item.harga)}</td>}
            {showPrice && <td className="border p-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>}
          </tr>
        ))}
      </tbody>
      {showPrice && (
        <tfoot>
          <tr>
            <td colSpan={5} className="border p-2 text-right font-bold">Total</td>
            <td className="border p-2 text-right font-bold">{formatCurrency(invoice.total)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function PrintableInvoice({ invoice }: { invoice: InvoiceDetail | null }) {
  if (!invoice) return null;

  return (
    <section className="print-sheet font-sans text-[12px] text-gray-900">
      <img src={LOGO_URL} alt="" className="print-watermark" />
      <div className="print-content">
        <div className="flex items-start justify-between print-avoid-break">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">Fazma Batu Alam</h1>
            <p className="mt-2 max-w-sm leading-relaxed">
              Office: Jl. Alternatif Cibubur - Cileungsi<br />
              Factory: Desa Lengkong Wetan blok I Sindang Wangi - Majalengka<br />
              Mobile: 081221131150
            </p>
          </div>
          <img src={LOGO_URL} alt="Logo Fazma Stone" className="w-52" />
        </div>
        <h2 className="my-6 text-center text-2xl font-bold tracking-[0.25em] text-emerald-800">INVOICE</h2>
        <div className="mb-5 flex justify-between border-y-2 border-emerald-800 py-3 print-avoid-break">
          <div>
            <p className="font-bold uppercase text-emerald-800">Bill To</p>
            <p className="text-lg font-bold uppercase">{invoice.nama_pelanggan || "-"}</p>
          </div>
          <div className="text-right">
            <p><strong>Invoice No:</strong> {invoice.nomor_invoice}</p>
            <p><strong>Date:</strong> {formatDate(invoice.created_at)}</p>
          </div>
        </div>
        <InvoiceItemTable invoice={invoice} showPrice />
        <div className="mt-6 flex justify-between print-avoid-break">
          <div className="rounded border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
            <p className="font-bold">Payment Instructions</p>
            <p>BCA: 5680 5186 47</p>
            <p>Mandiri: 90000 2341 1318</p>
            <p>A/n Zia Ulhaq</p>
          </div>
          <div className="text-center">
            <p>Terimakasih</p>
            <img src={SIGNATURE_URL} alt="Tanda Tangan" className="mx-auto mt-2 w-36" />
            <p className="border-t border-gray-900 px-10 pt-1 font-bold">( Zia Ulhaq )</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrintableDeliveryNote({ invoice, delivery }: { invoice: InvoiceDetail | null; delivery: DeliveryNoteMeta | null }) {
  if (!invoice || !delivery) return null;

  return (
    <section className="print-sheet font-sans text-[12px] text-gray-900">
      <img src={LOGO_URL} alt="" className="print-watermark" />
      <div className="print-content">
        <div className="flex items-start justify-between border-b-2 border-emerald-800 pb-4 print-avoid-break">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">Fazma Batu Alam</h1>
            <p className="mt-2 max-w-md leading-relaxed">
              Office: Jl. Alternatif Cibubur - Cileungsi<br />
              Factory: Desa Lengkong Wetan blok I Sindang Wangi - Majalengka<br />
              Mobile: 081221131150
            </p>
          </div>
          <img src={LOGO_URL} alt="Logo Fazma Stone" className="w-52" />
        </div>
        <h2 className="my-6 text-center text-2xl font-bold tracking-[0.2em] text-emerald-800">SURAT JALAN</h2>
        <div className="mb-5 grid grid-cols-2 gap-6 print-avoid-break">
          <div className="space-y-1">
            <p><strong>No. Surat Jalan:</strong> {generateDeliveryNumber(invoice.nomor_invoice)}</p>
            <p><strong>No. Invoice:</strong> {invoice.nomor_invoice}</p>
            <p><strong>Tanggal Kirim:</strong> {formatDate(delivery.tanggal_pengiriman)}</p>
          </div>
          <div className="space-y-1">
            <p><strong>Driver:</strong> {delivery.driver}</p>
            <p><strong>No. Polisi:</strong> {delivery.no_polisi}</p>
            <p><strong>Penerima / Lokasi:</strong> {delivery.lokasi_proyek}</p>
          </div>
        </div>
        <InvoiceItemTable invoice={invoice} />
        <div className="mt-10 grid grid-cols-3 gap-8 text-center print-avoid-break">
          <div>
            <p>Disiapkan Oleh,</p>
            <div className="mt-16 border-t border-gray-900 pt-1">Admin Fazma Stone</div>
          </div>
          <div>
            <p>Driver,</p>
            <div className="mt-16 border-t border-gray-900 pt-1">{delivery.driver}</div>
          </div>
          <div>
            <p>Penerima,</p>
            <div className="mt-16 border-t border-gray-900 pt-1">{delivery.lokasi_proyek}</div>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-gray-600">
          Catatan: Surat jalan ini hanya memuat daftar barang dan jumlah pengiriman. Nominal harga tidak ditampilkan pada dokumen logistik.
        </p>
      </div>
    </section>
  );
}
