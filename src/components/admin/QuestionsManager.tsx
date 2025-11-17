import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Upload } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  direction: number;
  trait: string;
}

export default function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [questionText, setQuestionText] = useState("");
  const [direction, setDirection] = useState<"1" | "-1">("1");
  const [trait, setTrait] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load questions");
    } else {
      setQuestions(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionText.trim() || !trait.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (editingQuestion) {
      const { error } = await supabase
        .from("questions")
        .update({
          question_text: questionText.trim(),
          direction: parseInt(direction),
          trait: trait.trim().toLowerCase(),
        })
        .eq("id", editingQuestion.id);

      if (error) {
        toast.error("Failed to update question");
      } else {
        toast.success("Question updated successfully");
        resetForm();
        fetchQuestions();
      }
    } else {
      const { error } = await supabase
        .from("questions")
        .insert({
          question_text: questionText.trim(),
          direction: parseInt(direction),
          trait: trait.trim().toLowerCase(),
        });

      if (error) {
        toast.error("Failed to create question");
      } else {
        toast.success("Question created successfully");
        resetForm();
        fetchQuestions();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete question");
    } else {
      toast.success("Question deleted successfully");
      fetchQuestions();
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setDirection(question.direction.toString() as "1" | "-1");
    setTrait(question.trait);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setQuestionText("");
    setDirection("1");
    setTrait("");
    setEditingQuestion(null);
    setIsDialogOpen(false);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim());

    const questionsToInsert: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(",").map(v => v.trim());
      const question: any = {};

      headers.forEach((header, index) => {
        if (header === "question_text") question.question_text = values[index];
        if (header === "direction") question.direction = parseInt(values[index]);
        if (header === "trait") question.trait = values[index].toLowerCase();
      });

      if (question.question_text && question.direction && question.trait) {
        questionsToInsert.push(question);
      }
    }

    if (questionsToInsert.length === 0) {
      toast.error("No valid questions found in CSV");
      return;
    }

    const { error } = await supabase
      .from("questions")
      .insert(questionsToInsert);

    if (error) {
      toast.error("Failed to upload questions");
    } else {
      toast.success(`${questionsToInsert.length} questions uploaded successfully`);
      fetchQuestions();
    }

    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Questions</CardTitle>
          <CardDescription>Add, edit, or delete test questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? "Edit Question" : "Add New Question"}
                  </DialogTitle>
                  <DialogDescription>
                    Fill in the details below to {editingQuestion ? "update" : "create"} a question
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="questionText">Question Text</Label>
                    <Textarea
                      id="questionText"
                      placeholder="Enter the question..."
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="direction">Direction</Label>
                      <Select value={direction} onValueChange={(value: "1" | "-1") => setDirection(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Positive (+1)</SelectItem>
                          <SelectItem value="-1">Negative (-1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trait">Trait</Label>
                      <Input
                        id="trait"
                        placeholder="e.g., leadership, teamwork"
                        value={trait}
                        onChange={(e) => setTrait(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingQuestion ? "Update Question" : "Add Question"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </span>
                </Button>
              </Label>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Direction</TableHead>
                  <TableHead className="w-32">Trait</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No questions yet. Add your first question above.
                    </TableCell>
                  </TableRow>
                ) : (
                  questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">{question.question_text}</TableCell>
                      <TableCell>
                        <span className={question.direction === 1 ? "text-success" : "text-destructive"}>
                          {question.direction === 1 ? "+1" : "-1"}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{question.trait}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(question.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
