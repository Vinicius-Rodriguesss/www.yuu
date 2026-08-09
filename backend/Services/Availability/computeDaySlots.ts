/**
 * Motor de disponibilidade da agenda.
 *
 * Única fonte de verdade para calcular os horários de um dia, usada por:
 * - GET /availability (grade de horários no frontend)
 * - CreateAppointment/UpdateAppointment (validação anti-conflito no momento do agendamento)
 *
 * Regras aplicadas:
 * - Jornada de trabalho do dia (início/fim, dia ativo)
 * - Intervalo da agenda configurado pelo profissional (users.schedule_interval) — só afeta a
 *   "régua" de horários oferecida na grade (GET /availability), nunca bloqueia um horário válido
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
  breakStart: string | null;
  breakEnd: string | null;
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

interface DayContext {
  isWorkDay: boolean;
  workStart: Date | null;
  workEnd: Date | null;
  interval: number;
  buffer: number;
  breakStart: string | null;
  breakEnd: string | null;
  occupied: Occupied[];
  blocked: Blocked[];
}

/**
 * Busca a jornada do dia + tudo que ocupa a agenda (agendamentos, bloqueios, pausa fixa) — usado
 * tanto pra montar a grade de horários (computeDaySlots) quanto pra validar um horário específico
 * (validateSlot) direto contra os conflitos reais, sem depender de nenhuma grade fixa.
 */
