import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RiskLevel } from "../backend";
import type { HateCommentReport } from "../backend.d";
import { useActor } from "./useActor";

export function useGetReports() {
  const { actor, isFetching } = useActor();
  return useQuery<HateCommentReport[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      commentText: string;
      severityScore: number;
      riskLevel: RiskLevel;
      flaggedCategories: string[];
      reporterName: string;
      reporterEmail: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await actor.createReport(
        params.commentText,
        BigInt(params.severityScore),
        params.riskLevel,
        params.flaggedCategories,
        params.reporterName,
        params.reporterEmail,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
