import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { defaultRoleForEmail } from "@/lib/admin";
import {
  Boxes,
  ChevronLeft,
  Compass,
  Gem,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Warehouse,
} from "lucide-react";

import LOGO_URL from "@/assets/logo-fazma.png";

type AuthMode = "login" | "signup" | "reset";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
      const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password });

      if (!error) {
        toast({ title: "Berhasil masuk", description: "Selamat datang kembali di sistem Fazma Stone." });
        return;
      }

      const errMsg = String(error.message || "").toLowerCase();
      if (errMsg.includes("confirm") || errMsg.includes("credentials")) {
        const { data: confirmed } = await (supabase as any).rpc("confirm_allowed_admin_email", {
          target_email: targetEmail,
        });

        if (confirmed) {
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
        const role = defaultRoleForEmail(targetEmail);
        await supabase.from("user_roles").insert({ user_id: data.user.id, role });
        await (supabase as any).rpc("confirm_allowed_admin_email", { target_email: targetEmail });

        const autoLogin = await supabase.auth.signInWithPassword({ email: targetEmail, password });
        if (!autoLogin.error) {
          toast({
            title: "Akun Berhasil Aktif",
            description: "Pendaftaran sukses dan Anda telah masuk secara otomatis.",
          });
          return;
        }
      }

      toast({ title: "Pendaftaran berhasil", description: "Silakan beralih ke tab Masuk." });
      setMode("login");
      setPassword("");
    } catch (error: any) {
      toast({ title: "Pendaftaran gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const targetEmail = getFormattedEmail(identifier);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, { redirectTo });
      if (error) throw error;

      toast({
        title: "Email reset terkirim",
        description: `Link reset password telah dikirim ke alamat email terkait (${targetEmail}).`,
      });
      setMode("login");
    } catch (error: any) {
      toast({ title: "Reset password gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#f5fbf6] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(15,118,110,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(225,246,232,0.72))]" />

      <section className="relative hidden min-h-screen w-[52%] flex-col justify-between overflow-hidden bg-[#0d3d27] px-12 py-10 text-white lg:flex xl:px-16">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.09)_0_1px,transparent_1px_78px),linear-gradient(35deg,transparent_0_38%,rgba(255,255,255,0.12)_39%,transparent_42%),radial-gradient(circle_at_72%_28%,rgba(187,247,208,0.22),transparent_34%)]" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-300/12 blur-3xl" />
        <div className="absolute bottom-14 right-10 h-72 w-56 rotate-6 rounded-[2rem] border border-white/15 bg-[linear-gradient(155deg,rgba(255,255,255,0.16),rgba(21,128,61,0.22)),linear-gradient(45deg,transparent_20%,rgba(255,255,255,0.22)_21%,transparent_25%,transparent_54%,rgba(255,255,255,0.14)_55%,transparent_60%)] shadow-2xl shadow-emerald-950/50" />
        <div className="absolute bottom-24 right-44 h-44 w-72 -rotate-3 rounded-[1.75rem] border border-white/12 bg-[linear-gradient(135deg,rgba(22,101,52,0.75),rgba(240,253,244,0.1)),repeating-linear-gradient(115deg,rgba(255,255,255,0.16)_0_1px,transparent_1px_24px)] shadow-2xl shadow-emerald-950/40" />
        <div className="absolute bottom-40 right-20 h-28 w-32 rotate-12 rounded-[1.5rem] border border-emerald-100/20 bg-white/10 backdrop-blur-sm" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-36 items-center justify-center rounded-2xl border border-white/30 bg-white p-3 shadow-xl shadow-emerald-950/25">
            <img src={LOGO_URL} alt="Fazma Stone" className="max-h-full w-auto object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-emerald-100/80">Natural Stone</p>
            <p className="font-heading text-xl font-black tracking-tight">Fazma Stone</p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl pb-10">
          <Badge className="mb-7 gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-50 shadow-lg backdrop-blur-md hover:bg-white/10">
            <Gem className="h-3.5 w-3.5 text-emerald-200" />
            Area Terbatas
          </Badge>

          <h1 className="font-heading text-5xl font-black leading-[1.04] tracking-tight xl:text-6xl">
            Inventaris Dashboard
            <span className="block text-emerald-100">Fazma Stone</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-emerald-50/78">
            Kelola stok batu alam, nota penjualan, dokumentasi gudang, dan akses tim dari satu ruang kerja yang rapi dan cepat.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
              <Warehouse className="mb-4 h-5 w-5 text-emerald-100" />
              <p className="font-heading text-2xl font-black">Stok</p>
              <p className="text-xs text-emerald-50/65">Gudang</p>
            </div>
            <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
              <Boxes className="mb-4 h-5 w-5 text-emerald-100" />
              <p className="font-heading text-2xl font-black">Slab</p>
              <p className="text-xs text-emerald-50/65">Material</p>
            </div>
            <div className="rounded-2xl border border-white/14 bg-white/10 p-4 backdrop-blur-sm">
              <Compass className="mb-4 h-5 w-5 text-emerald-100" />
              <p className="font-heading text-2xl font-black">Nota</p>
              <p className="text-xs text-emerald-50/65">Transaksi</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-50/55">
          <span>Secure warehouse access</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-200 shadow-[0_0_18px_rgba(187,247,208,0.9)]" />
            Online
          </span>
        </div>
      </section>

      <section className="relative z-10 flex min-h-screen w-full items-center justify-start overflow-hidden px-4 py-24 sm:px-5 lg:w-[48%] lg:justify-center lg:px-12">
        <div className="absolute left-5 top-5 flex h-14 w-32 items-center justify-center rounded-2xl border border-emerald-900/10 bg-white p-2.5 shadow-lg shadow-emerald-950/10 lg:hidden">
          <img src={LOGO_URL} alt="Fazma Stone" className="max-h-full w-auto object-contain" />
        </div>

        <div className="w-full min-w-0 max-w-[360px] animate-fade-in sm:max-w-[470px]">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-emerald-600" />
              <span className="text-xs font-black uppercase tracking-[0.28em] text-emerald-700">Area Terbatas</span>
            </div>
            <h2 className="font-heading text-4xl font-black tracking-tight text-zinc-950">
              {mode === "reset" ? "Reset Password" : "Login Admin"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {mode === "reset"
                ? "Masukkan username atau email untuk menerima instruksi reset password."
                : "Masuk untuk mengelola inventaris, transaksi, dan dashboard Fazma Stone."}
            </p>
          </div>

          <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-emerald-950/10 bg-[#07130e] p-5 text-white shadow-[0_28px_80px_rgba(6,78,59,0.28)] sm:rounded-[2rem] sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-white to-emerald-600" />

            {mode === "reset" ? (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-identifier" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                    Username atau Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                    <Input
                      id="reset-identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="Contoh: admin"
                      className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500"
                  disabled={loading}
                >
                  {loading ? "Mengirim Instruksi..." : "Kirim Link Reset"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-xl text-emerald-50/70 hover:bg-white/10 hover:text-white"
                  onClick={() => setMode("login")}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Kembali ke Login
                </Button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="space-y-6">
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-white/10 bg-white/[0.06] p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg text-[11px] font-black uppercase tracking-[0.12em] text-white/55 data-[state=active]:bg-white data-[state=active]:text-emerald-950 sm:text-xs sm:tracking-[0.16em]"
                  >
                    Masuk
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-[11px] font-black uppercase tracking-[0.12em] text-white/55 data-[state=active]:bg-white data-[state=active]:text-emerald-950 sm:text-xs sm:tracking-[0.16em]"
                  >
                    Buat Akun
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-identifier" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                        Username atau Email
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                        <Input
                          id="login-identifier"
                          type="text"
                          value={identifier}
                          onChange={(event) => setIdentifier(event.target.value)}
                          placeholder="admin atau email@domain.com"
                          className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="login-password" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setMode("reset")}
                          className="shrink-0 text-[11px] font-bold text-emerald-300 transition-colors hover:text-white sm:text-xs"
                        >
                          Lupa password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                        <Input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Masukkan password"
                          className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-emerald-600 text-xs font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 sm:text-sm sm:tracking-[0.14em]"
                      disabled={loading}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {loading ? "Otentikasi..." : "Masuk ke Dashboard"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                        Nama Lengkap
                      </Label>
                      <Input
                        id="signup-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Nama lengkap"
                        className="h-12 rounded-xl border-white/10 bg-white/[0.06] text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-identifier" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                        Username atau Email Baru
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                        <Input
                          id="signup-identifier"
                          type="text"
                          value={identifier}
                          onChange={(event) => setIdentifier(event.target.value)}
                          placeholder="username baru"
                          className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-xs font-black uppercase tracking-[0.16em] text-emerald-50">
                        Password Baru
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                        <Input
                          id="signup-password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="h-12 rounded-xl border-white/10 bg-white/[0.06] pl-11 text-white placeholder:text-white/35 focus-visible:ring-emerald-300"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-emerald-600 text-xs font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 sm:text-sm sm:tracking-[0.14em]"
                      disabled={loading}
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      {loading ? "Mendaftarkan..." : "Daftarkan Akun Baru"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <p className="mt-6 border-t border-white/10 pt-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Fazma Stone Inventory System
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
