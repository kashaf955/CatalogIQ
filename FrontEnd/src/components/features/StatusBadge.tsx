import { Badge } from "../ui/badge";
import type { MatchStatus, ReviewStatus } from "../../api/types";

const MATCH_STATUS_VARIANT: Record<MatchStatus, "success" | "warning" | "destructive" | "secondary"> = {
  matched: "success",
  discontinued: "warning",
  replacement_available: "warning",
  no_match: "destructive",
  needs_review: "secondary",
};

const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  matched: "Matched",
  discontinued: "Discontinued",
  replacement_available: "Replacement available",
  no_match: "No match",
  needs_review: "Needs review",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <Badge variant={MATCH_STATUS_VARIANT[status]}>{MATCH_STATUS_LABEL[status]}</Badge>;
}

const REVIEW_STATUS_VARIANT: Record<ReviewStatus, "success" | "destructive" | "secondary" | "outline"> = {
  pending: "outline",
  approved: "success",
  rejected: "destructive",
  variant: "secondary",
  needs_info: "secondary",
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={REVIEW_STATUS_VARIANT[status]}>{status.replace("_", " ")}</Badge>;
}
