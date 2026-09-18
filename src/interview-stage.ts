export type InterviewProgressStage = "first_interview" | "second_interview" | "final_interview";

export type ProgressionStage =
  | "saved"
  | "briefing"
  | "es_draft"
  | "es_submitted"
  | "web_test"
  | InterviewProgressStage;

export type StageProgressionKind = "forward" | "same" | "backward" | "informational" | "terminal";

export type StageProgressionCheck = {
  kind: StageProgressionKind;
  currentStage?: string;
  eventStage?: ProgressionStage;
};

const progression: Record<InterviewProgressStage, number> = {
  first_interview: 1,
  second_interview: 2,
  final_interview: 3,
};

const stageOrder: Record<ProgressionStage, number> = {
  saved: 0,
  briefing: 1,
  es_draft: 2,
  es_submitted: 3,
  web_test: 4,
  first_interview: 5,
  second_interview: 6,
  final_interview: 7,
};

const terminalStages = new Set(["offer", "rejected", "withdrawn"]);

export function isInterviewProgressStage(stage: string | undefined): stage is InterviewProgressStage {
  return Boolean(stage && stage in progression);
}

export function shouldOfferInterviewStageSync(currentStage: string, target: InterviewProgressStage) {
  if (currentStage === target || ["offer", "rejected", "withdrawn"].includes(currentStage)) return false;
  const current = isInterviewProgressStage(currentStage) ? progression[currentStage] : 0;
  return current <= progression[target];
}

export function progressionStageForEvent(type: string | undefined, interviewStage?: string): ProgressionStage | undefined {
  if (type === "briefing") return "briefing";
  if (type === "es") return "es_submitted";
  if (type === "web_test") return "web_test";
  if (type === "interview" && isInterviewProgressStage(interviewStage)) return interviewStage;
  // A resume deadline does not prove that the company moved to a new stage.
  return undefined;
}

export function compareCompanyStageToEvent(
  currentStage: string | undefined,
  type: string | undefined,
  interviewStage?: string,
): StageProgressionCheck {
  const eventStage = progressionStageForEvent(type, interviewStage);
  if (!eventStage) return { kind: "informational", currentStage, eventStage };
  if (currentStage && terminalStages.has(currentStage)) return { kind: "terminal", currentStage, eventStage };
  if (!currentStage || !(currentStage in stageOrder)) return { kind: "forward", currentStage, eventStage };

  const currentRank = stageOrder[currentStage as ProgressionStage];
  const eventRank = stageOrder[eventStage];
  return {
    kind: eventRank > currentRank ? "forward" : eventRank === currentRank ? "same" : "backward",
    currentStage,
    eventStage,
  };
}
