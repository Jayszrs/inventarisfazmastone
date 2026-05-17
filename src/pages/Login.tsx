import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { defaultRoleForEmail } from "@/lib/admin";

// PERBAIKAN: Menggunakan deklarasi variabel 'const' yang benar
const LOGO_URL = "/Logo Fazma Stone Hitam.png";

type AuthMode = "login" | "signup";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState(""); // Bisa diisi username (admin) atau email biasa
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Pengonversi otomatis: mengubah username murni menjadi format email internal
  const getFormattedEmail = (input: string) => {
    const cleanInput = input.trim().toLowerCase();
    if (!cleanInput) return "";
    return cleanInput.includes("@") ? cleanInput : `${cleanInput}@fazmastone.com`;
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const targetEmail = getFormattedEmail(identifier);

    try {
      // Jalankan proses sign-in ke Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
      
      if (!error) {
        toast({ title: "Berhasil masuk", description: "Selamat datang kembali di sistem Fazma Stone." });
        return;
      }

      // AUTO-CONFIRMATION BYPASS: Jika akun terdeteksi belum diaktivasi emailnya
      const errMsg = String(error.message || "").toLowerCase();
      if (errMsg.includes("confirm") || errMsg.includes("credentials")) {
        
        // Paksa aktivasi instan via RPC database
        const { data: confirmed } = await (supabase as any).rpc("confirm_allowed_admin_email", {
          target_email: targetEmail,
        });

        if (confirmed) {
          // Coba login ulang secara otomatis
          const retry = await supabase.auth.signInWithPassword({ email: targetEmail, password });
          if (!retry.error) {
            toast({
              title: "Masuk Berhasil",
              description: "Akun Anda telah diaktivasi otomatis dan berhasil masuk.",
            });
            return;
          }
          throw retry.error;
        }
      }

      throw error;
    } catch (error: any) {
      toast({
        title: "Login gagal",
        description: "Periksa kembali username/email dan password Anda.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultRole = async (userId: string, email: string) => {
    const role = defaultRoleForEmail(email);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      console.warn("Role bootstrap skipped:", error.message);
    }
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const targetEmail = getFormattedEmail(identifier);

    try {
      const emailRedirectTo = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: targetEmail,
        password,
        options: { data: { full_name: name }, emailRedirectTo },
      });

      if (error) throw error;
      
      if (data.user?.id) {
        await createDefaultRole(data.user.id, targetEmail);
        
        // Aktivasi otomatis instan di tingkat database
        await (supabase as any).rpc("confirm_allowed_admin_email", { target_email: targetEmail });
        
        // Langsung arahkan login otomatis tanpa ketik ulang
        const autoLogin = await supabase.auth.signInWithPassword({ email: targetEmail, password });
        if (!autoLogin.error) {
          toast({
            title: "Akun Berhasil Aktif",
            description: "Pendaftaran sukses dan Anda telah masuk secara otomatis.",
          });
          return;
        }
      }

      toast({
        title: "Pendaftaran berhasil",
        description: "Silakan beralih ke tab Masuk untuk mengakses aplikasi.",
      });
      setMode("login");
      setPassword("");
    } catch (error: any) {
      toast({ title: "Pendaftaran gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <p className="font-heading text-3xl font-extrabold tracking-tight text-primary">FAZMA STONE</p>
          <p className="mt-2 text-sm text-muted-foreground">Sistem Transaksi & Keamanan Hak Akses Karyawan</p>
        </div>

        <div className="glass-card rounded-lg p-6 glow-primary">
          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Buat Akun</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Username atau Email</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Masukkan nama pengguna (Contoh: admin)"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Contoh: admin123456"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={loading}>
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nama Lengkap</Label>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-identifier">Username atau Email Baru</Label>
                  <Input
                    id="signup-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="Masukkan nama pengguna baru"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                  />
                </div>
                <CardButton type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={loading}>
                  {loading ? "Mendaftarkan..." : "Buat Akun"}
                </CardButton>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Komponen mini pembantu tombol agar kompatibel dengan layout shadcn
function CardButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button className={className} {...props}>
      {children}
    </Button>
  );
}