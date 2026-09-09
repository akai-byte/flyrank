export async function notifySubmission(submission) {
  if (process.env.SIDE_EFFECT_MODE === "fail") {
    throw new Error("Simulated notification failure");
  }
  console.log("[SIDE_EFFECT] submission notification", {
    submission_id: submission.id,
    widget_id: submission.widget_id
  });
}
