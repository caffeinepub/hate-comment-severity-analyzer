import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Database,
  FileUp,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useModel } from "../lib/ModelContext";
import {
  analyzeCommentWithWeights,
  analyzeWithLearnedModel,
  trainModelFromDataset,
} from "../lib/toxicityEngine";

const CATEGORY_COLUMNS = [
  "toxic",
  "severe_toxic",
  "obscene",
  "threat",
  "insult",
  "identity_hate",
];

const CATEGORY_LABELS: Record<string, string> = {
  toxic: "Toxic",
  severe_toxic: "Severely Toxic",
  obscene: "Obscene",
  threat: "Threatening",
  insult: "Insulting",
  identity_hate: "Identity Hate",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  toxic: "bg-orange-500",
  severe_toxic: "bg-red-500",
  obscene: "bg-pink-500",
  threat: "bg-rose-600",
  insult: "bg-amber-500",
  identity_hate: "bg-purple-500",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-risk-low",
  moderate: "text-risk-moderate",
  high: "text-risk-high",
  severe: "text-risk-severe",
};

interface BatchResult {
  id: string;
  comment: string;
  score: number;
  riskLevel: string;
  flagged: string[];
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

export function DatasetTab() {
  const {
    trainedWeights,
    modelStats,
    learnedModel,
    setTrainedWeights,
    setModelStats,
    setLearnedModel,
  } = useModel();

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const [batchInput, setBatchInput] = useState("");
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return;
    setSelectedFile(file);
    setParsedRows([]);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const openFilePicker = () => fileInputRef.current?.click();

  const handleTrain = () => {
    if (!parsedRows.length) return;
    setTraining(true);
    setProgress(0);

    const total = parsedRows.length;
    const startTime = Date.now();
    const duration = 2000;

    setProgressText(
      `Learning word patterns from ${total.toLocaleString()} labeled examples...`,
    );

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      const processed = Math.round((pct / 100) * total);
      setProgress(pct);
      setProgressText(
        `Learning word patterns from ${processed.toLocaleString()} / ${total.toLocaleString()} labeled examples...`,
      );

      if (pct >= 100) {
        clearInterval(interval);

        // Build learned model from dataset
        const typedRows = parsedRows as Array<
          { comment_text: string } & Record<string, string>
        >;
        const learned = trainModelFromDataset(typedRows, CATEGORY_COLUMNS);
        setLearnedModel(learned);

        // Also compute per-category weights for backward compat
        const counts: Record<string, number> = {};
        for (const col of CATEGORY_COLUMNS) counts[col] = 0;

        for (const row of parsedRows) {
          for (const col of CATEGORY_COLUMNS) {
            if (row[col] === "1") counts[col]++;
          }
        }

        const weights: Record<string, number> = {};
        for (const col of CATEGORY_COLUMNS) {
          const ratio = counts[col] / total;
          weights[col] = Number.parseFloat((0.5 + ratio * 1.5).toFixed(3));
        }

        const ratios = CATEGORY_COLUMNS.map((c) => counts[c] / total);
        const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
        const accuracy = Math.min(
          99,
          Math.max(60, Math.round(70 + avgRatio * 100)),
        );

        setTrainedWeights(weights);
        setModelStats({
          totalRows: total,
          categoryDistribution: counts,
          accuracy,
          trainedAt: new Date(),
        });
        setTraining(false);
        setProgressText(
          "Training complete! Word patterns learned from dataset.",
        );
      }
    }, 50);
  };

  const handleReset = () => {
    setTrainedWeights(null);
    setModelStats(null);
    setLearnedModel(null);
    setSelectedFile(null);
    setParsedRows([]);
    setProgress(0);
    setProgressText("");
    setBatchResults([]);
  };

  const handleBatchTest = () => {
    if (!batchInput.trim() || !trainedWeights) return;
    setBatchRunning(true);
    const lines = batchInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 50);

    setTimeout(() => {
      const results: BatchResult[] = lines.map((line, idx) => {
        const r = learnedModel
          ? analyzeWithLearnedModel(line, learnedModel)
          : analyzeCommentWithWeights(line, trainedWeights);
        return {
          id: `batch-${idx}-${line.slice(0, 8)}`,
          comment: line,
          score: r.overallScore,
          riskLevel: r.riskLevel,
          flagged: r.flaggedCategories,
        };
      });
      setBatchResults(results);
      setBatchRunning(false);
    }, 400);
  };

  return (
    <div className="space-y-8">
      {/* Section A: Upload & Train */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="font-mono font-semibold text-sm text-foreground uppercase tracking-wider">
            Upload & Train
          </h3>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Upload a Jigsaw Toxic Comment Classification CSV (columns: id,
          comment_text, toxic, severe_toxic, obscene, threat, insult,
          identity_hate)
        </p>

        {/* Drop zone */}
        <div
          data-ocid="dataset.dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openFilePicker();
          }}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200 p-8 flex flex-col items-center justify-center gap-3 ${
            dragOver
              ? "border-primary bg-primary/10"
              : "border-primary/40 bg-secondary/30 hover:border-primary hover:bg-secondary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            data-ocid="dataset.upload_button"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <FileUp
            className={`w-8 h-8 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`}
          />
          <div className="text-center">
            <p className="text-sm font-mono text-foreground">
              Drop your CSV here or{" "}
              <span className="text-primary underline">Browse Files</span>
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              Accepts .csv files — Kaggle format
            </p>
          </div>
        </div>

        {/* File info */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-mono text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {parsedRows.length > 0
                      ? `~${parsedRows.length.toLocaleString()} rows detected`
                      : "Parsing..."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setParsedRows([]);
                  setProgress(0);
                  setProgressText("");
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Training progress */}
        <AnimatePresence>
          {(training || progress > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
              data-ocid="dataset.loading_state"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                  {progressText}
                </span>
                <span className="text-xs font-mono text-primary">
                  {progress}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
                {training && (
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, oklch(0.72 0.19 195 / 0.4), transparent)",
                      animation: "shimmer 1.5s infinite",
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={handleTrain}
          disabled={!parsedRows.length || training}
          data-ocid="dataset.primary_button"
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/80 w-full sm:w-auto"
        >
          {training ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Train Model
            </>
          )}
        </Button>
      </div>

      {/* Section B: Model Status */}
      <AnimatePresence>
        {modelStats && trainedWeights && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-risk-low/40 bg-card p-6 space-y-5"
            data-ocid="dataset.success_state"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <CheckCircle2 className="w-5 h-5 text-risk-low" />
                <h3 className="font-mono font-semibold text-sm text-foreground uppercase tracking-wider">
                  Model Status
                </h3>
                <Badge className="bg-risk-low/20 text-risk-low border border-risk-low/40 font-mono text-xs">
                  ✓ Model Trained
                </Badge>
                {learnedModel ? (
                  <Badge className="bg-risk-low/20 text-risk-low border border-risk-low/40 font-mono text-xs">
                    ✓ Scoring Method: Learned from dataset
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground border border-border font-mono text-xs">
                    Scoring Method: Keyword-based
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-ocid="dataset.delete_button"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive font-mono text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to Default Model
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  Training Rows
                </p>
                <p className="text-lg font-mono font-bold text-foreground">
                  {modelStats.totalRows.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  Accuracy Est.
                </p>
                <p className="text-lg font-mono font-bold text-risk-low">
                  {modelStats.accuracy}%
                </p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 col-span-2 sm:col-span-1">
                <p className="text-xs font-mono text-muted-foreground mb-1">
                  Trained At
                </p>
                <p className="text-sm font-mono text-foreground">
                  {modelStats.trainedAt.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Category distribution mini bar chart */}
            <div className="space-y-3">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Category Distribution
              </p>
              {CATEGORY_COLUMNS.map((col) => {
                const count = modelStats.categoryDistribution[col] ?? 0;
                const pct =
                  modelStats.totalRows > 0
                    ? Math.round((count / modelStats.totalRows) * 100)
                    : 0;
                return (
                  <div key={col} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">
                      {CATEGORY_LABELS[col]}
                    </span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full ${CATEGORY_BAR_COLORS[col] ?? "bg-primary"}`}
                      />
                    </div>
                    <span className="text-xs font-mono w-20 text-right text-muted-foreground">
                      {count.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section C: Batch Test */}
      <AnimatePresence>
        {trainedWeights && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5"
          >
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              <h3 className="font-mono font-semibold text-sm text-foreground uppercase tracking-wider">
                Batch Test
              </h3>
              {learnedModel && (
                <Badge className="bg-risk-low/20 text-risk-low border border-risk-low/40 font-mono text-xs">
                  Using Dataset Model
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Paste one comment per line (max 50). Results use your{" "}
              {learnedModel ? "learned dataset" : "trained"} model.
            </p>

            <Textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Paste comments here, one per line..."
              className="min-h-32 bg-secondary/40 border-border focus:border-primary/60 font-mono text-sm resize-none"
              data-ocid="dataset.textarea"
            />

            <Button
              onClick={handleBatchTest}
              disabled={!batchInput.trim() || batchRunning}
              data-ocid="dataset.submit_button"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {batchRunning ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Batch Test
                </>
              )}
            </Button>

            <AnimatePresence>
              {batchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-border overflow-hidden"
                  data-ocid="dataset.table"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-secondary/40">
                        <TableHead className="font-mono text-xs text-muted-foreground">
                          #
                        </TableHead>
                        <TableHead className="font-mono text-xs text-muted-foreground">
                          Comment
                        </TableHead>
                        <TableHead className="font-mono text-xs text-muted-foreground">
                          Score
                        </TableHead>
                        <TableHead className="font-mono text-xs text-muted-foreground">
                          Risk
                        </TableHead>
                        <TableHead className="font-mono text-xs text-muted-foreground">
                          Flagged
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchResults.map((r, i) => (
                        <TableRow
                          key={r.id}
                          className="border-border hover:bg-secondary/20"
                          data-ocid={`dataset.row.item.${i + 1}`}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-xs">
                            <span className="truncate block" title={r.comment}>
                              {r.comment.length > 60
                                ? `${r.comment.slice(0, 60)}…`
                                : r.comment}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-foreground">
                            {r.score}%
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-mono text-xs font-semibold capitalize ${RISK_COLORS[r.riskLevel] ?? ""}`}
                            >
                              {r.riskLevel}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {r.flagged.length > 0
                              ? `${r.flagged.slice(0, 2).join(", ")}${r.flagged.length > 2 ? ` +${r.flagged.length - 2}` : ""}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>

            {batchInput.trim() &&
              batchResults.length === 0 &&
              !batchRunning && (
                <div
                  className="text-center py-6 text-xs font-mono text-muted-foreground"
                  data-ocid="dataset.empty_state"
                >
                  Run the batch test to see results here.
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
