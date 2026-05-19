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
    "h-[54px] rounded-none border-white/40 bg-transparent pl-12 text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] placeholder:text-slate-300/60 focus-visible:border-emerald-300 focus-visible:ring-1 focus-visible:ring-emerald-400";
  const labelClass = "text-xs font-black uppercase tracking-[0.05em] text-white";
  const primaryButtonClass =
    "h-[56px] w-full rounded-none bg-gradient-to-r from-[#0db585] via-[#10a57c] to-[#08855f] text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(0,148,103,0.28)] transition-all hover:from-[#18c998] hover:to-[#0d946b]";

  return (
    <main className="flex min-h-screen overflow-hidden bg-[#050b08] text-white">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#0c1812] px-12 py-12 lg:flex lg:w-[56%] xl:px-16">
        <img
          src={STONE_TEXTURE_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-100"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,20,13,0.9),rgba(5,18,12,0.48)_44%,rgba(6,16,12,0.25)),radial-gradient(circle_at_20%_80%,rgba(35,177,105,0.24),transparent_28%)]" />
        <div className="absolute inset-x-[-12%] top-[-18%] h-72 rounded-[50%] border border-emerald-300/20 bg-emerald-800/20 blur-[1px]" />
        <div className="absolute inset-x-[-16%] bottom-[-16%] h-72 rounded-[50%] border border-emerald-300/15 bg-emerald-900/34" />
        <div className="absolute right-[20%] top-0 h-full w-44 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_18px)] opacity-70" />
        <div className="absolute right-[18%] top-0 h-full w-1 bg-amber-200/55 shadow-[0_0_32px_rgba(251,191,36,0.55)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:220px_96px]" />

        <div className="relative z-10">
          <img
            src={LOGO_URL}
            alt="Fazma Stone"
            className="h-[70px] w-auto object-contain brightness-0 invert drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
          />
        </div>

        <div className="relative z-10 max-w-2xl pb-28">
          <div className="mb-7 flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-emerald-100/30 bg-emerald-950/35 text-emerald-100 shadow-lg shadow-emerald-950/25 backdrop-blur">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <h1 className="font-heading text-[44px] font-black leading-[1.12] tracking-normal xl:text-[56px]">
            <span className="text-[#54c786]">Dashboard</span> Inventaris
            <span className="block">Fazma Stone</span>
          </h1>
          <span className="mt-6 block h-1 w-14 bg-[#11c489]" />
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-white/85">
            Kelola stok batu alam, nota transaksi, dokumentasi gudang, dan akses karyawan dalam satu sistem operasional.
          </p>

          <div className="relative mt-10 h-[255px] max-w-[720px]">
            <div className="absolute bottom-0 left-0 h-28 w-24 rounded-t-full bg-[radial-gradient(circle_at_42%_10%,#8aa258,transparent_12%),linear-gradient(180deg,#566a27,#1b2212)] shadow-[0_0_28px_rgba(206,221,126,0.18)]" />
            <div className="absolute bottom-0 left-9 h-36 w-3 bg-[#1a1d12]" />
            <div className="absolute bottom-[35px] left-6 h-16 w-3 origin-bottom rotate-[-24deg] rounded-full bg-[#91a64a]" />
            <div className="absolute bottom-[58px] left-11 h-16 w-3 origin-bottom rotate-[28deg] rounded-full bg-[#81973b]" />
            <div className="absolute bottom-[78px] left-14 h-14 w-3 origin-bottom rotate-[55deg] rounded-full bg-[#a6b85a]" />

            <div className="absolute bottom-0 left-[17%] h-[176px] w-[58%] border border-stone-200/25 bg-[#3f3a2e] shadow-[0_26px_55px_rgba(0,0,0,0.5)]">
              <img src={STONE_TEXTURE_URL} alt="" className="h-full w-full object-cover opacity-70 mix-blend-luminosity" aria-hidden="true" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(164,146,108,0.35),rgba(29,26,20,0.65))]" />
            </div>
            <div className="absolute bottom-2 left-[39%] h-[126px] w-[38%] border border-stone-100/30 bg-[linear-gradient(135deg,#6f765d,#182117_55%,#7d8668)] shadow-[0_18px_38px_rgba(0,0,0,0.48)]">
              <img src={STONE_TEXTURE_URL} alt="" className="h-full w-full object-cover opacity-55 mix-blend-overlay" aria-hidden="true" />
            </div>
            <div className="absolute bottom-0 left-[22%] h-[84px] w-[31%] border border-stone-100/45 bg-[linear-gradient(180deg,#d1b893,#a78960_48%,#efe2c8)] shadow-[0_14px_28px_rgba(0,0,0,0.4)]" />
            <div className="absolute bottom-0 left-[44%] h-[58px] w-[31%] border border-stone-100/24 bg-[linear-gradient(180deg,#2d2f2a,#0e0f0d_52%,#6b6252)] shadow-[0_16px_32px_rgba(0,0,0,0.48)]" />

            <div className="absolute bottom-3 right-0 h-44 w-40">
              <span className="absolute bottom-0 left-16 h-36 w-4 rounded-full bg-[#152015]" />
              <span className="absolute bottom-14 left-4 h-28 w-12 origin-bottom -rotate-45 rounded-[100%_0] bg-[linear-gradient(90deg,#314421,#9bad68)] shadow-[0_10px_25px_rgba(0,0,0,0.35)]" />
              <span className="absolute bottom-20 left-16 h-32 w-14 origin-bottom rotate-12 rounded-[100%_0] bg-[linear-gradient(90deg,#1c311d,#7a8b4f)] shadow-[0_10px_25px_rgba(0,0,0,0.35)]" />
              <span className="absolute bottom-5 left-20 h-28 w-12 origin-bottom rotate-[50deg] rounded-[100%_0] bg-[linear-gradient(90deg,#233c20,#8f9d54)] shadow-[0_10px_25px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-50/60">&copy; {new Date().getFullYear()} Fazma Stone Inventory System</p>
      </section>

      <section className="relative flex min-h-screen w-full items-center justify-start overflow-hidden bg-[#030907] px-6 py-20 lg:w-[44%] lg:justify-center lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_93%,rgba(6,170,112,0.26),transparent_25%),radial-gradient(circle_at_18%_4%,rgba(255,255,255,0.08),transparent_18%),linear-gradient(110deg,rgba(255,255,255,0.02),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/10" />

        <div className="absolute left-6 top-6 lg:hidden">
          <img
            src={LOGO_URL}
            alt="Fazma Stone"
            className="h-16 w-auto object-contain brightness-0 invert drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
          />
        </div>

        <div className="relative z-10 w-full max-w-[342px] pt-14 sm:max-w-[520px] lg:pt-0">
          <div className="mb-11">
            <a
              href="/"
              className="mb-11 inline-flex items-center gap-2 text-sm font-semibold text-white/82 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </a>

            <div className="mb-6 flex items-center gap-4">
              <span className="h-px w-12 bg-[#0ec487]" />
              <span className="text-xs font-black uppercase tracking-[0.52em] text-[#20df9c]">Area Terbatas</span>
            </div>
            <h2 className="font-heading text-[38px] font-black tracking-normal text-white drop-shadow-[0_5px_0_rgba(255,255,255,0.1)]">
              {mode === "signup" ? "Buat Akun" : mode === "reset" ? "Reset Password" : "Login Admin"}
            </h2>
            <p className="mt-4 max-w-[430px] text-base leading-8 text-white/85">
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
