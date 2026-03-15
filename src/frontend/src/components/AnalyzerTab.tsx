import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  Search,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { useModel } from "../lib/ModelContext";
import {
  type ToxicityResult,
  analyzeComment,
  analyzeCommentWithWeights,
  analyzeWithLearnedModel,
} from "../lib/toxicityEngine";
import { SeverityGauge } from "./SeverityGauge";

const RISK_COLORS: Record<string, string> = {
  low: "text-risk-low border-risk-low bg-risk-low/10",
  moderate: "text-risk-moderate border-risk-moderate bg-risk-moderate/10",
  high: "text-risk-high border-risk-high bg-risk-high/10",
  severe: "text-risk-severe border-risk-severe bg-risk-severe/10",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  toxic: "bg-orange-500",
  severe_toxic: "bg-red-500",
  obscene: "bg-pink-500",
  threat: "bg-rose-600",
  insult: "bg-amber-500",
  identity_hate: "bg-purple-500",
};

const SAMPLE_COMMENTS = [
  {
    id: "s1",
    label: "Sample 1",
    text: "You are such an idiot, I hope you suffer for what you did to our community!",
  },
  {
    id: "s2",
    label: "Sample 2",
    text: "I know where you live and you'll pay for this, watch out!",
  },
  {
    id: "s3",
    label: "Sample 3",
    text: "People like you are worthless parasites who should go die in a ditch.",
  },
  {
    id: "s4",
    label: "Sample 4",
    text: "This is a completely normal and respectful message about current events.",
  },
];

type OcrStatus = "idle" | "loading" | "success" | "error";

/** Load Tesseract.js from CDN and return the createWorker fn */
async function loadTesseract(): Promise<
  (lang: string) => Promise<{
    recognize(img: File): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }>
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Tesseract) return (window as any).Tesseract.createWorker;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Tesseract.js"));
    document.head.appendChild(s);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Tesseract.createWorker;
}

