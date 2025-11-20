import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  regno: z.string().trim().min(1, "Register number is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [regno, setRegno] = useState("");
  const [password, setPassword] = useState("cand1234");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ regno, password });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);

    // Convert regno to email format
    const email = `${regno}@ace.test`;
    const defaultPassword = "cand1234";
    
    // First, try to sign in
    let signInResult = await signIn(email, password);
    
    // If sign in fails, try to create account with provided details
    if (signInResult.error) {
      // Only auto-register if using default password
      if (password === defaultPassword) {
        const signUpResult = await signUp(email, defaultPassword, name, regno);
        
        if (signUpResult.error) {
          toast.error("Unable to create account. Please try again.");
          setLoading(false);
          return;
        }
        
        // Now sign in with the newly created account
        signInResult = await signIn(email, defaultPassword);
        
        if (signInResult.error) {
          toast.error("Account created but login failed. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        toast.error("Invalid credentials. Please use the default password (cand1234) for first login.");
        setLoading(false);
        return;
      }
    }
    
    // Check if user is admin
    if (signInResult.role === "admin") {
      toast.error("Please use the admin login page.");
      await signOut();
      setLoading(false);
      return;
    }
    
    // Check if candidate already submitted test
    const { data: existingSubmission } = await supabase
      .from("test_submissions")
      .select("id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle();
    
    if (existingSubmission) {
      toast.error("You have already completed the test.");
      await signOut();
      setLoading(false);
      return;
    }
    
    toast.success("Login successful!");
    navigate("/test");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">ACE</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Candidate Login</CardTitle>
          <CardDescription>
            Enter your register number, name, and password to access the test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regno">Register Number</Label>
              <Input
                id="regno"
                type="text"
                placeholder="Enter your register number"
                value={regno}
                onChange={(e) => setRegno(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Default password: cand1234 (changeable by admin)
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
