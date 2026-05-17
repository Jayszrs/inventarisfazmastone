import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { defaultRoleForEmail } from "@/lib/admin";
import { ArrowLeft, ChevronLeft, Lock, Mail, ShieldCheck, User } from "lucide-react";

import LOGO_URL from "@/assets/logo-fazma.png";
import STONE_TEXTURE_URL from "@/assets/natural-stone-texture.svg";

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
    <main className="flex min-h-screen overflow-hidden bg-[#09100c] text-white">
      <section className="relative hidden min-h-screen w-1/2 flex-col justify-between overflow-hidden bg-emerald-900 px-11 py-12 lg:flex">
        <img
          src={STONE_TEXTURE_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-95"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,49,31,0.88),rgba(17,93,50,0.72)),radial-gradient(circle_at_18%_76%,rgba(34,197,94,0.34),transparent_30%)]" />
        <div className="absolute -right-16 top-0 h-full w-44 bg-white/5 blur-3xl" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-36 items-center justify-center rounded-lg bg-white px-4 shadow-xl shadow-emerald-950/30">
            <img src={LOGO_URL} alt="Fazma Stone" className="max-h-9 w-auto object-contain" />
          </div>
          <div>
            <p className="font-heading text-lg font-black leading-none">FAZMA STONE</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.35em] text-emerald-100/75">Natural Stone</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl pb-20">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/30 bg-emerald-950/35 text-emerald-100 shadow-lg shadow-emerald-950/25 backdrop-blur">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-4xl font-black leading-tight tracking-tight xl:text-5xl">
            Dashboard Inventaris
            <span className="block">Fazma Stone</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-emerald-50/78">
            Kelola stok batu alam, nota transaksi, dokumentasi gudang, dan akses karyawan dalam satu sistem operasional.
          </p>

          <div className="mt-10 h-44 max-w-md overflow-hidden rounded-sm border border-white/15 shadow-2xl shadow-emerald-950/30">
            <img src={STONE_TEXTURE_URL} alt="Tekstur batu alam hijau" className="h-full w-full object-cover" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-50/55">© {new Date().getFullYear()} Fazma Stone Inventory System</p>
      </section>

      <section className="relative flex min-h-screen w-full items-center justify-start overflow-hidden bg-[#08100c] px-6 py-20 lg:w-1/2 lg:justify-center lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_92%,rgba(22,163,74,0.18),transparent_24%)]" />

        <div className="absolute left-6 top-6 flex h-14 w-36 items-center justify-center rounded-lg bg-white px-4 shadow-lg shadow-black/20 lg:hidden">
          <img src={LOGO_URL} alt="Fazma Stone" className="max-h-9 w-auto object-contain" />
        </div>

        <div className="relative z-10 w-full max-w-[342px] pt-14 sm:max-w-md lg:pt-0">
          <div className="mb-10">
            <a
              href="/"
              className="mb-9 inline-flex items-center gap-2 text-sm text-white/58 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </a>

            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-11 bg-emerald-500" />
              <span className="text-xs font-black uppercase tracking-[0.36em] text-emerald-400">Area Terbatas</span>
            </div>
            <h2 className="font-heading text-4xl font-black tracking-tight text-white">
              {mode === "signup" ? "Buat Akun" : mode === "reset" ? "Reset Password" : "Login Admin"}
            </h2>
            <p className="mt-3 text-base leading-7 text-white/58">
              {mode === "signup"
                ? "Daftarkan akses baru untuk tim Fazma Stone."
                : mode === "reset"
                  ? "Masukkan username atau email untuk menerima instruksi reset."
                  : "Masuk untuk mengelola inventaris dan dashboard operasional."}
            </p>
          </div>

          {mode === "reset" ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="reset-identifier" className="text-xs font-black uppercase tracking-wide text-white">
                  Username atau Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <Input
                    id="reset-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin atau email@fazmastone.com"
                    className="h-12 rounded-none border-white/14 bg-transparent pl-11 text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="h-12 w-full rounded-none bg-emerald-700 font-black uppercase tracking-wide text-white hover:bg-emerald-600" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>

              <button type="button" className="mx-auto flex items-center gap-2 text-sm text-white/55 hover:text-white" onClick={() => setMode("login")}>
                <ChevronLeft className="h-4 w-4" />
                Kembali ke login
              </button>
            </form>
          ) : mode === "signup" ? (
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="signup-name" className="text-xs font-black uppercase tracking-wide text-white">
                  Nama Lengkap
                </Label>
                <Input
                  id="signup-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama lengkap"
                  className="h-12 rounded-none border-white/14 bg-transparent text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="signup-identifier" className="text-xs font-black uppercase tracking-wide text-white">
                  Username atau Email Baru
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <Input
                    id="signup-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="username baru"
                    className="h-12 rounded-none border-white/14 bg-transparent pl-11 text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="signup-password" className="text-xs font-black uppercase tracking-wide text-white">
                  Password Baru
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="h-12 rounded-none border-white/14 bg-transparent pl-11 text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="h-12 w-full rounded-none bg-emerald-700 font-black uppercase tracking-wide text-white hover:bg-emerald-600" disabled={loading}>
                {loading ? "Mendaftarkan..." : "Daftarkan Akun"}
              </Button>

              <p className="text-center text-sm text-white/52">
                Sudah punya akun?{" "}
                <button type="button" className="font-bold text-emerald-400 hover:text-emerald-300" onClick={() => setMode("login")}>
                  Masuk
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="login-identifier" className="text-xs font-black uppercase tracking-wide text-white">
                  Email / Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin atau email@fazmastone.com"
                    className="h-12 rounded-none border-white/14 bg-transparent pl-11 text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="login-password" className="text-xs font-black uppercase tracking-wide text-white">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    className="h-12 rounded-none border-white/14 bg-transparent pl-11 text-white placeholder:text-white/42 focus-visible:ring-emerald-500"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("reset")} className="text-xs font-bold text-emerald-400 hover:text-emerald-300">
                    Lupa password?
                  </button>
                </div>
              </div>

              <Button type="submit" className="h-12 w-full rounded-none bg-emerald-700 font-black uppercase tracking-wide text-white hover:bg-emerald-600" disabled={loading}>
                {loading ? "Memproses..." : "Masuk ke Dashboard"}
              </Button>

              <p className="text-center text-sm text-white/52">
                Belum punya akun?{" "}
                <button type="button" className="font-bold text-emerald-400 hover:text-emerald-300" onClick={() => setMode("signup")}>
                  Buat akun
                </button>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
