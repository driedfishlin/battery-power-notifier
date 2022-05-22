import { InvalidParamError } from './errors.js';
import { IBatteryMonitorConfig } from './battery-monitor.js';

const PARAM_TARGET = '--target';
const ACCEPT_TYPE_OF_PARAMS = [PARAM_TARGET] as readonly string[];

const argumentParser = (
	args = process.argv.slice(2)
): {
	config?: IBatteryMonitorConfig;
} => {
	if (args.length === 0) return {};

	const argDic = {} as { [key: string]: any };
	let currentKey: string | undefined = undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i].startsWith('-')) {
			currentKey = args[i];
			if (!ACCEPT_TYPE_OF_PARAMS.includes(currentKey))
				throw new InvalidParamError().invalidParamName(currentKey);
			argDic[currentKey] = [];
		} else {
			if (currentKey === undefined)
				throw new InvalidParamError().noKeyProvided();
			argDic[currentKey] = args[i];
		}
	}

	const config =
		PARAM_TARGET in argDic ? parseConfig(argDic[PARAM_TARGET]) : undefined;

	return {
		config,
	};
};

const parseConfig = (json: string): IBatteryMonitorConfig | never => {
	const params: number[] | number = JSON.parse(json);

	if (typeof params === 'number') return { targets: [{ percent: params }] };

	const isValidParam = params.every(value => typeof value === 'number');
	if (!isValidParam) throw new InvalidParamError().invalidTargets(PARAM_TARGET);
	const targets = params.map(number => ({ percent: number }));
	return { targets };
};

export default argumentParser;
