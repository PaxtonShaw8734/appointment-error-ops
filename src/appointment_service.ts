import { z } from "zod";
import { errors, queue } from "./infrai_client.js";

export const appointmentSchema = z.object({
  appointmentId: z.string().min(1), patientId: z.string().min(1), channel: z.enum(["sms", "email"]), message: z.string().min(1)
});
export type AppointmentRequest = z.infer<typeof appointmentSchema>;

export async function sendPatientNotification(input: unknown): Promise<{ accepted: true; appointmentId: string }> {
  const request = appointmentSchema.parse(input);
  try {
    await deliver(request);
    return { accepted: true, appointmentId: request.appointmentId };
  } catch (error) {
    await errors.capture({
      title: "appointment notification failed", message: String(error), level: "error",
      fingerprint: ["appointment-notification", request.channel],
      exception: error instanceof Error ? error.stack : String(error),
      context: { appointmentId: request.appointmentId, patientId: request.patientId, channel: request.channel }
    });
    throw error;
  }
}

async function deliver(request: AppointmentRequest): Promise<void> {
  if (request.message.includes("[delivery-failure]")) throw new Error("notification provider rejected message");
}

export async function pollNotificationWorker() {
  return queue.consume({ queue: "appointment-notifications", max_messages: 10, visibility_timeout: 30 });
}

if (process.argv[1]?.endsWith("appointment_service.ts")) {
  sendPatientNotification({ appointmentId: "appt-104", patientId: "patient-22", channel: "sms", message: "Your visit is confirmed for 10:30." })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
