export type InterviewProgressStage = "first_interview" | "second_interview" | "final_interview";

const progression: Record<InterviewProgressStage, number> = {
  first_interview: 1,
  second_interview: 2,
  final_interview: 3,
};

export function isInterviewProgressStage(stage: string | undefined): stage is InterviewProgressStage {
  return Boolean(stage && stage in progression);
}

export function shouldOfferInterviewStageSync(currentStage: string, target: InterviewProgressStage) {
  if (currentStage === target || ["offer", "rejected", "withdrawn"].includes(currentStage)) return false;
  const current = isInterviewProgressStage(currentStage) ? progression[currentStage] : 0;
  return current <= progression[target];
}
