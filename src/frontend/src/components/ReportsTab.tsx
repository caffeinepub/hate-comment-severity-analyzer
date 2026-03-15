import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, FileWarning } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import type { HateCommentReport } from "../backend.d";
import { useGetReports } from "../hooks/useQueries";

const RISK_BADGE: Record<string, string> = {
  low: "text-risk-low border-risk-low bg-risk-low/10",
  moderate: "text-risk-moderate border-risk-moderate bg-risk-moderate/10",
  high: "text-risk-high border-risk-high bg-risk-high/10",
  severe: "text-risk-severe border-risk-severe bg-risk-severe/10",
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> =
  {
    submitted: {
      color: "text-primary border-primary/40 bg-primary/10",
      icon: <Clock className="w-3 h-3" />,
    },
    underReview: {
      color: "text-risk-moderate border-risk-moderate/40 bg-risk-moderate/10",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    resolved: {
      color: "text-risk-low border-risk-low/40 bg-risk-low/10",
      icon: <CheckCircle className="w-3 h-3" />,
    },
  };

const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d"];

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function getRiskTextColor(riskKey: string): string {
  if (riskKey === "severe") return "text-risk-severe";
  if (riskKey === "high") return "text-risk-high";
  if (riskKey === "moderate") return "text-risk-moderate";
  return "text-risk-low";
}

export function ReportsTab() {
  const { data: reports, isLoading, refetch } = useGetReports();

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="reports.loading_state">
        {SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-12 w-full bg-secondary/50" />
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
        data-ocid="reports.empty_state"
      >
        <FileWarning className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
        <p className="font-display text-lg text-muted-foreground">
          No Reports Filed
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1 font-mono">
          Submitted reports will appear here
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="rounded-xl border border-border overflow-hidden"
        data-ocid="reports.table"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-secondary/30 hover:bg-secondary/30">
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider w-32">
                Date / Time
              </TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Comment
              </TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider w-24">
                Score
              </TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider w-28">
                Risk Level
              </TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Categories
              </TableHead>
              <TableHead className="text-xs font-mono text-muted-foreground uppercase tracking-wider w-28">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report: HateCommentReport) => {
              const riskKey =
                typeof report.riskLevel === "string"
                  ? report.riskLevel
                  : String(report.riskLevel);
              const statusKey =
                typeof report.status === "string"
                  ? report.status
                  : String(report.status);
              const statusCfg =
                STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.submitted;
              const rowKey = `${String(report.timestamp)}-${report.reporterEmail}`;
              return (
                <TableRow
                  key={rowKey}
                  className="border-border hover:bg-secondary/20 transition-colors"
                  data-ocid="reports.row"
                >
                  <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {formatDate(report.timestamp)}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs">
                    <p className="truncate text-foreground/80 font-mono text-xs">
                      {report.commentText}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono font-bold text-sm ${getRiskTextColor(riskKey)}`}
                    >
                      {Number(report.severityScore)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${RISK_BADGE[riskKey] ?? ""}`}
                    >
                      {riskKey.charAt(0).toUpperCase() + riskKey.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {report.flaggedCategories
                        .slice(0, 3)
                        .map((cat: string) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="text-xs border-border text-muted-foreground px-1.5 py-0"
                          >
                            {cat}
                          </Badge>
                        ))}
                      {report.flaggedCategories.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-border text-muted-foreground px-1.5 py-0"
                        >
                          +{report.flaggedCategories.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs flex items-center gap-1 w-fit ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusKey === "underReview"
                        ? "Under Review"
                        : statusKey.charAt(0).toUpperCase() +
                          statusKey.slice(1)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
