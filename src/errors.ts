export class InvalidParamError extends Error {
	public message: string;
	constructor() {
		super(InvalidParamError.name);
		this.message = InvalidParamError.name;
	}

	public noKeyProvided() {
		this.message = 'you need to set --key to pass the parameter values';
		return this;
	}

	public invalidParamName(paramName: string) {
		this.message = `cannot recognize parameter ${paramName}.`;
		return this;
	}

	public invalidTargets(paramName: string) {
		this.message = `invalid parameter value from ${paramName}`;
		return this;
	}
}
