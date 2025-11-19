import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface CandidateManagerProps {
  onCandidateCreated: () => void;
}

export default function CandidateManager({ onCandidateCreated }: CandidateManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [regno, setRegno] = useState("");
  const [password, setPassword] = useState("cand1234");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !regno.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const email = `${regno}@ace.test`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            regno,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      toast.success(`Candidate created successfully! Regno: ${regno}, Password: ${password}`);
      setOpen(false);
      setName("");
      setRegno("");
      setPassword("cand1234");
      onCandidateCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create candidate");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Create Candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Candidate</DialogTitle>
          <DialogDescription>
            Add a new candidate account. Default password is "cand1234" but can be changed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter candidate name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regno">Register Number</Label>
            <Input
              id="regno"
              value={regno}
              onChange={(e) => setRegno(e.target.value)}
              placeholder="Enter register number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Default: cand1234"
            />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Candidate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
