import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Archive, CalendarDays, FileText, Printer, Search, Truck } from "lucide-react";

const LOGO_URL = encodeURI("/Logo Fazma Stone Hitam.png");
const SIGNATURE_URL = encodeURI("/Signature.png");
const DELIVERY_STORAGE_KEY = "fazma_delivery_notes";

type TransaksiRow = {
  id: string;
  nomor_invoice: string;
  created_at: string;
  status: string;
  total: number;
  subtotal: number;
  jumlah_bayar: number;
  metode_pembayaran: string;
  nama_pelanggan?: string;
};

type InvoiceItem = {
  barang_id: string;
  nama_barang: string;
  kategori: string;
  ukuran: string;
  jumlah: number;
  harga: number;
  subtotal: number;
};

type InvoiceDetail = TransaksiRow & {
  items: InvoiceItem[];
};

type DeliveryNoteMeta = {
  transaksi_id: string;
  nomor_invoice: string;
  driver: string;
  no_polisi: string;
  lokasi_proyek: string;
  tanggal_pengiriman: string;
  created_at: string;
};

type PrintMode = "invoice" | "delivery" | null;

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

const generateDeliveryNumber = (invoiceNumber?: string) =>
  `SJ-${(invoiceNumber || "INV").replace(/[^A-Za-z0-9]/g, "-")}`;

const readDeliveryArchive = (): DeliveryNoteMeta[] => {
  try {
    return JSON.parse(localStorage.getItem(DELIVERY_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const normalizeDate = (date: string) => new Date(date).toISOString().slice(0, 10);

export default function Dokumentasi() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<TransaksiRow[]>([]);
  const [deliveryArchive, setDeliveryArchive] = useState<DeliveryNoteMeta[]>([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryNoteMeta | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  useEffect(() => {
    loadTransactions();
    setDeliveryArchive(readDeliveryArchive());

    const clearPrintState = () => setPrintMode(null);
    window.addEventListener("afterprint", clearPrintState);
    return () => window.removeEventListener("afterprint", clearPrintState);
  }, []);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("transaksi")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Gagal memuat arsip", description: error.message, variant: "destructive" });
      return;
    }

    setTransactions((data || []) as TransaksiRow[]);
  };

  const filteredInvoices = useMemo(() => {
    const query = search.toLowerCase().trim();

    return transactions
      .filter((transaction) => ["lunas", "selesai", "sukses"].includes((transaction.status || "").toLowerCase()))
      .filter((transaction) => {
        const target = `${transaction.nomor_invoice} ${transaction.nama_pelanggan || ""}`.toLowerCase();
        return !query || target.includes(query);
      })
      .filter((transaction) => {
        const date = normalizeDate(transaction.created_at);
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
  }, [transactions, search, startDate, endDate]);

  const filteredDelivery = useMemo(() => {
    const query = search.toLowerCase().trim();

    return deliveryArchive
      .map((delivery) => ({
        ...delivery,
        transaction: transactions.find((transaction) => transaction.id === delivery.transaksi_id),
      }))
      .filter((delivery) => {
        const target = `${delivery.nomor_invoice} ${delivery.transaction?.nama_pelanggan || ""} ${delivery.lokasi_proyek}`.toLowerCase();
        return !query || target.includes(query);
      })
      .filter((delivery) => {
        const date = normalizeDate(delivery.tanggal_pengiriman);
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      });
  }, [deliveryArchive, transactions, search, startDate, endDate]);

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

    return { ...transaction, nama_pelanggan: transaction.nama_pelanggan || "Pelanggan", items };
  };

  const printInvoice = async (transaction: TransaksiRow) => {
    const detail = await getInvoiceDetail(transaction);
    if (!detail) return;

    setSelectedInvoice(detail);
    setSelectedDelivery(null);
    setPrintMode("invoice");
    window.setTimeout(() => window.print(), 150);
  };

  const printDelivery = async (delivery: DeliveryNoteMeta & { transaction?: TransaksiRow }) => {
    const transaction = delivery.transaction || transactions.find((item) => item.id === delivery.transaksi_id);
    if (!transaction) {
      toast({ title: "Invoice tidak ditemukan", description: "Data transaksi asal surat jalan ini belum tersedia.", variant: "destructive" });
      return;
    }

    const detail = await getInvoiceDetail(transaction);
    if (!detail) return;

    setSelectedInvoice(detail);
    setSelectedDelivery(delivery);
    setPrintMode("delivery");
    window.setTimeout(() => window.print(), 150);
  };

  const resetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Dokumentasi</h1>
          <p className="text-sm text-muted-foreground">Arsip Nota/Invoice dan Surat Jalan Fazma Stone.</p>
        </div>

        <div className="glass-card rounded-lg p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Pencarian & Filter</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Cari Nomor Invoice / Nama Pelanggan</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Contoh: INV/0526 atau nama pelanggan" />
            </div>
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={resetFilters}>Reset Filter</Button>
          </div>
        </div>

        <Tabs defaultValue="invoice" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="invoice">
              <FileText className="mr-2 h-4 w-4" /> Arsip Nota/Invoice
            </TabsTrigger>
            <TabsTrigger value="surat-jalan">
              <Truck className="mr-2 h-4 w-4" /> Arsip Surat Jalan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoice" className="glass-card overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">Arsip Nota/Invoice</h2>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">{filteredInvoices.length} dokumen</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Nama Pelanggan</TableHead>
                    <TableHead>Tanggal Cetak</TableHead>
                    <TableHead className="text-right">Total Bayar</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Tidak ada arsip invoice sesuai filter</TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono font-semibold text-primary">{transaction.nomor_invoice}</TableCell>
                        <TableCell>{transaction.nama_pelanggan || "Pelanggan"}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(transaction.total)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">{transaction.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => printInvoice(transaction)}>
                            <Printer className="h-4 w-4" /> Cetak Ulang Nota
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="surat-jalan" className="glass-card overflow-hidden rounded-lg">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">Arsip Surat Jalan</h2>
              </div>
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">{filteredDelivery.length} dokumen</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Surat Jalan</TableHead>
                    <TableHead>No. Invoice</TableHead>
                    <TableHead>Driver / Kendaraan</TableHead>
                    <TableHead>Lokasi Proyek</TableHead>
                    <TableHead>Tanggal Kirim</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDelivery.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Belum ada arsip surat jalan di browser ini</TableCell>
                    </TableRow>
                  ) : (
                    filteredDelivery.map((delivery) => (
                      <TableRow key={`${delivery.transaksi_id}-${delivery.created_at}`}>
                        <TableCell className="font-mono font-semibold text-primary">{generateDeliveryNumber(delivery.nomor_invoice)}</TableCell>
                        <TableCell className="font-mono">{delivery.nomor_invoice}</TableCell>
                        <TableCell>{delivery.driver} / {delivery.no_polisi}</TableCell>
                        <TableCell>{delivery.lokasi_proyek}</TableCell>
                        <TableCell>{formatDate(delivery.tanggal_pengiriman)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => printDelivery(delivery)}>
                            <Printer className="h-4 w-4" /> Cetak Ulang Surat Jalan
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="print-area">
          {printMode === "invoice" && <PrintableInvoice invoice={selectedInvoice} />}
          {printMode === "delivery" && <PrintableDeliveryNote invoice={selectedInvoice} delivery={selectedDelivery} />}
        </div>
      </div>
    </DashboardLayout>
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
            <p className="text-lg font-bold uppercase">{invoice.nama_pelanggan || "Pelanggan"}</p>
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
