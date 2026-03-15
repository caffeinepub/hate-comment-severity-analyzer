import Array "mo:core/Array";
import List "mo:core/List";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";

actor {
  type RiskLevel = {
    #low;
    #moderate;
    #high;
    #severe;
  };

  type ReportStatus = {
    #submitted;
    #underReview;
    #resolved;
  };

  type HateCommentReport = {
    commentText : Text;
    severityScore : Nat;
    riskLevel : RiskLevel;
    flaggedCategories : [Text];
    reporterName : Text;
    reporterEmail : Text;
    timestamp : Time.Time;
    status : ReportStatus;
  };

  let reports = List.empty<HateCommentReport>();

  public shared ({ caller }) func createReport(
    commentText : Text,
    severityScore : Nat,
    riskLevel : RiskLevel,
    flaggedCategories : [Text],
    reporterName : Text,
    reporterEmail : Text,
  ) : async () {
    if (severityScore > 100) {
      Runtime.trap("Severity score must be between 0 and 100");
    };

    let report : HateCommentReport = {
      commentText;
      severityScore;
      riskLevel;
      flaggedCategories;
      reporterName;
      reporterEmail;
      timestamp = Time.now();
      status = #submitted;
    };

    reports.add(report);
  };

  public query ({ caller }) func getReports() : async [HateCommentReport] {
    reports.toArray();
  };
};
