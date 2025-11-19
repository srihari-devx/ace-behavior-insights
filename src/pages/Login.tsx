import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  regno: z.string().trim().min(1, "Register number is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [regno, setRegno] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
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

    if (isSignUp && !name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);

    // Convert regno to email format
    const email = `${regno}@ace.test`;
    
    if (isSignUp) {
      const { error } = await signUp(email, password, name, regno);
      
      if (error) {
        toast.error(error.message || "Failed to create account");
      } else {
        toast.success("Account created successfully!");
        navigate("/test");
      }
    } else {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error("Invalid credentials. Please check your register number and password.");
      } else {
        toast.success("Login successful!");
        navigate("/test");
      }
    }

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
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Register to access the behavior analysis test"
              : "Enter your credentials to access the behavior analysis test"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
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
            )}
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
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
