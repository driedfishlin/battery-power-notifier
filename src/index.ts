import notifier from 'node-notifier';
import system from 'systeminformation';
import BatteryMonitor, { IBatteryMonitorConfig } from './battery-monitor.js';
import argumentParser from './params-parser.js';

const DEFAULT_CONFIG: IBatteryMonitorConfig = {
	targets: [
		{ percent: 60 },
		{ percent: 50 },
		{ percent: 40 },
		{
			percent: 30,
			frequencyOfNotify: 1000 * 60 * 5, // 5 minutes
		},
	],
};

try {
	const { config: configByParams } = argumentParser();
	let config = configByParams || DEFAULT_CONFIG;
	const instance = new BatteryMonitor(system, notifier);
	instance.register(config).start();
} catch (error) {
	console.error(error);
}
