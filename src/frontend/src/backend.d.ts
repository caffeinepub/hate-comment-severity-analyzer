import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface HateCommentReport {
    status: ReportStatus;
    severityScore: bigint;
    reporterName: string;
    flaggedCategories: Array<string>;
    reporterEmail: string;
    timestamp: Time;
    commentText: string;
    riskLevel: RiskLevel;
}
export enum ReportStatus {
    resolved = "resolved",
    submitted = "submitted",
    underReview = "underReview"
}
export enum RiskLevel {
    low = "low",
    high = "high",
    severe = "severe",
    moderate = "moderate"
}
export interface backendInterface {
    createReport(commentText: string, severityScore: bigint, riskLevel: RiskLevel, flaggedCategories: Array<string>, reporterName: string, reporterEmail: string): Promise<void>;
    getReports(): Promise<Array<HateCommentReport>>;
}
