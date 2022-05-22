import type { NodeNotifier } from 'node-notifier';
import system from 'systeminformation';

interface NotifyTarget {
	/** specify the battery percent value to be notified */
	percent: number;
	/** title of notify message */
	title?: string;
	/** message of notification */
	message?: (batteryPercent: number) => string | string;
	/** millisecond interval per notify, given 0 will be notify once. default: 0. */
	frequencyOfNotify?: number;
}

export interface IBatteryMonitorConfig {
	/** items with a low battery percentage will override those with a high battery percentage */
	targets: NotifyTarget[];
	/** millisecond interval per check, default by 180000 (5 minutes). valid range: >= 5000 */
	frequencyOfCheck?: number;
}

/** print message in the terminal */
const printLog = console.log;

export default class BatteryMonitor {
	private _initialized: boolean;
	private _targetsForNotify: NotifyTarget[] | undefined;
	private _frequencyForCheck: number;
	private _timerForCheck: NodeJS.Timer | undefined;
	private _timerForNotify: NodeJS.Timer | undefined;
	private _currentTarget: NotifyTarget | undefined;

	constructor(private _system: typeof system, private _notifier: NodeNotifier) {
		this._initialized = false;
		this._targetsForNotify = undefined;
		this._frequencyForCheck = 180000;
		this._timerForCheck = undefined;
		this._timerForNotify = undefined;
		this._currentTarget = undefined;
	}

	public getBatteryPercent = async (): Promise<number> => {
		const battery = await this._system.battery().then(data => data);
		return battery.percent;
	};

	public getIsAcConnected = async () => {
		const date = await this._system.battery().then(data => data);
		return date.acConnected;
	};

	/** sort the targets to be in ascending order */
	private normalizeTargets = (targets: NotifyTarget[]) => {
		return targets.sort((a, b) => a.percent - b.percent);
	};

	/** the entry point of service, need provide config */
	public register = (config: IBatteryMonitorConfig) => {
		if (this._initialized)
			throw Error(
				'already registered. if you want to change the settings, create the new instance.'
			);
		this._initialized = true;
		const { targets, frequencyOfCheck = 180000 } = config;
		this._targetsForNotify = this.normalizeTargets(targets);
		if (frequencyOfCheck >= 5000) this._frequencyForCheck = frequencyOfCheck;
		return this;
	};

	/** clear timers & part of states */
	public stop = () => {
		this.clearNotifyTimer();
		clearInterval(this._timerForCheck);
		this._currentTarget = undefined;
		return this;
	};

	/** start the timer after the config registered */
	public start = () => {
		printLog('start battery monitor');
		const targets = this._targetsForNotify;
		const frequency = this._frequencyForCheck;
		if (targets === undefined)
			throw Error('cannot find targets existed to start the timer');
		this.startTimerForCheck(targets, frequency);
		return this;
	};

	/** start timer for check the battery percent value at each time */
	private startTimerForCheck = (targets: NotifyTarget[], frequency: number) => {
		const callback = async () => {
			const isAcConnected = await this.getIsAcConnected();
			if (isAcConnected) {
				if (!!this._timerForNotify) this.resetStateWhenAcConnected();
				return this;
			}
			const currentPercent = await this.getBatteryPercent();
			const target = targets.find(item => item.percent >= currentPercent);
			if (target && this._currentTarget !== target) {
				this._currentTarget = target;
				if (this._timerForNotify) this.clearNotifyTimer();
				this.setTimerForNotify(target, currentPercent);
			}
		};
		this._timerForCheck = setInterval(callback, frequency);
		return this;
	};

	/** start the timer for notify user the current battery percent value */
	private setTimerForNotify = (
		target: NotifyTarget,
		currentPercent: number
	) => {
		const { frequencyOfNotify = 0 } = target;
		if (frequencyOfNotify !== 0) {
			const callback = async () => {
				const currentPercent = await this.getBatteryPercent();
				this.notify(target, currentPercent);
			};
			this._timerForNotify = setInterval(callback, frequencyOfNotify);
		} else this.notify(target, currentPercent);
	};

	/** display the notification message on the computer screen */
	private notify = (target: NotifyTarget, currentPercent: number) => {
		const title = target.title || '低電量警告';
		const message =
			typeof target.message === 'string'
				? target.message
				: typeof target.message === 'function'
				? target.message(currentPercent)
				: `電量剩餘 ${currentPercent}%`;
		this._notifier.notify({
			title,
			message,
		});
		printLog(title, ': ', message);
		return this;
	};

	private clearNotifyTimer = () => {
		const timer = this._timerForNotify;
		if (timer) {
			clearInterval(timer);
			this._timerForNotify = undefined;
		}
	};

	/** used when user connect the power cord to the computer */
	private resetStateWhenAcConnected = () => {
		this.clearNotifyTimer();
		this._currentTarget = undefined;
	};
}
