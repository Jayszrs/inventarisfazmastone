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
    "h-[50px] rounded-none border-white/55 bg-transparent pl-12 text-[15px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] placeholder:text-slate-300/62 focus-visible:border-emerald-300 focus-visible:ring-1 focus-visible:ring-emerald-400";
  const labelClass = "text-xs font-black uppercase tracking-[0.05em] text-white";
  const primaryButtonClass =
    "h-[50px] w-full rounded-none bg-gradient-to-r from-[#10b98a] via-[#10a57c] to-[#078761] text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_45px_rgba(0,148,103,0.28)] transition-all hover:from-[#18c998] hover:to-[#0d946b]";

  return (
    <main className="flex min-h-screen overflow-hidden bg-[#050b08] text-white">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#0c1812] lg:block lg:w-[56%]">
        <img
          src={STONE_TEXTURE_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-100"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,20,13,0.93),rgba(5,18,12,0.62)_44%,rgba(6,15,11,0.24)),radial-gradient(circle_at_17%_78%,rgba(44,179,105,0.2),transparent_28%)]" />
        <div className="absolute -left-[12%] top-[-19%] h-[330px] w-[92%] rounded-[0_0_100%_0] border-b border-emerald-300/18 bg-emerald-800/20" />
        <div className="absolute inset-x-[-18%] bottom-[-18%] h-[250px] rounded-[50%] border border-emerald-300/14 bg-emerald-900/38" />
        <div className="absolute right-[22%] top-0 h-full w-52 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0_2px,transparent_2px_17px)] opacity-80" />
        <div className="absolute right-[21.2%] top-0 h-full w-px bg-amber-100/70 shadow-[0_0_34px_rgba(251,191,36,0.62)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:205px_99px]" />

        <div className="absolute left-[60px] top-[72px] z-10">
          <img
            src={LOGO_URL}
            alt="Fazma Stone"
            className="h-[58px] w-auto object-contain brightness-0 invert drop-shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
          />
        </div>

        <div className="absolute left-[60px] top-[162px] z-10 max-w-[660px]">
          <div className="mb-6 flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-emerald-100/30 bg-emerald-950/35 text-emerald-100 shadow-lg shadow-emerald-950/25 backdrop-blur">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.7} />
          </div>
          <h1 className="font-heading text-[43px] font-black leading-[1.16] tracking-normal text-white xl:text-[54px]">
            <span className="text-[#54c786]">Dashboard</span> Inventaris
            <span className="block">Fazma Stone</span>
          </h1>
          <span className="mt-5 block h-[3px] w-12 bg-[#10c98a]" />
          <p className="mt-5 max-w-[650px] text-[17px] leading-[1.75] text-white/88">
            Kelola stok batu alam, nota transaksi, dokumentasi gudang, dan akses karyawan dalam satu sistem operasional.
          </p>
        </div>

        <div className="absolute bottom-[92px] left-[60px] right-0 z-10 h-[310px]">
          <div className="absolute bottom-0 left-0 h-[84px] w-[76px] rounded-b-2xl bg-[#11130f] shadow-[0_0_26px_rgba(239,226,171,0.18)]" />
          <div className="absolute bottom-[72px] left-[35px] h-[150px] w-[4px] bg-[#1e2316]" />
          <span className="absolute bottom-[122px] left-[14px] h-[46px] w-[6px] origin-bottom rotate-[-42deg] rounded-full bg-[#8da049]" />
          <span className="absolute bottom-[145px] left-[26px] h-[58px] w-[6px] origin-bottom rotate-[-24deg] rounded-full bg-[#b0bb64]" />
          <span className="absolute bottom-[136px] left-[45px] h-[54px] w-[6px] origin-bottom rotate-[32deg] rounded-full bg-[#8c9a47]" />
          <span className="absolute bottom-[162px] left-[53px] h-[42px] w-[5px] origin-bottom rotate-[57deg] rounded-full bg-[#c4cc74]" />

          <div className="absolute bottom-[5px] left-[16%] h-[185px] w-[59%] border border-stone-200/25 bg-[#3d372c] shadow-[0_30px_58px_rgba(0,0,0,0.54)]">
            <img src={STONE_TEXTURE_URL} alt="" className="h-full w-full object-cover opacity-75 mix-blend-luminosity" aria-hidden="true" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(163,139,94,0.4),rgba(29,26,20,0.72))]" />
          </div>
          <div className="absolute bottom-[33px] left-[40%] h-[145px] w-[32%] border border-stone-100/30 bg-[linear-gradient(135deg,#909879,#293125_52%,#65705b)] shadow-[0_18px_38px_rgba(0,0,0,0.5)]">
            <img src={STONE_TEXTURE_URL} alt="" className="h-full w-full object-cover opacity-65 mix-blend-overlay" aria-hidden="true" />
          </div>
          <div className="absolute bottom-0 left-[21%] h-[93px] w-[30%] border border-stone-100/45 bg-[linear-gradient(180deg,#ecd5b5,#b99770_48%,#f3e5ce)] shadow-[0_16px_28px_rgba(0,0,0,0.42)]" />
          <div className="absolute bottom-0 left-[43%] h-[63px] w-[28%] border border-stone-100/24 bg-[linear-gradient(180deg,#3b3c35,#10110f_52%,#746b5d)] shadow-[0_16px_32px_rgba(0,0,0,0.5)]" />

          <div className="absolute bottom-[18px] right-[18px] h-[220px] w-[178px]">
            <span className="absolute bottom-0 left-[94px] h-[158px] w-5 rounded-full bg-[#132015]" />
            <span className="absolute bottom-[75px] left-[12px] h-[130px] w-14 origin-bottom -rotate-45 rounded-[100%_0] bg-[linear-gradient(90deg,#2a3f1e,#a7b474)] shadow-[0_10px_25px_rgba(0,0,0,0.38)]" />
            <span className="absolute bottom-[104px] left-[80px] h-[146px] w-[58px] origin-bottom rotate-12 rounded-[100%_0] bg-[linear-gradient(90deg,#1c311d,#82945a)] shadow-[0_10px_25px_rgba(0,0,0,0.38)]" />
            <span className="absolute bottom-[18px] left-[88px] h-[136px] w-[54px] origin-bottom rotate-[52deg] rounded-[100%_0] bg-[linear-gradient(90deg,#203c20,#9da956)] shadow-[0_10px_25px_rgba(0,0,0,0.38)]" />
          </div>
          <div className="absolute bottom-[-40px] left-[-70px] right-[-40px] h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(1,8,5,0.38))]" />
        </div>

        <p className="absolute bottom-[30px] left-[60px] z-10 text-xs text-emerald-50/60">&copy; {new Date().getFullYear()} Fazma Stone Inventory System</p>
      </section>

      <section className="relative flex min-h-screen w-full items-center justify-start overflow-hidden bg-[#020806] px-6 py-20 lg:w-[44%] lg:justify-center lg:px-12 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_93%,rgba(6,170,112,0.28),transparent_24%),radial-gradient(circle_at_20%_4%,rgba(255,255,255,0.07),transparent_18%),linear-gradient(110deg,rgba(255,255,255,0.018),transparent_45%)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-white/12" />

        <div className="absolute left-6 top-6 lg:hidden">
          <img
            src={LOGO_URL}
            alt="Fazma Stone"
            className="h-16 w-auto object-contain brightness-0 invert drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
          />
        </div>

        <div className="relative z-10 w-full max-w-[342px] pt-14 sm:max-w-[458px] lg:pt-0">
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
