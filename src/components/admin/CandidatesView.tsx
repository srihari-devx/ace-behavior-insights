import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Candidate {
  id: string;
  name: string;
  regno: string;
  total_score: number;
  submitted_at: string;
}

interface TraitScore {
  trait: string;
  averageScore: number;
}

export default function CandidatesView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [traitScores, setTraitScores] = useState<TraitScore[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data: submissions } = await supabase
      .from("test_submissions")
      .select(`
        *,
        profiles (name, regno)
      `)
      .order("submitted_at", { ascending: false });

    if (submissions) {
      const candidatesData = submissions.map((sub: any) => ({
        id: sub.user_id,
        name: sub.profiles?.name || "Unknown",
        regno: sub.profiles?.regno || "N/A",
        total_score: sub.total_score,
        submitted_at: sub.submitted_at,
      }));
      setCandidates(candidatesData);
    }
    setLoading(false);
  };

  const fetchCandidateDetails = async (userId: string) => {
    // Fetch responses with questions
    const { data: responsesData } = await supabase
      .from("responses")
      .select(`
        *,
        questions (question_text, trait, direction)
      `)
      .eq("user_id", userId);

    if (responsesData) {
      setResponses(responsesData);

      // Calculate trait scores
      const traitMap: Record<string, { total: number; count: number }> = {};

      responsesData.forEach((response: any) => {
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
      }));

      setTraitScores(traits.sort((a, b) => b.averageScore - a.averageScore));
    }
  };

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    fetchCandidateDetails(candidate.id);
  };

  const exportToCSV = () => {
    const headers = ["Name", "Register Number", "Total Score", "Submission Date"];
    const rows = candidates.map((c) => [
      c.name,
      c.regno,
      c.total_score,
      new Date(c.submitted_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Export successful!");
  };

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Candidates</CardTitle>
              <CardDescription>View all candidate submissions and results</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Register Number</TableHead>
                  <TableHead>Total Score</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">{candidate.name}</TableCell>
                      <TableCell>{candidate.regno}</TableCell>
                      <TableCell>
                        <span className="text-xl font-bold text-primary">
                          {candidate.total_score}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(candidate.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewCandidate(candidate)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {selectedCandidate?.name} - Results
                              </DialogTitle>
                              <DialogDescription>
                                Register Number: {selectedCandidate?.regno}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Total Score</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-4xl font-bold text-primary">
                                    {selectedCandidate?.total_score}
                                  </p>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Trait Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={traitScores}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="trait" />
                                        <YAxis domain={[0, 7]} />
                                        <Tooltip />
                                        <Bar dataKey="averageScore" radius={[8, 8, 0, 0]}>
                                          {traitScores.map((entry, index) => (
                                            <Cell
                                              key={`cell-${index}`}
                                              fill={COLORS[index % COLORS.length]}
                                            />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">All Responses</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {responses.map((response: any, index: number) => (
                                      <div
                                        key={response.id}
                                        className="p-3 border rounded-lg text-sm"
                                      >
                                        <p className="font-medium">
                                          Q{index + 1}: {response.questions.question_text}
                                        </p>
                                        <div className="flex gap-4 mt-1 text-muted-foreground">
                                          <span>Trait: {response.questions.trait}</span>
                                          <span>Raw: {response.raw_score}</span>
                                          <span>Final: {response.final_score}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
