/**
 * Motor de disponibilidade da agenda.
 *
 * Única fonte de verdade para calcular os horários de um dia, usada por:
 * - GET /availability (grade de horários no frontend)
 * - CreateAppointment (validação anti-conflito no momento do agendamento)
 *
 * Regras aplicadas:
 * - Jornada de trabalho do dia (início/fim, dia ativo)
 * - Intervalo da agenda configurado pelo profissional (users.schedule_interval)
 * - Delay/descanso entre atendimentos (users.appointment_buffer)
 * - Agendamentos existentes ocupam [início, início + duração + delay)
 * - Bloqueios manuais (blocked_slots), incluindo férias/almoço
 * - Horários passados
 * - O serviço precisa terminar dentro do expediente
 */

import { eq, and, gte, lt, ne, lte, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { appointmentsTable } from "../../db/schema/appointments.js";
import { blockedSlotsTable } from "../../db/schema/blockedSlots.js";
import { workSchedulesTable } from "../../db/schema/workSchedules.js";
import { workScheduleDaysTable } from "../../db/schema/workScheduleDays.js";

export type SlotStatus = "available" | "occupied" | "blocked" | "past" | "unavailable";

export interface DaySlot {
  time: string; // "09:00"
  startAt: string; // ISO
  status: SlotStatus;
  /** id do agendamento que ocupa o slot, quando status = occupied */
  appointmentId?: number;
  /** título do bloqueio, quando status = blocked */
  blockTitle?: string;
}

export interface DayAvailability {
  date: string;
  isWorkDay: boolean;
  workStart: string | null; // "08:00"
  workEnd: string | null;
  interval: number;
  buffer: number;
  slots: DaySlot[];
}

interface Occupied {
  start: Date;
  end: Date;
  appointmentId: number;
}

interface Blocked {
  start: Date;
  end: Date;
  title: string;
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd;

/**
 * IMPORTANTE — modelo de horário ("hora de parede"):
 * Todos os horários são tratados no frame UTC como hora literal do relógio
 * do profissional (11:00 agendado = 11:00 exibido, sempre). O servidor roda
 * com TZ=UTC e o frontend exibe com timeZone "UTC", então nunca há conversão
 * de fuso nos horários. O único ponto sensível a fuso é "agora" (para marcar
 * horários passados), e para isso o cliente envia `tzOffsetMin` — minutos a
 * leste de UTC (ex: Brasil UTC-4 → -240).
 */

/** "08:00:00" + data base → Date no frame UTC */
const timeOnDate = (base: Date, time: string): Date => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const d = new Date(base);
  d.setUTCHours(h, m, 0, 0);
  return d;
};

const hhmm = (d: Date) =>
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

/** "Agora" na hora de parede do cliente, representado no frame UTC */
export const wallNow = (tzOffsetMin: number) =>
  new Date(Date.now() + tzOffsetMin * 60000);

/**
 * Calcula a grade de horários de um dia para o profissional.
 * `serviceDuration` (min) define quanto tempo o novo atendimento precisa;
 * quando omitido, considera 1 slot.
 * `tzOffsetMin`: fuso do cliente em minutos a leste de UTC (para "passado").
 * `extraMinutes`: minutos extras que o novo atendimento vai ocupar além do
 * serviço (ex: deslocamento de atendimento a domicílio).
 */
export const computeDaySlots = async (
  userId: number,
  date: Date,
  serviceDuration?: number,
  tzOffsetMin = 0,
  extraMinutes = 0
): Promise<DayAvailability> => {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  // Configurações do profissional
  const [user] = await db
    .select({
      scheduleInterval: usersTable.scheduleInterval,
      appointmentBuffer: usersTable.appointmentBuffer,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const interval = user?.scheduleInterval ?? 15;
  const buffer = user?.appointmentBuffer ?? 0;

  const empty: DayAvailability = {
    date: dayStart.toISOString().slice(0, 10),
    isWorkDay: false,
    workStart: null,
    workEnd: null,
    interval,
    buffer,
    slots: [],
  };

  // Jornada ativa + dia da semana
  const [schedule] = await db
    .select({ id: workSchedulesTable.id })
    .from(workSchedulesTable)
    .where(and(eq(workSchedulesTable.userId, userId), eq(workSchedulesTable.isActive, true)))
    .limit(1);

  if (!schedule) return empty;

  const [day] = await db
    .select()
    .from(workScheduleDaysTable)
    .where(
      and(
        eq(workScheduleDaysTable.workScheduleId, schedule.id),
        eq(workScheduleDaysTable.dayOfWeek, dayStart.getUTCDay()),
        eq(workScheduleDaysTable.isActive, true)
      )
    )
    .limit(1);

  if (!day) return empty;

  const workStart = timeOnDate(dayStart, day.startTime);
  const workEnd = timeOnDate(dayStart, day.endTime);

  // Agendamentos ativos do dia (ocupam duração + delay)
  const dayAppointments = await db
    .select({
      id: appointmentsTable.id,
      scheduledAt: appointmentsTable.scheduledAt,
      duration: appointmentsTable.duration,
      travelMinutes: appointmentsTable.travelMinutes,
    })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.userId, userId),
        gte(appointmentsTable.scheduledAt, dayStart),
        lt(appointmentsTable.scheduledAt, dayEnd),
        ne(appointmentsTable.status, "cancelled"),
        ne(appointmentsTable.status, "no_show")
      )
    );

  const occupied: Occupied[] = dayAppointments.map((a) => {
    const start = new Date(a.scheduledAt);
    // ocupa: serviço + deslocamento (domicílio) + delay de descanso
    return {
      start,
      end: new Date(start.getTime() + (a.duration + (a.travelMinutes ?? 0) + buffer) * 60000),
      appointmentId: a.id,
    };
  });

  // Bloqueios que tocam o dia
  const dayBlocks = await db
    .select({
      startAt: blockedSlotsTable.startAt,
      endAt: blockedSlotsTable.endAt,
      title: blockedSlotsTable.title,
    })
    .from(blockedSlotsTable)
    .where(
      and(
        eq(blockedSlotsTable.userId, userId),
        lte(blockedSlotsTable.startAt, dayEnd),
        gt(blockedSlotsTable.endAt, dayStart)
      )
    );

  const blocked: Blocked[] = dayBlocks.map((b) => ({
    start: new Date(b.startAt),
    end: new Date(b.endAt),
    title: b.title,
  }));

  const now = wallNow(tzOffsetMin);
  const neededMinutes = (serviceDuration ?? interval) + extraMinutes + buffer;
  const slots: DaySlot[] = [];

  for (let t = new Date(workStart); t < workEnd; t = new Date(t.getTime() + interval * 60000)) {
    const slotStart = new Date(t);
    const serviceEnd = new Date(slotStart.getTime() + (serviceDuration ?? interval) * 60000);
    const occupiedEnd = new Date(slotStart.getTime() + neededMinutes * 60000);

    const slot: DaySlot = {
      time: hhmm(slotStart),
      startAt: slotStart.toISOString(),
      status: "available",
    };

    const hitAppt = occupied.find((o) => overlaps(slotStart, occupiedEnd, o.start, o.end));
    const hitBlock = blocked.find((b) => overlaps(slotStart, occupiedEnd, b.start, b.end));

    // O próprio slot está dentro de algo ocupado/bloqueado? (marca visual)
    const insideAppt = occupied.find((o) => slotStart >= o.start && slotStart < o.end);
    const insideBlock = blocked.find((b) => slotStart >= b.start && slotStart < b.end);

    if (insideAppt) {
      slot.status = "occupied";
      slot.appointmentId = insideAppt.appointmentId;
    } else if (insideBlock) {
      slot.status = "blocked";
      slot.blockTitle = insideBlock.title;
    } else if (slotStart < now) {
      slot.status = "past";
    } else if (serviceEnd > workEnd) {
      // serviço não termina dentro do expediente
      slot.status = "unavailable";
    } else if (hitAppt) {
      // slot livre, mas o serviço invadiria um atendimento (ou o delay dele)
      slot.status = "unavailable";
    } else if (hitBlock) {
      slot.status = "unavailable";
    }

    slots.push(slot);
  }

  return {
    date: empty.date,
    isWorkDay: true,
    workStart: hhmm(workStart),
    workEnd: hhmm(workEnd),
    interval,
    buffer,
    slots,
  };
};

