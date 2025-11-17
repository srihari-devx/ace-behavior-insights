import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  direction: number;
  trait: string;
}

const likertOptions = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Slightly Disagree" },
  { value: 4, label: "Neutral" },
  { value: 5, label: "Slightly Agree" },
  { value: 6, label: "Agree" },
  { value: 7, label: "Strongly Agree" },
];

export default function Test() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkSubmissionStatus();
      fetchQuestions();
      loadSavedResponses();
    }
  }, [user]);

  const checkSubmissionStatus = async () => {
    const { data } = await supabase
      .from("test_submissions")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setHasSubmitted(true);
      navigate("/results");
    }
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load questions");
      return;
    }

    setQuestions(data || []);
    setLoading(false);
  };

  const loadSavedResponses = async () => {
    const { data } = await supabase
      .from("responses")
      .select("question_id, raw_score")
      .eq("user_id", user?.id);

    if (data) {
      const savedResponses: Record<string, number> = {};
      data.forEach((response) => {
        savedResponses[response.question_id] = response.raw_score;
      });
      setResponses(savedResponses);
    }
  };

  const calculateFinalScore = (rawScore: number, direction: number) => {
    return direction === -1 ? 8 - rawScore : rawScore;
  };

  const saveResponse = async (questionId: string, rawScore: number, direction: number) => {
    const finalScore = calculateFinalScore(rawScore, direction);

    const { error } = await supabase
      .from("responses")
      .upsert({
        user_id: user?.id,
        question_id: questionId,
        raw_score: rawScore,
        final_score: finalScore,
      });

    if (error) {
      toast.error("Failed to save response");
    } else {
      setResponses({ ...responses, [questionId]: rawScore });
    }
  };

  const handleNext = async () => {
    if (selectedAnswer === null) {
      toast.error("Please select an answer");
      return;
    }

    const currentQuestion = questions[currentIndex];
    await saveResponse(currentQuestion.id, selectedAnswer, currentQuestion.direction);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(responses[questions[currentIndex + 1].id] || null);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    // Calculate total score
    const { data: allResponses } = await supabase
      .from("responses")
      .select("final_score")
      .eq("user_id", user?.id);

    const totalScore = allResponses?.reduce((sum, r) => sum + r.final_score, 0) || 0;

    const { error } = await supabase
      .from("test_submissions")
      .insert({
        user_id: user?.id,
        total_score: totalScore,
      });

    if (error) {
      toast.error("Failed to submit test");
      setSubmitting(false);
    } else {
      toast.success("Test submitted successfully!");
      navigate("/results");
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    if (currentQuestion && responses[currentQuestion.id]) {
      setSelectedAnswer(responses[currentQuestion.id]);
    } else {
      setSelectedAnswer(null);
    }
  }, [currentIndex, currentQuestion]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>
              Please contact the administrator to add questions to the test.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Behavior Analysis Test</h1>
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedAnswer?.toString()}
              onValueChange={(value) => setSelectedAnswer(parseInt(value))}
            >
              <div className="space-y-3">
                {likertOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={option.value.toString()} id={`option-${option.value}`} />
                    <Label
                      htmlFor={`option-${option.value}`}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={selectedAnswer === null || submitting}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : currentIndex < questions.length - 1 ? (
                  "Next Question"
                ) : (
                  "Submit Test"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
