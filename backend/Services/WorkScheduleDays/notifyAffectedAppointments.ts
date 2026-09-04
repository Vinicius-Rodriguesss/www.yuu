/**
 * Depois de trocar a jornada de um profissional, os agendamentos futuros já
 * existentes podem não caber mais nos novos dias/horários (ex: profissional
 * encurtou o expediente). Avisa o cliente por email nesses casos.
 *
 * Fire and forget: nunca deve derrubar a resposta de quem trocou a jornada.
 */
import { eq, and, gte, notInArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { workSchedulesTable } from "../../db/schema/workSchedules.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { validateSlot } from "../Availability/computeDaySlots.js";
import { sendAppointmentScheduleChangedEmail } from "../Email/appointmentEmails.js";

export const notifyAffectedAppointments = async (workScheduleId: number) => {
  try {
    const [schedule] = await db
      .select({ userId: workSchedulesTable.userId })
      .from(workSchedulesTable)
      .where(eq(workSchedulesTable.id, workScheduleId))
      .limit(1);

    if (!schedule) return;

    const futureAppointments = await db
      .select({
        id: appointmentsTable.id,
        scheduledAt: appointmentsTable.scheduledAt,
        duration: appointmentsTable.duration,
        isHomeService: appointmentsTable.isHomeService,
        travelMinutes: appointmentsTable.travelMinutes,
      })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.userId, schedule.userId),
          gte(appointmentsTable.scheduledAt, new Date()),
          notInArray(appointmentsTable.status, ["cancelled", "no_show", "completed"])
        )
      );

    for (const appt of futureAppointments) {
      const extraMinutes = appt.isHomeService ? (appt.travelMinutes ?? 0) * 2 : 0;
      const fitsError = await validateSlot(
        schedule.userId,
        new Date(appt.scheduledAt),
        appt.duration,
        0,
        extraMinutes,
        appt.id
      );
      if (fitsError) {
        void sendAppointmentScheduleChangedEmail(appt.id);
      }
    }
  } catch (error) {
    console.warn(
      "Falha ao verificar agendamentos afetados pela troca de jornada:",
      error instanceof Error ? error.message : error
    );
  }
};