/**
 * Valida se um horário específico pode receber um agendamento.
 * Retorna null se ok, ou a mensagem de erro.
 */
export const validateSlot = async (
  userId: number,
  scheduledAt: Date,
  serviceDuration: number,
  tzOffsetMin = 0,
  extraMinutes = 0
): Promise<string | null> => {
  const availability = await computeDaySlots(
    userId,
    scheduledAt,
    serviceDuration,
    tzOffsetMin,
    extraMinutes
  );

  if (!availability.isWorkDay) {
    return "O profissional não atende neste dia";
  }

  if (scheduledAt < wallNow(tzOffsetMin)) {
    return "Não é possível agendar em um horário passado";
  }

  const wanted = availability.slots.find(
    (s) => new Date(s.startAt).getTime() === scheduledAt.getTime()
  );

  if (!wanted) {
    return "Horário fora do expediente ou fora da grade da agenda";
  }

  if (wanted.status === "occupied") return "Este horário já está ocupado";
  if (wanted.status === "blocked") return "Este horário está bloqueado";
  if (wanted.status === "past") return "Não é possível agendar em um horário passado";
  if (wanted.status === "unavailable")
    return "O serviço não cabe neste horário (conflito com outro atendimento, bloqueio ou fim do expediente)";

  return null;
};
