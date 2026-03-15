import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Activity, Database, FileText, Shield } from "lucide-react";
import { motion } from "motion/react";
import { AnalyzerTab } from "./components/AnalyzerTab";
import { DatasetTab } from "./components/DatasetTab";
import { ReportsTab } from "./components/ReportsTab";
import { ModelProvider } from "./lib/ModelContext";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <div className="min-h-screen bg-background grid-overlay relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% -10%, oklch(0.25 0.08 250 / 0.4), transparent), radial-gradient(ellipse 40% 60% at 80% 80%, oklch(0.20 0.06 200 / 0.25), transparent)",
        }}
      />

      {/* Scan line effect */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-10 h-32 scan-line"
        style={{
          background:
            "linear-gradient(transparent, rgba(0, 220, 230, 0.03), transparent)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md" />
                  <div className="relative w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h1 className="font-display font-bold text-lg leading-none text-foreground">
                    HateGuard
                  </h1>
                  <p className="text-xs font-mono text-muted-foreground leading-none mt-0.5">
                    Cyber Crime Reporting System
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-risk-low">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-low animate-pulse" />
                  System Online
                </div>
              </div>
            </motion.div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                Toxicity Detection Engine v2.4
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground leading-tight">
              Hate Comment{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.19 195), oklch(0.62 0.22 25))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Severity Analyzer
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Analyze comments using our multi-category toxicity detection
              engine. Scores are calculated across 6 risk dimensions and can be
              reported directly to the Cyber Crime Office.
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="analyzer">
              <TabsList className="bg-secondary/50 border border-border mb-6 p-1">
                <TabsTrigger
                  value="analyzer"
                  data-ocid="analyzer.tab"
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-sm"
                >
                  <Activity className="w-4 h-4" />
                  Analyzer
                </TabsTrigger>
                <TabsTrigger
                  value="dataset"
                  data-ocid="dataset.tab"
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-sm"
                >
                  <Database className="w-4 h-4" />
                  Dataset
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  data-ocid="reports.tab"
                  className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground font-mono text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Reports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyzer">
                <AnalyzerTab />
              </TabsContent>
              <TabsContent value="dataset">
                <DatasetTab />
              </TabsContent>
              <TabsContent value="reports">
                <ReportsTab />
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs font-mono text-muted-foreground">
              &copy; {new Date().getFullYear()} HateGuard — Cyber Crime
              Reporting System
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              Built with ❤ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModelProvider>
        <AppContent />
      </ModelProvider>
      <Toaster theme="dark" />
    </QueryClientProvider>
  );
}
