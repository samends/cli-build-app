const { describe, it, beforeEach, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import * as fs from 'fs';
import * as path from 'path';
import * as logSymbols from 'log-symbols';
import chalk from 'chalk';
import * as sinon from 'sinon';
import MockModule from '../support/MockModule';

const columns = require('cli-columns');

let mockModule: MockModule;

function assertOutput(isServing = false, hasManifest = true) {
	const logger = mockModule.getModuleUnderTest().default;
	const runningMessage = isServing ? 'running...' : undefined;
	const hasErrors = logger(
		{
			hash: 'hash',
			assets: [
				{
					name: 'assetOne.js',
					size: 1000
				},
				{
					name: 'assetOne.js',
					size: 1000
				}
			],
			chunks: [
				{
					names: ['chunkOne']
				}
			],
			errors: [],
			warnings: []
		},
		{
			output: {
				path: path.join(__dirname, '..', 'fixtures')
			}
		},
		runningMessage
	);

	let assetOne = `assetOne.js ${chalk.yellow('(0.03kb)')} / ${chalk.blue('(0.04kb gz)')}`;
	let signOff = chalk.green('The build completed successfully.');
	if (runningMessage) {
		signOff += `\n\n${runningMessage}`;
	}
	let chunksAndAssets = '';
	if (hasManifest) {
		chunksAndAssets = `${chalk.yellow('chunks:')}
${columns(['chunkOne'])}
${chalk.yellow('assets:')}
${columns([assetOne, assetOne])}`;
	}

	const expectedLog = `
${logSymbols.info} cli-build-app: 9.9.9
${logSymbols.info} typescript: 1.1.1
${logSymbols.success} hash: hash
${logSymbols.error} errors: 0
${logSymbols.warning} warnings: 0
${''}${''}
${chunksAndAssets}
${chalk.yellow(`output at: ${chalk.cyan(chalk.underline(`file:///${path.join(__dirname, '..', 'fixtures')}`))}`)}

${signOff}
	`;
	const mockedLogUpdate = mockModule.getMock('log-update').ctor;
	assert.isTrue(mockedLogUpdate.calledWith(expectedLog));
	assert.isFalse(hasErrors);
}

describe('logger', () => {
	beforeEach(() => {
		mockModule = new MockModule('../../src/logger', require);
		mockModule.dependencies(['typescript', 'jsonfile', 'log-update']);
		mockModule.getMock('jsonfile').readFileSync = sinon.stub().returns({ version: '9.9.9' });
		mockModule.getMock('typescript').version = '1.1.1';
	});

	afterEach(() => {
		mockModule.destroy();

		const existsSync = fs.existsSync as any;
		if (typeof existsSync.restore === 'function') {
			existsSync.restore();
		}
	});

	it('logging output with no errors', () => {
		assertOutput();
	});

	it('logging output while serving', () => {
		assertOutput(true);
	});

	it('logging output without manifest', () => {
		sinon.stub(fs, 'existsSync').returns(false);
		assertOutput(false, false);
	});

	it('logging output with errors', () => {
		const errors: any = ['error', 'otherError'];
		const warnings: any = ['warning', 'otherWarning'];
		const logger = mockModule.getModuleUnderTest().default;
		const hasErrors = logger(
			{
				hash: 'hash',
				assets: [
					{
						name: 'assetOne.js',
						size: 1000
					},
					{
						name: 'assetOne.js',
						size: 1000
					}
				],
				chunks: [
					{
						names: ['chunkOne']
					}
				],
				errors,
				warnings
			},
			{
				output: {
					path: path.join(__dirname, '..', 'fixtures')
				}
			}
		);

		const expectedErrors = `
${chalk.yellow('errors:')}${chalk.red('\nerror\notherError')}
`;

		const expectedWarnings = `
${chalk.yellow('warnings:')}${chalk.gray('\nwarning\notherWarning')}
`;

		const expectedLog = `
${logSymbols.info} cli-build-app: 9.9.9
${logSymbols.info} typescript: 1.1.1
${logSymbols.success} hash: hash
${logSymbols.error} errors: 2
${logSymbols.warning} warnings: 2
${expectedErrors}${expectedWarnings}
${chalk.yellow('chunks:')}
${columns(['chunkOne'])}
${chalk.yellow('assets:')}
${columns([
			`assetOne.js ${chalk.yellow('(0.03kb)')} / ${chalk.blue('(0.04kb gz)')}`,
			`assetOne.js ${chalk.yellow('(0.03kb)')} / ${chalk.blue('(0.04kb gz)')}`
		])}
${chalk.yellow(`output at: ${chalk.cyan(chalk.underline(`file:///${path.join(__dirname, '..', 'fixtures')}`))}`)}

${chalk.red('The build completed with errors.')}
	`;
		const mockedLogUpdate = mockModule.getMock('log-update').ctor;
		assert.strictEqual(mockedLogUpdate.firstCall.args[0], expectedLog);
		assert.isTrue(mockedLogUpdate.calledWith(expectedLog));
		assert.isTrue(hasErrors);
	});

	it('should skip assets that do not exist', () => {
		const logger = mockModule.getModuleUnderTest().default;
		const hasErrors = logger(
			{
				hash: 'hash',
				assets: [
					{
						name: 'assetOne.js',
						size: 1000
					},
					{
						name: 'assetTwo.js',
						size: 1000
					}
				],
				chunks: [
					{
						names: ['chunkOne']
					}
				],
				errors: [],
				warnings: []
			},
			{
				output: {
					path: path.join(__dirname, '..', 'fixtures', 'missing-assets')
				}
			}
		);

		const expectedLog = `
${logSymbols.info} cli-build-app: 9.9.9
${logSymbols.info} typescript: 1.1.1
${logSymbols.success} hash: hash
${logSymbols.error} errors: 0
${logSymbols.warning} warnings: 0
${''}${''}
${chalk.yellow('chunks:')}
${columns(['chunkOne'])}
${chalk.yellow('assets:')}
${columns([`assetOne.js ${chalk.yellow('(0.03kb)')} / ${chalk.blue('(0.04kb gz)')}`])}
${chalk.yellow(
			`output at: ${chalk.cyan(
				chalk.underline(`file:///${path.join(__dirname, '..', 'fixtures', 'missing-assets')}`)
			)}`
		)}

${chalk.green('The build completed successfully.')}
	`;
		const mockedLogUpdate = mockModule.getMock('log-update').ctor;
		assert.strictEqual(mockedLogUpdate.firstCall.args[0], expectedLog);
		assert.isTrue(mockedLogUpdate.calledWith(expectedLog));
		assert.isFalse(hasErrors);
	});
});
