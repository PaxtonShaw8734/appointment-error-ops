import assert from "node:assert/strict";
import { appointmentSchema, sendPatientNotification } from "../src/appointment_service.js";

const valid = { appointmentId: "appt-1", patientId: "patient-1", channel: "email", message: "Your appointment is tomorrow." };
assert.deepEqual(appointmentSchema.parse(valid), valid);
const result = await sendPatientNotification(valid);
assert.deepEqual(result, { accepted: true, appointmentId: "appt-1" });
assert.throws(() => appointmentSchema.parse({ ...valid, channel: "carrier-pigeon" }));
console.log("appointment decision test passed");
