import type { PluginCode, Plugins } from '../types/plugin';
import { getDoyTime, getTimeZoneName, getUnixEpochTime } from './time';
import { formatTickLocalTZ, formatTickUtc, utcTicks } from './timeline';
import { timestamp } from './validators';

export async function loadPluginCode(path: string) {
  const code = (await import(/* @vite-ignore */ path)) as PluginCode;
  return await code.getPlugin();
}

export const defaultPlugins: Plugins = {
  time: {
    additional: [
      {
        format: date => date.toLocaleString(),
        formatTick: formatTickLocalTZ,
        label: getTimeZoneName(),
      },
    ],
    enableDatePicker: true,
    getDefaultPlanEndDate: start => {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return end;
    },
    primary: {
      format: (date: Date) => getDoyTime(date),
      formatShort: (date: Date) => getDoyTime(date).split('T')[0],
      formatString: 'YYYY-DDDThh:mm:ss',
      formatTick: formatTickUtc,
      label: 'UTC',
      parse: (string: string) => new Date(getUnixEpochTime(string)),
      validate: timestamp,
    },
    ticks: {
      getTicks: utcTicks,
      maxLabelWidth: 130,
    },
  },
};
