import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Menggunakan encodeURI untuk menangani spasi pada nama file di folder public
const LOGO_URL = encodeURI("/Logo Fazma Stone Hitam.png"); 
const SIGNATURE_URL = encodeURI("/Signature.png");

interface TransaksiDetail {
  id: string;
  nomor_invoice: string;
  total: number;
  subtotal: number;
  diskon: number;
  pajak: number;
  jumlah_bayar: number;
  metode_pembayaran: string;
  status: string;
  created_at: string;
  nama_pelanggan?: string;
  items: { nama_barang: string; jumlah: number; harga: number; ukuran?: string }[];
}

export default function Nota() {
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [selectedNota, setSelectedNota] = useState<TransaksiDetail | null>(null);
  const [open, setOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    loadTransaksi(); 

    // Real-time subscription untuk otomatis me-refresh tabel saat ada insert baru dari kasir/penjualan
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaksi'
        },
        () => {
          loadTransaksi();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTransaksi = async () => {
    const { data } = await supabase.from("transaksi").select("*").order("created_at", { ascending: false });
    setTransaksiList(data || []);
  };

  const getPaymentStatus = (status: string, total: number, bayar: number) => {
    if (status === 'lunas' || bayar >= total) return { label: "Lunas", icon: <CheckCircle2 className="w-3 h-3 mr-1" />, color: "bg-green-100 text-green-700 hover:bg-green-200 border-none" };
    if (status === 'dp' || (bayar > 0 && bayar < total)) return { label: "Piutang / DP", icon: <Clock className="w-3 h-3 mr-1" />, color: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-none" };
    return { label: "Belum Bayar", icon: <AlertCircle className="w-3 h-3 mr-1" />, color: "bg-red-100 text-red-700 hover:bg-red-200 border-none" };
  };

  const viewNota = async (t: any) => {
    const { data: details } = await supabase
      .from("detail_transaksi")
      .select("*, barang:barang_id(nama_barang)")
      .eq("transaksi_id", t.id);

    setSelectedNota({
      ...t,
      // Fallback jika nama_pelanggan undefined / belum ada di schema
      nama_pelanggan: t.nama_pelanggan || "PELANGGAN", 
      items: (details || []).map((d: any) => ({
        nama_barang: d.barang?.nama_barang || "Unknown",
        jumlah: d.jumlah,
        harga: d.harga,
        ukuran: d.ukuran || "-", // Menangani ekstensi schema
      })),
    });
    setOpen(true);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Mengambil origin URL agar gambar tetap terbaca di window baru
    const base = window.location.origin;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${selectedNota?.nomor_invoice}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; font-size: 11px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .company-info { color: #00796b; line-height: 1.5; flex: 1; }
            .company-name { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
            .logo-section { flex: 1; text-align: right; }
            .logo-img { max-width: 220px; height: auto; }
            .invoice-title { text-align: center; font-size: 24px; font-weight: bold; color: #00796b; margin: 25px 0; letter-spacing: 2px; }
            .bill-section { display: flex; justify-content: space-between; border-top: 2px solid #00796b; border-bottom: 2px solid #00796b; padding: 15px 0; margin-bottom: 25px; }
            .bill-to-label { color: #00796b; font-weight: bold; font-size: 13px; margin-bottom: 5px; }
            .inv-details span { color: #00796b; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #00796b; color: white; padding: 12px 10px; text-align: left; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; }
            .footer-section { display: flex; justify-content: space-between; margin-top: 20px; }
            .payment-info { width: 50%; color: #00796b; font-size: 10px; line-height: 1.6; }
            .totals { width: 35%; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .grand-total { font-weight: bold; border-top: 2px solid #00796b; margin-top: 5px; padding-top: 8px; font-size: 13px; }
            .signature-area { margin-top: 40px; text-align: right; }
            .signature-wrapper { display: inline-block; text-align: center; position: relative; min-width: 200px; }
            .signature-img { width: 150px; position: absolute; left: 50%; top: 40px; transform: translateX(-50%); z-index: 1; pointer-events: none; }
            .name-box { position: relative; z-index: 2; margin-top: 80px; border-top: 1px solid #333; display: inline-block; padding: 5px 30px; font-weight: bold; }
          </style>
        </head>
        <body>
            ${printRef.current.innerHTML.replace(/\/Logo/g, base + "/Logo").replace(/\/Signature/g, base + "/Signature")}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Memberikan waktu agar gambar termuat sebelum print dialog muncul
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1500);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-heading font-bold text-teal-900 tracking-tight">Tabel Utama Invoice</h1>
          <p className="text-muted-foreground text-sm">Riwayat penjualan dan nota pembayaran Fazma Stone</p>
        </div>

        {/* Tabel Utama Riwayat Invoice */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-16 text-center">No</TableHead>
                  <TableHead>No. Nota / Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead className="text-right">Total Pembayaran</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaksiList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-40 text-slate-500">
                      Belum ada riwayat invoice ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  transaksiList.map((t, index) => {
                    const status = getPaymentStatus(t.status, t.total, t.jumlah_bayar);
                    return (
                      <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                        <TableCell className="font-mono font-medium text-teal-700">{t.nomor_invoice}</TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                        <TableCell className="font-medium text-slate-700">{t.nama_pelanggan || "PELANGGAN"}</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{formatCurrency(t.total)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`${status.color} px-2.5 py-0.5 whitespace-nowrap`}>
                            <span className="flex items-center">
                              {status.icon} {status.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-teal-600 hover:text-teal-800 hover:bg-teal-50" onClick={() => viewNota(t)} title="Lihat Detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-800 hover:bg-slate-100" onClick={() => { viewNota(t); setTimeout(handlePrint, 500); }} title="Cetak Nota">
                              <Printer className="h-4 w-4" />
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

        {/* Dialog / Modal Detail Nota */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none rounded-3xl shadow-2xl bg-white">
            <div className="p-10 sm:p-14 bg-white" ref={printRef}>
              {/* Header */}
              <div className="header flex justify-between items-start mb-8">
                <div className="company-info text-teal-800">
                  <h2 className="company-name text-2xl font-bold">Fazma Batu Alam</h2>
                  <p className="text-[11px] leading-relaxed max-w-xs">
                    Office : Jl. Alternatif Cibubur - Cileungsi (Depan Dealer Mitsubishi)<br/>
                    Factory : Desa Lengkong Wetan blok I Sindang Wangi - Majalengka<br/>
                    Mobile: 081221131150 | Email: zia.ulhaq@fazmastone.com<br/>
                    www.fazmastone.com
                  </p>
                </div>
                <div className="logo-section">
                  <img src={LOGO_URL} alt="Logo Fazma Stone" className="logo-img inline-block" />
                </div>
              </div>

              <div className="invoice-title">INVOICE</div>

              {/* Bill To & Meta Data */}
              <div className="bill-section flex justify-between mb-8 border-y-2 border-teal-700 py-4">
                <div>
                  <h4 className="bill-to-label text-teal-700 font-bold uppercase text-xs">Bill To</h4>
                  <p className="font-bold text-lg text-slate-900 uppercase">{selectedNota?.nama_pelanggan || "PELANGGAN"}</p>
                </div>
                <div className="text-right text-xs space-y-1.5">
                  <p><span className="text-teal-700 font-bold">Invoice No :</span> <span className="font-mono text-slate-600">{selectedNota?.nomor_invoice}</span></p>
                  <p><span className="text-teal-700 font-bold">Date :</span> <span className="text-slate-600">{selectedNota && new Date(selectedNota.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                </div>
              </div>

              {/* Table Items */}
              <table className="w-full mb-10">
                <thead className="bg-teal-700 text-white">
                  <tr>
                    <th className="w-12 text-center rounded-tl-lg">Sl.</th>
                    <th>Description</th>
                    <th className="text-center">Size</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right rounded-tr-lg">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {selectedNota?.items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="font-medium text-slate-700">{item.nama_barang}</td>
                      <td className="text-center text-slate-500">{item.ukuran}</td>
                      <td className="text-right">{item.jumlah}</td>
                      <td className="text-right">{formatCurrency(item.harga)}</td>
                      <td className="text-right font-semibold">{formatCurrency(item.harga * item.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom Section */}
              <div className="flex justify-between items-start">
                <div className="payment-info bg-teal-50/50 p-5 rounded-2xl border border-teal-100">
                  <h4 className="font-bold underline text-teal-800 mb-3 text-xs">Payment Instructions</h4>
                  <div className="space-y-1 text-teal-700 font-medium">
                    <p className="flex justify-between gap-4"><span>BCA</span> <span>: 5680 5186 47</span></p>
                    <p className="flex justify-between gap-4"><span>Mandiri</span> <span>: 90000 2341 1318</span></p>
                    <p className="mt-2 text-[12px] font-bold uppercase">A/n Zia Ulhaq</p>
                  </div>
                </div>
                
                <div className="totals w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedNota?.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-teal-900 border-t-2 border-teal-700 pt-2">
                    <span>TOTAL</span>
                    <span>{formatCurrency(selectedNota?.total || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Paid</span>
                    <span>{formatCurrency(selectedNota?.jumlah_bayar || 0)}</span>
                  </div>
                  <div className="flex justify-between text-md font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">
                    <span>Balance Due</span>
                    <span>{formatCurrency(Math.max(0, (selectedNota?.total || 0) - (selectedNota?.jumlah_bayar || 0)))}</span>
                  </div>
                </div>
              </div>

              {/* Signature Area */}
              <div className="signature-area mt-12 text-right relative">
                <div className="signature-wrapper text-center">
                  <p className="font-bold text-slate-800 mb-4">Terimakasih</p>
                  <img src={SIGNATURE_URL} alt="Tanda Tangan" className="signature-img opacity-90 mx-auto" />
                  <div className="mt-20 border-t border-slate-800 pt-1 inline-block px-10 font-bold text-slate-900">
                    ( Zia Ulhaq )
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="p-8 bg-slate-50 flex gap-4 sticky bottom-0 border-t border-slate-100 rounded-b-3xl">
              <Button 
                onClick={handlePrint} 
                className="flex-1 h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-lg shadow-teal-700/20 transition-all active:scale-95"
              >
                <Printer className="w-5 h-5 mr-2" /> Cetak Nota Sekarang
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="h-12 px-8 rounded-xl border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-all"
              >
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
