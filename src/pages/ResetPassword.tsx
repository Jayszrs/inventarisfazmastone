import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import LOGO_URL from "@/assets/logo-fazma.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses recovery tokens from URL hash automatically and emits PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password terlalu pendek", description: "Minimal 6 karakter.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Konfirmasi tidak cocok", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password berhasil diubah", description: "Silakan login dengan password baru." });
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      toast({ title: "Gagal mengubah password", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <img src={LOGO_URL} alt="Fazma Stone" className="mx-auto h-20 w-auto object-contain" />
          <p className="mt-3 text-sm text-muted-foreground">Reset Password Akun Anda</p>
        </div>
        <div className="glass-card rounded-lg p-6 glow-primary">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">
              Memverifikasi link reset password... Pastikan Anda membuka link dari email reset password.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
