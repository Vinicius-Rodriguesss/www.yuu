import 'dotenv/config';
import { computeDaySlots } from './Services/Availability/computeDaySlots.js';

async function main() {
  const result = await computeDaySlots(1, new Date('2026-08-05T00:00:00.000Z'), 180, -180, 12, 4);
  console.log('interval', result.interval, 'buffer', result.buffer);
  console.log(result.slots.filter((s) => s.time >= '11:50' && s.time <= '12:40').map((s) => s.time + ':' + s.status + (s.appointmentId ? '(appt' + s.appointmentId + ')' : '')));
  process.exit(0);
}
main();
