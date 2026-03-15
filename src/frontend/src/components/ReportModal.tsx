import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RiskLevel } from "../backend";
import { useCreateReport } from "../hooks/useQueries";
import type { ToxicityResult } from "../lib/toxicityEngine";

const RISK_ENUM: Record<string, RiskLevel> = {
  low: RiskLevel.low,
  moderate: RiskLevel.moderate,
  high: RiskLevel.high,
  severe: RiskLevel.severe,
};

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  comment: string;
  result: ToxicityResult;
}

export function ReportModal({
  open,
  onClose,
  comment,
  result,
}: ReportModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync, isPending } = useCreateReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      await mutateAsync({
        commentText: comment,
        severityScore: result.overallScore,
        riskLevel: RISK_ENUM[result.riskLevel],
        flaggedCategories: result.flaggedCategories,
        reporterName: name,
        reporterEmail: email,
      });
      setSubmitted(true);
      toast.success("Report submitted to Cyber Crime Office");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    }
  };

  const handleClose = () => {
    if (!isPending) {
      setSubmitted(false);
      setName("");
      setEmail("");
      onClose();
    }
  };

  const riskColors: Record<string, string> = {
    low: "text-risk-low",
    moderate: "text-risk-moderate",
    high: "text-risk-high",
    severe: "text-risk-severe",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg border-border bg-card"
        data-ocid="report.modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Report to Cyber Crime Office
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            This report will be filed with the National Cyber Crime Reporting
            Portal.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div
            className="py-8 flex flex-col items-center gap-3 text-center"
            data-ocid="report.success_state"
          >
            <CheckCircle2 className="w-12 h-12 text-risk-low" />
            <p className="font-display text-lg text-foreground">
              Report Filed Successfully
            </p>
            <p className="text-sm text-muted-foreground">
              Reference ID:{" "}
              <span className="font-mono text-primary">
                CCO-{Date.now().toString(36).toUpperCase()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The Cyber Crime Office will review your submission within 24–48
              hours.
            </p>
            <Button
              onClick={handleClose}
              className="mt-4"
              data-ocid="report.close_button"
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Comment preview */}
            <div className="rounded-md bg-secondary/50 p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-mono">
                Comment Under Review
              </p>
              <p className="text-sm text-foreground line-clamp-2">{comment}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  Severity Score:
                </span>
                <span
                  className={`text-sm font-mono font-bold ${riskColors[result.riskLevel]}`}
                >
                  {result.overallScore}/100
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs ${riskColors[result.riskLevel]} border-current`}
                >
                  {result.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="reporter-name"
                  className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block"
                >
                  Your Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reporter-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  data-ocid="report.name.input"
                  className="bg-secondary/50 border-border focus:border-primary"
                />
              </div>
              <div>
                <Label
                  htmlFor="reporter-email"
                  className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block"
                >
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reporter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  data-ocid="report.email.input"
                  className="bg-secondary/50 border-border focus:border-primary"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                data-ocid="report.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !name.trim() || !email.trim()}
                data-ocid="report.submit_button"
                className="bg-destructive/90 hover:bg-destructive text-destructive-foreground"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
