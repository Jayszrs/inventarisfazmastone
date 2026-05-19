import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { defaultRoleForEmail } from "@/lib/admin";
import { ArrowLeft, ChevronLeft, Lock, Mail, User } from "lucide-react";

import LOGIN_REFERENCE_URL from "@/assets/login-admin-reference.png";

type AuthMode = "login" | "signup" | "reset";

type AdminRpcClient = {
  rpc: (
    fn: "confirm_allowed_admin_email",
    args: { target_email: string },
  ) => Promise<{ data: boolean | null; error: { message?: string } | null }>;
};

const adminRpc = supabase as unknown as AdminRpcClient;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
};

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
        const { data: confirmed } = await adminRpc.rpc("confirm_allowed_admin_email", {
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
    } catch {
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
        await adminRpc.rpc("confirm_allowed_admin_email", { target_email: targetEmail });

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
    } catch (error: unknown) {
      toast({ title: "Pendaftaran gagal", description: getErrorMessage(error), variant: "destructive" });
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
    } catch (error: unknown) {
      toast({ title: "Reset password gagal", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "h-[50px] rounded-none border-white/55 bg-transparent pl-12 text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] placeholder:text-slate-300/62 focus-visible:border-emerald-300 focus-visible:ring-1 focus-visible:ring-emerald-400";
  const labelClass = "text-xs font-black uppercase tracking-[0.05em] text-white";
  const primaryButtonClass =
    "h-[50px] w-full rounded-none bg-gradient-to-r from-[#10b98a] via-[#10a57c] to-[#078761] text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(0,148,103,0.28)] transition-all hover:from-[#18c998] hover:to-[#0d946b]";

  return (
    <main className="min-h-screen overflow-hidden bg-[#020806] text-white lg:flex">
      <section className="relative hidden min-h-screen overflow-hidden lg:block lg:w-[56%]">
        <img
          src={LOGIN_REFERENCE_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left"
          aria-hidden="true"
        />
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-[#020806] lg:flex lg:w-[44%] lg:items-center lg:justify-center lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_93%,rgba(6,170,112,0.28),transparent_24%),radial-gradient(circle_at_20%_4%,rgba(255,255,255,0.07),transparent_18%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/12" />

        <div className="relative z-10 w-full max-w-[458px]">
            <a href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-white/82 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </a>

            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-12 bg-[#0ec487]" />
              <span className="text-xs font-black uppercase tracking-[0.58em] text-[#20df9c]">Area Terbatas</span>
            </div>
            <h2 className="font-heading text-[38px] font-black tracking-normal text-white drop-shadow-[0_5px_0_rgba(255,255,255,0.1)]">
              {mode === "signup" ? "Buat Akun" : mode === "reset" ? "Reset Password" : "Login Admin"}
            </h2>
            <p className="mt-4 max-w-[420px] text-base leading-8 text-white/88">
              {mode === "signup"
                ? "Daftarkan akses baru untuk tim Fazma Stone."
                : mode === "reset"
                  ? "Masukkan username atau email untuk menerima instruksi reset."
                  : "Masuk untuk mengelola inventaris dan dashboard operasional."}
            </p>

            {mode === "reset" ? (
              <form onSubmit={handleResetPassword} className="mt-10 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="desktop-reset-identifier" className={labelClass}>
                    Username atau Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                    <Input
                      id="desktop-reset-identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="admin atau email@fazmastone.com"
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className={primaryButtonClass} disabled={loading}>
                  {loading ? "Mengirim..." : "Kirim Link Reset"}
                </Button>

                <button type="button" className="mx-auto flex items-center gap-2 text-sm text-white/55 hover:text-white" onClick={() => setMode("login")}>
                  <ChevronLeft className="h-4 w-4" />
                  Kembali ke login
                </button>
              </form>
            ) : mode === "signup" ? (
              <form onSubmit={handleSignUp} className="mt-10 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="desktop-signup-name" className={labelClass}>
                    Nama Lengkap
                  </Label>
                  <Input
                    id="desktop-signup-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama lengkap"
                    className="h-[54px] rounded-none border-white/40 bg-transparent text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-slate-300/60 focus-visible:border-emerald-300 focus-visible:ring-1 focus-visible:ring-emerald-400"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="desktop-signup-identifier" className={labelClass}>
                    Username atau Email Baru
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                    <Input
                      id="desktop-signup-identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="username baru"
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="desktop-signup-password" className={labelClass}>
                    Password Baru
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                    <Input
                      id="desktop-signup-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimal 6 karakter"
                      className={fieldClass}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className={primaryButtonClass} disabled={loading}>
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
              <form onSubmit={handleLogin} className="mt-10 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="desktop-login-identifier" className={labelClass}>
                    Email / Username
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                    <Input
                      id="desktop-login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="admin atau email@fazmastone.com"
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="desktop-login-password" className={labelClass}>
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                    <Input
                      id="desktop-login-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan password"
                      className={fieldClass}
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

                <Button type="submit" className={primaryButtonClass} disabled={loading}>
                  {loading ? "Memproses..." : "Masuk ke Dashboard"}
                </Button>

                <p className="text-center text-xs text-white/52">
                  Akun baru hanya dapat dibuat oleh admin melalui Role Management.
                </p>
              </form>
            )}
          </div>
      </section>

      <section className="relative z-10 flex min-h-screen w-full items-center justify-start overflow-hidden bg-[#020806] px-6 py-20 lg:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_93%,rgba(6,170,112,0.28),transparent_24%),radial-gradient(circle_at_20%_4%,rgba(255,255,255,0.07),transparent_18%),linear-gradient(110deg,rgba(255,255,255,0.018),transparent_45%)]" />

        <div className="relative z-10 w-full max-w-[342px] pt-14 sm:max-w-[458px]">
          <div className="mb-12">
            <a
              href="/"
              className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-white/82 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </a>

            <div className="mb-5 flex items-center gap-4">
              <span className="h-px w-12 bg-[#0ec487]" />
              <span className="text-xs font-black uppercase tracking-[0.58em] text-[#20df9c]">Area Terbatas</span>
            </div>
            <h2 className="font-heading text-[38px] font-black tracking-normal text-white drop-shadow-[0_5px_0_rgba(255,255,255,0.1)]">
              {mode === "signup" ? "Buat Akun" : mode === "reset" ? "Reset Password" : "Login Admin"}
            </h2>
            <p className="mt-4 max-w-[420px] text-base leading-8 text-white/88">
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
                <Label htmlFor="reset-identifier" className={labelClass}>
                  Username atau Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                  <Input
                    id="reset-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin atau email@fazmastone.com"
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className={primaryButtonClass} disabled={loading}>
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
                <Label htmlFor="signup-name" className={labelClass}>
                  Nama Lengkap
                </Label>
                <Input
                  id="signup-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama lengkap"
                  className="h-[54px] rounded-none border-white/40 bg-transparent text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-slate-300/60 focus-visible:border-emerald-300 focus-visible:ring-1 focus-visible:ring-emerald-400"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="signup-identifier" className={labelClass}>
                  Username atau Email Baru
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                  <Input
                    id="signup-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="username baru"
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="signup-password" className={labelClass}>
                  Password Baru
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimal 6 karakter"
                    className={fieldClass}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className={primaryButtonClass} disabled={loading}>
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
                <Label htmlFor="login-identifier" className={labelClass}>
                  Email / Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="admin atau email@fazmastone.com"
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="login-password" className={labelClass}>
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password"
                    className={fieldClass}
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

              <Button type="submit" className={primaryButtonClass} disabled={loading}>
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
