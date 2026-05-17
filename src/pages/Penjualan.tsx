import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Save, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface Product {
  id: string;
  nama_produk: string;
  jenis_batu: string;
  ukuran: string;
  stok: number;
  harga_default: number;
}

export interface InvoiceItem {
  id_produk: string;
  nama_produk: string;
  ukuran: string;
  kuantitas: number;
  harga_satuan: number;
  subtotal: number;
}

export interface InvoiceForm {
  no_nota: string;
  tanggal_transaksi: string;
  nama_pelanggan: string;
  metode_pembayaran: string;
  status_pembayaran: string;
}

export default function Penjualan() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Master Form State
  const [formData, setFormData] = useState<InvoiceForm>({
    no_nota: "",
    tanggal_transaksi: new Date().toISOString().split("T")[0],
    nama_pelanggan: "",
    metode_pembayaran: "cash",
    status_pembayaran: "lunas",
  });

  // Detail Item State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [itemUkuran, setItemUkuran] = useState<string>("");
  const [itemKuantitas, setItemKuantitas] = useState<number>(1);
  const [itemHarga, setItemHarga] = useState<number>(0);

  useEffect(() => {
    loadProducts();
    generateNoNota();
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase.from("barang").select("*").gt("stok", 0);
    if (data) {
      const mapped: Product[] = data.map((b) => ({
        id: b.id,
        nama_produk: b.nama_barang,
        jenis_batu: b.kategori || "-",
        ukuran: "Custom", // default fallback
        stok: b.stok,
        harga_default: b.harga_jual,
      }));
      setProducts(mapped);
    }
  };

  const generateNoNota = () => {
    const d = new Date();
    const no = `INV/${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}/${String(Date.now()).slice(-5)}`;
    setFormData((prev) => ({ ...prev, no_nota: no }));
  };

  const handleProductSelect = (val: string) => {
    setSelectedProductId(val);
    const prod = products.find((p) => p.id === val);
    if (prod) {
      setItemUkuran(prod.ukuran);
      setItemHarga(prod.harga_default);
      setItemKuantitas(1);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast({ title: "Validasi Gagal", description: "Pilih produk terlebih dahulu", variant: "destructive" });
      return;
    }
    if (itemKuantitas <= 0 || itemHarga <= 0) {
      toast({ title: "Validasi Gagal", description: "Kuantitas dan Harga harus lebih dari 0", variant: "destructive" });
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const newItem: InvoiceItem = {
      id_produk: prod.id,
      nama_produk: prod.nama_produk,
      ukuran: itemUkuran,
      kuantitas: itemKuantitas,
      harga_satuan: itemHarga,
      subtotal: itemKuantitas * itemHarga,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    
    // Reset form item
    setSelectedProductId("");
    setItemUkuran("");
    setItemKuantitas(1);
    setItemHarga(0);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...invoiceItems];
    newItems.splice(index, 1);
    setInvoiceItems(newItems);
  };

  const grandTotal = invoiceItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const handleSubmitNota = async () => {
    if (!formData.nama_pelanggan.trim()) {
      toast({ title: "Validasi Gagal", description: "Nama Pelanggan wajib diisi", variant: "destructive" });
      return;
    }
    if (invoiceItems.length === 0) {
      toast({ title: "Validasi Gagal", description: "Keranjang masih kosong. Tambahkan minimal 1 item.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Langkah 1 & 2: Insert Master
      const jumlah_bayar = formData.status_pembayaran === "lunas" ? grandTotal : 0; 

      const payloadMaster = {
        nomor_invoice: formData.no_nota,
        total: grandTotal,
        subtotal: grandTotal,
        diskon: 0,
        pajak: 0,
        metode_pembayaran: formData.metode_pembayaran,
        status: formData.status_pembayaran,
        jumlah_bayar,
        user_id: user?.id,
        nama_pelanggan: formData.nama_pelanggan
      };

      const { data: transaksi, error: masterErr } = await supabase
        .from("transaksi")
        .insert(payloadMaster as any) // Type assertion ke any agar mendukung penambahan kolom baru
        .select()
        .single();

      if (masterErr) throw masterErr;

      // Langkah 3: Map Item
      const details = invoiceItems.map((item) => ({
        transaksi_id: transaksi.id,
        barang_id: item.id_produk,
        jumlah: item.kuantitas,
        harga: item.harga_satuan,
        ukuran: item.ukuran
      }));

      // Langkah 4: Bulk Insert Detail
      const { error: detailErr } = await supabase.from("detail_transaksi").insert(details as any);
      if (detailErr) throw detailErr;

      // Update Stock 
      for (const item of invoiceItems) {
        const prod = products.find(p => p.id === item.id_produk);
        if (prod) {
          await supabase.from("barang").update({ stok: prod.stok - item.kuantitas }).eq("id", item.id_produk);
        }
      }

      toast({ title: "Berhasil", description: `Nota ${formData.no_nota} berhasil disimpan.` });
      
      // Reset State
      generateNoNota();
      setFormData(prev => ({ ...prev, nama_pelanggan: "", status_pembayaran: "lunas" }));
      setInvoiceItems([]);
      loadProducts();
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan Nota", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-heading font-bold text-teal-900">Buat Nota Penjualan</h1>
          <p className="text-muted-foreground text-sm">Form input master-detail transaksi baru</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Master Form */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800 border-b pb-2 mb-4">Informasi Nota Utama</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>No. Nota</Label>
                <Input value={formData.no_nota} readOnly className="bg-slate-50 font-mono text-sm border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Transaksi</Label>
                <Input type="date" value={formData.tanggal_transaksi} onChange={(e) => setFormData({...formData, tanggal_transaksi: e.target.value})} className="border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label>Nama Pelanggan</Label>
                <Input placeholder="Contoh: Budi Santoso" value={formData.nama_pelanggan} onChange={(e) => setFormData({...formData, nama_pelanggan: e.target.value})} className="border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select value={formData.metode_pembayaran} onValueChange={(v) => setFormData({...formData, metode_pembayaran: v})}>
                  <SelectTrigger className="border-slate-200"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash / Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 lg:col-start-4">
                <Label>Status Pembayaran</Label>
                <Select value={formData.status_pembayaran} onValueChange={(v) => setFormData({...formData, status_pembayaran: v})}>
                  <SelectTrigger className="border-slate-200"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                    <SelectItem value="dp">DP / Sebagian</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Form Input Item */}
          <div className="lg:col-span-3 bg-teal-50/50 p-6 rounded-2xl border border-teal-100 shadow-sm space-y-4">
            <h2 className="font-semibold text-teal-900 border-b border-teal-200 pb-2 mb-4">Tambah Item Produk</h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label>Produk</Label>
                <Select value={selectedProductId} onValueChange={handleProductSelect}>
                  <SelectTrigger className="bg-white border-teal-200 focus:ring-teal-500"><SelectValue placeholder="Pilih produk dari database..."/></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nama_produk} (Stok: {p.stok})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ukuran</Label>
                <Input className="bg-white border-teal-200 focus:ring-teal-500" placeholder="Contoh: 30x30" value={itemUkuran} onChange={(e) => setItemUkuran(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Kuantitas</Label>
                <Input className="bg-white border-teal-200 focus:ring-teal-500" type="number" min="1" value={itemKuantitas} onChange={(e) => setItemKuantitas(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Harga Satuan</Label>
                <Input className="bg-white border-teal-200 focus:ring-teal-500" type="number" min="0" value={itemHarga} onChange={(e) => setItemHarga(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Subtotal (Auto)</Label>
                <Input className="bg-slate-100/80 text-slate-600 font-semibold border-teal-100" value={formatCurrency(itemKuantitas * itemHarga)} readOnly tabIndex={-1} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleAddItem} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-all">
                <Plus className="w-4 h-4 mr-2" /> Tambah Ke Keranjang
              </Button>
            </div>
          </div>

          {/* Tabel Sementara (Cart) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Ukuran</TableHead>
                    <TableHead className="text-right">Kuantitas</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-16 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-32 text-slate-500">
                        Belum ada item ditambahkan ke keranjang belanja
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoiceItems.map((item, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/50">
                        <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">{item.nama_produk}</TableCell>
                        <TableCell className="text-slate-600">{item.ukuran}</TableCell>
                        <TableCell className="text-right text-slate-800 font-medium">{item.kuantitas}</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(item.harga_satuan)}</TableCell>
                        <TableCell className="text-right font-bold text-teal-700">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Grand Total & Submit */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-slate-600">
                Total Item Pembelian: <span className="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded ml-2">{invoiceItems.length}</span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-500 mb-0.5 font-medium uppercase tracking-wider">Grand Total</p>
                  <p className="text-2xl font-black text-teal-800">{formatCurrency(grandTotal)}</p>
                </div>
                <Button 
                  onClick={handleSubmitNota} 
                  disabled={isSubmitting || invoiceItems.length === 0}
                  className="bg-teal-700 hover:bg-teal-800 text-white h-12 px-8 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 w-full sm:w-auto"
                >
                  <Save className="w-5 h-5 mr-2" /> 
                  {isSubmitting ? "Menyimpan Data..." : "Simpan Nota Utama"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