export function AnalyzerTab() {
  const { trainedWeights, learnedModel } = useModel();
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<ToxicityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeKey, setAnalyzeKey] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs so the OCR handler can read current model state without stale closures
  const learnedModelRef = useRef(learnedModel);
  learnedModelRef.current = learnedModel;
  const trainedWeightsRef = useRef(trainedWeights);
  trainedWeightsRef.current = trainedWeights;

  const runAnalysis = (text: string) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    setTimeout(() => {
      let r: ToxicityResult;
      if (learnedModelRef.current) {
        r = analyzeWithLearnedModel(text, learnedModelRef.current);
      } else if (trainedWeightsRef.current) {
        r = analyzeCommentWithWeights(text, trainedWeightsRef.current);
      } else {
        r = analyzeComment(text);
      }
      setResult(r);
      setAnalyzeKey((k) => k + 1);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleAnalyze = () => runAnalysis(comment);

  const loadSample = (text: string) => {
    setComment(text);
    setResult(null);
    setOcrStatus("idle");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrStatus("loading");
    setOcrProgress(0);
    setOcrError("");
    setResult(null);

    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const createWorker = await loadTesseract();
      const worker = await createWorker("eng");

      // Simulate progress since CDN Tesseract doesn't expose logger the same way
      let prog = 0;
      const ticker = setInterval(() => {
        prog = Math.min(prog + 10, 90);
        setOcrProgress(prog);
      }, 300);

      const { data } = await worker.recognize(file);
      clearInterval(ticker);
      setOcrProgress(100);
      await worker.terminate();

      const extracted = data.text.trim();
      if (!extracted) {
        setOcrStatus("error");
        setOcrError("No text found in image. Try a clearer screenshot.");
        return;
      }

      setComment(extracted);
      setOcrStatus("success");

      // Auto-analyze with extracted text directly (don't wait for state update)
      runAnalysis(extracted);
    } catch (err) {
      console.error("OCR error:", err);
      setOcrStatus("error");
      setOcrError("Failed to extract text. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Sample comments */}
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
          Quick Samples
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COMMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s.text)}
              className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors font-mono truncate max-w-xs"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Paste or type a comment to analyze, or upload an image to extract text..."
          className="min-h-32 bg-secondary/40 border-border focus:border-primary/60 font-mono text-sm resize-none"
          data-ocid="analyzer.textarea"
        />

        {/* OCR status feedback */}
        <AnimatePresence>
          {ocrStatus === "loading" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              data-ocid="analyzer.ocr.loading_state"
              className="rounded-md border border-border bg-secondary/30 px-3 py-2 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-muted-foreground">
                  Extracting text from image... {ocrProgress}%
                </span>
              </div>
              <Progress value={ocrProgress} className="h-1" />
            </motion.div>
          )}

          {ocrStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              data-ocid="analyzer.ocr.success_state"
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-3.5 h-3.5 text-risk-low" />
              <span className="text-xs font-mono text-risk-low">
                Text extracted — analysis running automatically
              </span>
            </motion.div>
          )}

          {ocrStatus === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              data-ocid="analyzer.ocr.error_state"
              className="flex items-center gap-2"
            >
              <XCircle className="w-3.5 h-3.5 text-risk-severe" />
              <span className="text-xs font-mono text-risk-severe">
                {ocrError}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {comment.length} characters
            </span>
            {learnedModel ? (
              <Badge className="bg-risk-low/20 text-risk-low border border-risk-low/40 font-mono text-xs">
                ✓ Dataset Model Active
              </Badge>
            ) : trainedWeights ? (
              <Badge className="bg-risk-low/20 text-risk-low border border-risk-low/40 font-mono text-xs">
                ✓ Trained Model Active
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              aria-label="Upload image for OCR"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ocrStatus === "loading"}
              onClick={() => fileInputRef.current?.click()}
              data-ocid="analyzer.upload_button"
              className="gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border-border hover:border-primary/50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Upload Image
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={!comment.trim() || isAnalyzing}
              data-ocid="analyzer.primary_button"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {isAnalyzing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze Comment
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={analyzeKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            data-ocid="analyzer.result.card"
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div
                className={`h-1 w-full ${
                  result.riskLevel === "severe"
                    ? "bg-risk-severe"
                    : result.riskLevel === "high"
                      ? "bg-risk-high"
                      : result.riskLevel === "moderate"
                        ? "bg-risk-moderate"
                        : "bg-risk-low"
                }`}
              />

              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                  <SeverityGauge
                    score={result.overallScore}
                    riskLevel={result.riskLevel}
                  />

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        Risk Assessment
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-base px-4 py-1.5 font-display font-semibold ${RISK_COLORS[result.riskLevel]}`}
                    >
                      {result.riskLevel === "severe" && "⚠ "}
                      {result.riskLevel.charAt(0).toUpperCase() +
                        result.riskLevel.slice(1)}{" "}
                      Risk
                    </Badge>

                    <div className="mt-4 space-y-1">
                      {result.riskLevel === "severe" && (
                        <p className="text-sm text-risk-severe font-mono">
                          CRITICAL: Immediate action recommended
                        </p>
                      )}
                      {result.riskLevel === "high" && (
                        <p className="text-sm text-risk-high font-mono">
                          WARNING: Significant toxicity detected
                        </p>
                      )}
                      {result.riskLevel === "moderate" && (
                        <p className="text-sm text-risk-moderate font-mono">
                          CAUTION: Moderate harmful content found
                        </p>
                      )}
                      {result.riskLevel === "low" && (
                        <p className="text-sm text-risk-low font-mono">
                          STATUS: Low toxicity detected
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {result.flaggedCategories.length > 0
                          ? `Flagged: ${result.flaggedCategories.join(", ")}`
                          : "No harmful categories detected"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="space-y-3">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Category Breakdown
                  </p>
                  {result.categories.map((cat, i) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">
                        {cat.label}
                      </span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.score}%` }}
                          transition={{
                            delay: i * 0.08 + 0.2,
                            duration: 0.6,
                            ease: "easeOut",
                          }}
                          className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat.name] ?? "bg-primary"}`}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono w-10 text-right ${
                          cat.score > 0
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {cat.score}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