const getDayContext = async (
  userId: number,
  date: Date,
  excludeAppointmentId?: number
): Promise<DayContext> => {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [user] = await db
    .select({
      scheduleInterval: usersTable.scheduleInterval,
      appointmentBuffer: usersTable.appointmentBuffer,
      breakStart: usersTable.breakStart,
      breakEnd: usersTable.breakEnd,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const interval = user?.scheduleInterval ?? 15;
  const buffer = user?.appointmentBuffer ?? 0;
  const breakStart = user?.breakStart ?? null;
  const breakEnd = user?.breakEnd ?? null;

  const empty: DayContext = {
    isWorkDay: false,
    workStart: null,
    workEnd: null,
    interval,
    buffer,
    breakStart,
    breakEnd,
    occupied: [],
    blocked: [],
  };

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

  if (!day) return { ...empty, breakStart: null, breakEnd: null };

  const workStart = timeOnDate(dayStart, day.startTime);
  const workEnd = timeOnDate(dayStart, day.endTime);

  // excludeAppointmentId: usado ao editar/reagendar, pra ele não conflitar com o próprio horário
  const appointmentConditions = [
    eq(appointmentsTable.userId, userId),
    gte(appointmentsTable.scheduledAt, dayStart),
    lt(appointmentsTable.scheduledAt, dayEnd),
    ne(appointmentsTable.status, "cancelled"),
    ne(appointmentsTable.status, "no_show"),
  ];
  if (excludeAppointmentId) {
    appointmentConditions.push(ne(appointmentsTable.id, excludeAppointmentId));
  }

  const dayAppointments = await db
    .select({
      id: appointmentsTable.id,
      scheduledAt: appointmentsTable.scheduledAt,
      duration: appointmentsTable.duration,
      travelMinutes: appointmentsTable.travelMinutes,
    })
    .from(appointmentsTable)
    .where(and(...appointmentConditions));

  const occupied: Occupied[] = dayAppointments.map((a) => {
    const start = new Date(a.scheduledAt);
    // ocupa: serviço + deslocamento (ida E volta até o cliente) + delay de descanso.
    // travelMinutes salvo no agendamento é só a ida (usado pra exibir "chegada em
    // X min"), mas o profissional também precisa de tempo pra voltar antes do
    // próximo horário — por isso dobra aqui pro bloqueio de agenda.
    return {
      start,
      end: new Date(start.getTime() + (a.duration + (a.travelMinutes ?? 0) * 2 + buffer) * 60000),
      appointmentId: a.id,
    };
  });

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

  // Pausa fixa recorrente (ex: almoço) — tratada como um bloqueio automático
  // todo dia de trabalho, sem precisar cadastrar em blocked_slots
  if (breakStart && breakEnd) {
    blocked.push({
      start: timeOnDate(dayStart, breakStart),
      end: timeOnDate(dayStart, breakEnd),
      title: "Pausa",
    });
  }

  return { isWorkDay: true, workStart, workEnd, interval, buffer, breakStart, breakEnd, occupied, blocked };
};

/**
 * Calcula a grade de horários de um dia para o profissional — usada pra EXIBIR opções (grade do
 * calendário, botões da reserva pública). `serviceDuration` (min) define quanto tempo o novo
 * atendimento precisa; quando omitido, considera 1 slot.
 * `tzOffsetMin`: fuso do cliente em minutos a leste de UTC (para "passado").
 * `extraMinutes`: minutos extras que o novo atendimento vai ocupar além do
 * serviço (ex: deslocamento de atendimento a domicílio — já deve vir como
 * ida E volta; quem chama passa o dobro do tempo de deslocamento).
 */
export const computeDaySlots = async (
  userId: number,
  date: Date,
  serviceDuration?: number,
  tzOffsetMin = 0,
  extraMinutes = 0,
  excludeAppointmentId?: number
): Promise<DayAvailability> => {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const ctx = await getDayContext(userId, date, excludeAppointmentId);

  const base: Omit<DayAvailability, "isWorkDay" | "workStart" | "workEnd" | "slots"> = {
    date: dayStart.toISOString().slice(0, 10),
    interval: ctx.interval,
    buffer: ctx.buffer,
    breakStart: ctx.breakStart,
    breakEnd: ctx.breakEnd,
  };

  if (!ctx.isWorkDay || !ctx.workStart || !ctx.workEnd) {
    return { ...base, isWorkDay: false, workStart: null, workEnd: null, slots: [] };
  }

  const { workStart, workEnd, occupied, blocked, interval, buffer } = ctx;
  const now = wallNow(tzOffsetMin);
  const neededMinutes = (serviceDuration ?? interval) + extraMinutes + buffer;
  const slots: DaySlot[] = [];

  // Horários candidatos: a grade fixa (a cada `interval`, só a "régua" de opções pra EXIBIR) + o
  // instante exato em que cada atendimento/bloqueio termina, pra sempre oferecer o horário livre
  // mais cedo possível como opção — sem isso, o intervalo funcionaria como um atraso extra.
  const candidateTimes = new Set<number>();
  for (let t = workStart.getTime(); t < workEnd.getTime(); t += interval * 60000) {
    candidateTimes.add(t);
  }
  [...occupied.map((o) => o.end), ...blocked.map((b) => b.end)].forEach((end) => {
    if (end.getTime() >= workStart.getTime() && end.getTime() < workEnd.getTime()) {
      candidateTimes.add(end.getTime());
    }
  });

  for (const time of Array.from(candidateTimes).sort((a, b) => a - b)) {
    const slotStart = new Date(time);
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
    ...base,
    isWorkDay: true,
    workStart: hhmm(workStart),
    workEnd: hhmm(workEnd),
    slots,
  };
};

/**
 * Valida se um horário específico pode receber um agendamento — checa direto contra a jornada e
 * os conflitos reais (agendamentos, bloqueios, passado), SEM exigir que o horário bata com nenhuma
 * grade fixa. Isso é o que permite arrastar um agendamento pra qualquer minuto livre na agenda
 * (reagendar arrastando no Calendário) em vez de só nos múltiplos do Intervalo da Agenda — só
 * precisa caber dentro do expediente e não colidir com nada.
 */
export const validateSlot = async (
  userId: number,
  scheduledAt: Date,
  serviceDuration: number,
  tzOffsetMin = 0,
  extraMinutes = 0,
  excludeAppointmentId?: number
): Promise<string | null> => {
  const ctx = await getDayContext(userId, scheduledAt, excludeAppointmentId);

  if (!ctx.isWorkDay || !ctx.workStart || !ctx.workEnd) {
    return "O profissional não atende neste dia";
  }

  const now = wallNow(tzOffsetMin);
  if (scheduledAt < now) {
    return "Não é possível agendar em um horário passado";
  }

  if (scheduledAt < ctx.workStart) {
    return `Horário fora da jornada de trabalho (${hhmm(ctx.workStart)} - ${hhmm(ctx.workEnd)})`;
  }

  const neededMinutes = serviceDuration + extraMinutes + ctx.buffer;
  const scheduledEnd = new Date(scheduledAt.getTime() + neededMinutes * 60000);
  const serviceEnd = new Date(scheduledAt.getTime() + serviceDuration * 60000);

  if (serviceEnd > ctx.workEnd) {
    return `Horário fora da jornada de trabalho (${hhmm(ctx.workStart)} - ${hhmm(ctx.workEnd)})`;
  }

  const hitAppt = ctx.occupied.find((o) => overlaps(scheduledAt, scheduledEnd, o.start, o.end));
  if (hitAppt) return "Este horário já está ocupado";

  const hitBlock = ctx.blocked.find((b) => overlaps(scheduledAt, scheduledEnd, b.start, b.end));
  if (hitBlock) return "Este horário está bloqueado";

  return null;
};
