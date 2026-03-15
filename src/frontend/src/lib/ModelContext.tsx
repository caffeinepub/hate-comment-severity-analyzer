import { createContext, useContext, useState } from "react";
import type { LearnedModel } from "./toxicityEngine";

export interface ModelStats {
  totalRows: number;
  categoryDistribution: Record<string, number>;
  accuracy: number;
  trainedAt: Date;
}

export interface ModelState {
  trainedWeights: Record<string, number> | null;
  modelStats: ModelStats | null;
  learnedModel: LearnedModel | null;
  setTrainedWeights: (w: Record<string, number> | null) => void;
  setModelStats: (s: ModelStats | null) => void;
  setLearnedModel: (m: LearnedModel | null) => void;
}

const ModelContext = createContext<ModelState | null>(null);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [trainedWeights, setTrainedWeights] = useState<Record<
    string,
    number
  > | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [learnedModel, setLearnedModel] = useState<LearnedModel | null>(null);

  return (
    <ModelContext.Provider
      value={{
        trainedWeights,
        modelStats,
        learnedModel,
        setTrainedWeights,
        setModelStats,
        setLearnedModel,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModel(): ModelState {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
}
