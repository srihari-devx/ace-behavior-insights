import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TraitScore {
  trait: string;
  averageScore: number;
  questionCount: number;
}

export default function Results() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const [traitScores, setTraitScores] = useState<TraitScore[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    // Fetch submission
    const { data: submission } = await supabase
      .from("test_submissions")
      .select("total_score")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (!submission) {
      navigate("/test");
      return;
    }

    setTotalScore(submission.total_score || 0);

    // Fetch responses with questions
    const { data: responses } = await supabase
      .from("responses")
      .select(`
        final_score,
        questions (trait)
      `)
      .eq("user_id", user?.id);

    if (responses) {
      // Calculate trait scores
      const traitMap: Record<string, { total: number; count: number }> = {};

      responses.forEach((response: any) => {
        const trait = response.questions.trait;
        if (!traitMap[trait]) {
          traitMap[trait] = { total: 0, count: 0 };
        }
        traitMap[trait].total += response.final_score;
        traitMap[trait].count += 1;
      });

      const traits: TraitScore[] = Object.entries(traitMap).map(([trait, data]) => ({
        trait,
        averageScore: data.total / data.count,
        questionCount: data.count,
      }));

      setTraitScores(traits.sort((a, b) => b.averageScore - a.averageScore));
    }

    setLoading(false);
  };

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 py-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-success" />
          </div>
          <h1 className="text-3xl font-bold">Test Completed!</h1>
          <p className="text-muted-foreground">
            Your behavior analysis results are ready
          </p>
        </div>

        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Total Score</CardTitle>
            <CardDescription>Overall performance across all traits</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="text-6xl font-bold text-primary">{totalScore}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trait Analysis</CardTitle>
            <CardDescription>Your average scores by trait category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={traitScores} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="trait" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 7]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{payload[0].payload.trait}</p>
                            <p className="text-sm text-muted-foreground">
                              Average: {value.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Questions: {payload[0].payload.questionCount}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="averageScore" radius={[8, 8, 0, 0]}>
                    {traitScores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trait Breakdown</CardTitle>
            <CardDescription>Detailed scores by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {traitScores.map((trait, index) => (
                <div key={trait.trait} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-semibold capitalize">{trait.trait}</p>
                      <p className="text-sm text-muted-foreground">
                        {trait.questionCount} questions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{trait.averageScore.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">out of 7</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={signOut} variant="outline" size="lg">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
