import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const LOGO_URL = encodeURI("/Logo Fazma Stone Hitam.png");

type AuthMode = "login" | "signup" | "reset";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const emailRedirectTo = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo },
      });

      if (error) throw error;

      toast({
        title: "Akun berhasil dibuat",
        description: "Akun Anda terdaftar sebagai User. Hubungi admin untuk peningkatan akses.",
      });
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

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      toast({
        title: "Email reset terkirim",
        description: "Periksa inbox email untuk melanjutkan reset password.",
      });
      setMode("login");
    } catch (error: any) {
      toast({ title: "Reset password gagal", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src={LOGO_URL} alt="Fazma Stone" className="mx-auto h-20 w-auto object-contain" />
          <p className="mt-3 text-sm text-muted-foreground">Sistem Manajemen Transaksi Fazma Stone</p>
        </div>

        <div className="glass-card rounded-lg p-6 glow-primary">
          {mode === "reset" ? (
            <ResetPasswordForm
              email={email}
              loading={loading}
              onEmailChange={setEmail}
              onBack={() => setMode("login")}
              onSubmit={handleResetPassword}
            />
          ) : (
            <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Buat Akun</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email@contoh.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Lupa Password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
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
                      placeholder="Nama pengguna"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email@contoh.com"
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Mendaftarkan..." : "Buat Akun"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm({
  email,
  loading,
  onEmailChange,
  onBack,
  onSubmit,
}: {
  email: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Reset Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masukkan email akun untuk menerima link reset password.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="email@contoh.com"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Mengirim..." : "Kirim Link Reset"}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={onBack}>
        Kembali ke Login
      </Button>
    </form>
  );
}
