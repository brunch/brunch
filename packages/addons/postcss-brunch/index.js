'use strict';
const sysPath = require('path');
const postcss = require('postcss');
const postcssModules = require('postcss-modules');
const progeny = require('progeny');
const logger = require('loggy');
const anymatch = require('anymatch');

const notify = (warnings) => {
	if (!warnings.length) return;
	const str = warnings.map(warn => {
		const line = warn.line ? `line ${warn.line}` : ''
		const col = warn.col ? ` col ${warn.col}` : ''
		const node = warn.node ? ' ' + warn.node.toString() : '';
		return `\t[${warn.plugin}]:${node}\t${line}${col}: ${warn.text}\n`;
	}).join('\n');
	logger.warn(`postcss-brunch: ${str}`);
};

const cssModulify = (path, data, map, options) => {
	let json = {};
	const getJSON = (...args) => {
		json = typeof options.getJSON === 'function' && options.getJSON(...args) || args[1]
	};

	return postcss([postcssModules(Object.assign({getJSON}, options))])
		.process(data, {from: path, map}).then(x => {
			const exports = 'module.exports = ' + JSON.stringify(json) + ';';
			return { data: x.css, map: x.map, exports };
		});
};

class PostCSSCompiler {
	constructor(config) {
		const rootPath = config.paths.root;
		this.config = config.plugins.postcss || {};
		this.pattern = this.config.pattern || /\.p?css$/i;
		this.map = Object.assign({
			inline: false,
			annotation: false,
			sourcesContent: false,
		}, this.config.map);
		const progenyOpts = Object.assign({rootPath, reverseArgs: true}, this.config.progeny);
		this.getDependencies = progeny(progenyOpts);
		this.isIgnored = anymatch(this.config.ignore || []);

		const procs = this.config.processors || [];
		const compilers = [].concat(procs.compilers || procs);
		this._compiler = postcss(compilers);
		const optimizers = [].concat(procs.optimizers || []);
		if (!optimizers.length) return;

		this._optimizer = postcss(optimizers);
		this.optimize = file => {
			const path = file.path;
			const opts = Object.assign({
				from: path,
				to: sysPath.basename(path),
				map: this.map,
			}, this.config.options);

			if (file.data === undefined) {
				file.data = '';
			}
			if (file.map) {
				opts.map.prev = JSON.stringify(file.map);
			}

			return this._optimizer.process(file.data, opts).then(result => {
				notify(result.warnings());

				return {
					path,
					data: result.css,
					map: JSON.stringify(result.map),
				};
			}).catch(error => {
				if (error.name === 'CssSyntaxError') {
					throw new Error('postcss-brunch syntax error: ' + error.message + error.showSourceCode());
				}
				throw error;
			});
		};
	}

	compile(file) {
		const path = file.path;
		if (this.isIgnored(path)) {
			return Promise.resolve(file);
		}

		const opts = Object.assign({
			from: path,
			to: sysPath.basename(path),
			map: this.map,
		}, this.config.options);

		if (file.data === undefined) {
			file.data = '';
		}
		if (file.map) {
			opts.map.prev = JSON.stringify(file.map);
		}

		return this._compiler.process(file.data, opts).then(result => {
			notify(result.warnings());

			const data = result.css;
			const map = JSON.stringify(result.map);
			if (this.config.modules) {
				const opts = this.config.modules === true ? {} : this.config.modules;
				return cssModulify(path, data, map, opts);
			} else {
				return {path, data, map};
			}
		}).catch(error => {
			if (error.name === 'CssSyntaxError') {
				throw new Error('postcss-brunch syntax error: ' + error.message + error.showSourceCode());
			}
			throw error;
		});
	}
}

Object.assign(PostCSSCompiler.prototype, {
	brunchPlugin: true,
	type: 'stylesheet',
});

module.exports = PostCSSCompiler;
