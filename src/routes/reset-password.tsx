import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [ { title: "Reset password | Virtual Science Park" }, { name: "description", content: "Securely update your Virtual Science Park workspace password." }, { property: "og:title", content: "Reset password | Virtual Science Park" }, { property: "og:description", content: "Recover access to your private innovation workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" } ] }),
  component: ResetPassword,
});
function ResetPassword() {
  const [password,setPassword] = useState(""); const [message,setMessage] = useState(""); const [ready,setReady] = useState(false); const [busy,setBusy] = useState(false);
  useEffect(() => { void supabase.auth.getSession().then(({data}) => setReady(!!data.session)); const {data} = supabase.auth.onAuthStateChange((_e,s) => setReady(!!s)); return () => data.subscription.unsubscribe(); },[]);
  return <main className="min-h-screen flex items-center justify-center p-6"><form className="w-full max-w-sm auth-form" onSubmit={async e => { e.preventDefault(); setBusy(true); const {error} = await supabase.auth.updateUser({password}); setBusy(false); setMessage(error ? error.message : "Your password has been updated."); }}><h1 className="text-2xl font-bold">Reset your password</h1><p className="text-sm text-muted-foreground">{ready ? "Choose a new password for your workspace." : "Open the secure link in your password reset email."}</p><label htmlFor="new-password">New password</label><input id="new-password" className="field-input" required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/><Button disabled={!ready || busy} type="submit">Update password</Button>{message && <p role="status">{message}</p>}<Button asChild variant="link"><Link to="/">Back to your workspace</Link></Button></form></main>;
}