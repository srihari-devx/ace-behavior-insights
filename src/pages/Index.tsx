import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Shield, BarChart3 } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/test");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-primary-foreground">ACE</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            ACE Recruitment
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive Behavior Analysis Test Platform
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/login")}>
              Start Test
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/admin")}>
              Admin Login
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <ClipboardCheck className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Comprehensive Testing</CardTitle>
              <CardDescription>
                7-point Likert scale assessment with trait-based evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• One question at a time</li>
                <li>• Auto-save responses</li>
                <li>• No time limits</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-secondary mb-4" />
              <CardTitle>Secure & Reliable</CardTitle>
              <CardDescription>
                Protected login system with register-based authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Secure authentication</li>
                <li>• One-time submission</li>
                <li>• Data integrity</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-accent mb-4" />
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>
                Detailed trait-wise scoring and visual reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Trait breakdown</li>
                <li>• Visual charts</li>
                <li>• Export results</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
