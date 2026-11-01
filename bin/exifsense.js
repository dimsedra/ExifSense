#!/usr/bin/env node
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import os from "node:os";
import { fileURLToPath } from "node:url";
// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
// src/cli/args.ts
var CliArgumentError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "CliArgumentError";
	}
};
function parseCliArgs(rawArgs) {
	if (!rawArgs || rawArgs.length === 0) return { command: "help" };
	let parsed;
	try {
		parsed = parseArgs({
			args: rawArgs,
			options: {
				locale: {
					type: "string",
					default: "en"
				},
				format: {
					type: "string",
					default: "plain"
				},
				out: { type: "string" },
				help: {
					type: "boolean",
					short: "h"
				},
				version: {
					type: "boolean",
					short: "v"
				}
			},
			allowPositionals: true,
			strict: true
		});
	} catch (error) {
		throw new CliArgumentError(error instanceof Error ? error.message : String(error));
	}
	const { values, positionals } = parsed;
	if (values.help) return { command: "help" };
	if (values.version) return { command: "version" };
	if (positionals.length === 0) return { command: "help" };
	const [command, ...rest] = positionals;
	if (command === "help" || command === "--help" || command === "-h") return { command: "help" };
	if (command === "version" || command === "--version" || command === "-v") return { command: "version" };
	const locale = values.locale;
	if (locale !== "en" && locale !== "id" && locale !== "ar") throw new CliArgumentError(`Unsupported locale '${locale}'. Supported: en, id, ar.`);
	const format = values.format;
	if (format !== "plain" && format !== "markdown") throw new CliArgumentError(`Unsupported format '${format}'. Supported: plain, markdown.`);
	const options = {
		locale,
		format,
		out: typeof values.out === "string" ? values.out : void 0
	};
	if (command === "single") {
		if (rest.length === 0 || !rest[0]) throw new CliArgumentError("Command 'single' requires a target path (image or JSON file).");
		return {
			command: "single",
			targetPath: rest[0],
			options
		};
	}
	if (command === "batch") {
		if (rest.length === 0) throw new CliArgumentError("Command 'batch' requires at least one target path.");
		return {
			command: "batch",
			targetPaths: rest,
			options
		};
	}
	if (command === "scenario") {
		if (rest.length === 0 || !rest[0]) throw new CliArgumentError("Command 'scenario' requires a scenario name (e.g. 'missing-gps').");
		return {
			command: "scenario",
			scenarioName: rest[0],
			options
		};
	}
	if (command === "extract") {
		if (rest.length === 0 || !rest[0]) throw new CliArgumentError("Command 'extract' requires a source image path.");
		return {
			command: "extract",
			sourcePath: rest[0],
			outputPath: rest[1]
		};
	}
	throw new CliArgumentError(`Unknown command '${command}'. Use '--help' to see available commands.`);
}
// src/core/forensics/signature.ts
var import_full_umd = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module, this$1) => {
	(function(e, t) {
		"object" == typeof exports && "undefined" != typeof module ? t(exports) : "function" == typeof define && define.amd ? define("exifr", ["exports"], t) : t((e = "undefined" != typeof globalThis ? globalThis : e || self).exifr = {});
	})(this$1, (function(e) {
		"use strict";
		var t = "undefined" != typeof self ? self : global;
		const i = "undefined" != typeof navigator, n = i && "undefined" == typeof HTMLImageElement, s = !("undefined" == typeof global || "undefined" == typeof process || !process.versions || !process.versions.node), r = t.Buffer, a = t.BigInt, o = !!r, l = (e) => e;
		function h(e, t = l) {
			if (s) try {
				return "function" == typeof __require ? Promise.resolve(t(__require(e))) : import(
					/* webpackIgnore: true */
					e
).then(t);
			} catch (t) {
				console.warn(`Couldn't load ${e}`);
			}
		}
		let u = t.fetch;
		const c = (e) => u = e;
		if (!t.fetch) {
			const e = h("http", ((e) => e)), t = h("https", ((e) => e)), i = (n, { headers: s } = {}) => new Promise((async (r, a) => {
				let { port: o, hostname: l, pathname: h, protocol: u, search: c } = new URL(n);
				const f = {
					method: "GET",
					hostname: l,
					path: encodeURI(h) + c,
					headers: s
				};
				"" !== o && (f.port = Number(o));
				const d = ("https:" === u ? await t : await e).request(f, ((e) => {
					if (301 === e.statusCode || 302 === e.statusCode) {
						let t = new URL(e.headers.location, n).toString();
						return i(t, { headers: s }).then(r).catch(a);
					}
					r({
						status: e.statusCode,
						arrayBuffer: () => new Promise(((t) => {
							let i = [];
							e.on("data", ((e) => i.push(e))), e.on("end", (() => t(Buffer.concat(i))));
						}))
					});
				}));
				d.on("error", a), d.end();
			}));
			c(i);
		}
		function f(e, t, i) {
			return t in e ? Object.defineProperty(e, t, {
				value: i,
				enumerable: !0,
				configurable: !0,
				writable: !0
			}) : e[t] = i, e;
		}
		const d = (e) => g(e) ? void 0 : e, p = (e) => void 0 !== e;
		function g(e) {
			return void 0 === e || (e instanceof Map ? 0 === e.size : 0 === Object.values(e).filter(p).length);
		}
		function m(e) {
			let t = new Error(e);
			throw delete t.stack, t;
		}
		function S(e) {
			return "" === (e = function(e) {
				for (; e.endsWith("\0");) e = e.slice(0, -1);
				return e;
			}(e).trim()) ? void 0 : e;
		}
		function C(e) {
			let t = function(e) {
				let t = 0;
				return e.ifd0.enabled && (t += 1024), e.exif.enabled && (t += 2048), e.makerNote && (t += 2048), e.userComment && (t += 1024), e.gps.enabled && (t += 512), e.interop.enabled && (t += 100), e.ifd1.enabled && (t += 1024), t + 2048;
			}(e);
			return e.jfif.enabled && (t += 50), e.xmp.enabled && (t += 2e4), e.iptc.enabled && (t += 14e3), e.icc.enabled && (t += 6e3), t;
		}
		const y = (e) => String.fromCharCode.apply(null, e), b = "undefined" != typeof TextDecoder ? new TextDecoder("utf-8") : void 0;
		function P(e) {
			return b ? b.decode(e) : o ? Buffer.from(e).toString("utf8") : decodeURIComponent(escape(y(e)));
		}
		class I {
			static from(e, t) {
				return e instanceof this && e.le === t ? e : new I(e, void 0, void 0, t);
			}
			constructor(e, t = 0, i, n) {
				if ("boolean" == typeof n && (this.le = n), Array.isArray(e) && (e = new Uint8Array(e)), 0 === e) this.byteOffset = 0, this.byteLength = 0;
				else if (e instanceof ArrayBuffer) {
					void 0 === i && (i = e.byteLength - t);
					let n = new DataView(e, t, i);
					this._swapDataView(n);
				} else if (e instanceof Uint8Array || e instanceof DataView || e instanceof I) {
					void 0 === i && (i = e.byteLength - t), (t += e.byteOffset) + i > e.byteOffset + e.byteLength && m("Creating view outside of available memory in ArrayBuffer");
					let n = new DataView(e.buffer, t, i);
					this._swapDataView(n);
				} else if ("number" == typeof e) {
					let t = new DataView(new ArrayBuffer(e));
					this._swapDataView(t);
				} else m("Invalid input argument for BufferView: " + e);
			}
			_swapArrayBuffer(e) {
				this._swapDataView(new DataView(e));
			}
			_swapBuffer(e) {
				this._swapDataView(new DataView(e.buffer, e.byteOffset, e.byteLength));
			}
			_swapDataView(e) {
				this.dataView = e, this.buffer = e.buffer, this.byteOffset = e.byteOffset, this.byteLength = e.byteLength;
			}
			_lengthToEnd(e) {
				return this.byteLength - e;
			}
			set(e, t, i = I) {
				return e instanceof DataView || e instanceof I ? e = new Uint8Array(e.buffer, e.byteOffset, e.byteLength) : e instanceof ArrayBuffer && (e = new Uint8Array(e)), e instanceof Uint8Array || m("BufferView.set(): Invalid data argument."), this.toUint8().set(e, t), new i(this, t, e.byteLength);
			}
			subarray(e, t) {
				return t = t || this._lengthToEnd(e), new I(this, e, t);
			}
			toUint8() {
				return new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
			}
			getUint8Array(e, t) {
				return new Uint8Array(this.buffer, this.byteOffset + e, t);
			}
			getString(e = 0, t = this.byteLength) {
				return P(this.getUint8Array(e, t));
			}
			getLatin1String(e = 0, t = this.byteLength) {
				let i = this.getUint8Array(e, t);
				return y(i);
			}
			getUnicodeString(e = 0, t = this.byteLength) {
				const i = [];
				for (let n = 0; n < t && e + n < this.byteLength; n += 2) i.push(this.getUint16(e + n));
				return y(i);
			}
			getInt8(e) {
				return this.dataView.getInt8(e);
			}
			getUint8(e) {
				return this.dataView.getUint8(e);
			}
			getInt16(e, t = this.le) {
				return this.dataView.getInt16(e, t);
			}
			getInt32(e, t = this.le) {
				return this.dataView.getInt32(e, t);
			}
			getUint16(e, t = this.le) {
				return this.dataView.getUint16(e, t);
			}
			getUint32(e, t = this.le) {
				return this.dataView.getUint32(e, t);
			}
			getFloat32(e, t = this.le) {
				return this.dataView.getFloat32(e, t);
			}
			getFloat64(e, t = this.le) {
				return this.dataView.getFloat64(e, t);
			}
			getFloat(e, t = this.le) {
				return this.dataView.getFloat32(e, t);
			}
			getDouble(e, t = this.le) {
				return this.dataView.getFloat64(e, t);
			}
			getUintBytes(e, t, i) {
				switch (t) {
					case 1: return this.getUint8(e, i);
					case 2: return this.getUint16(e, i);
					case 4: return this.getUint32(e, i);
					case 8: return this.getUint64 && this.getUint64(e, i);
				}
			}
			getUint(e, t, i) {
				switch (t) {
					case 8: return this.getUint8(e, i);
					case 16: return this.getUint16(e, i);
					case 32: return this.getUint32(e, i);
					case 64: return this.getUint64 && this.getUint64(e, i);
				}
			}
			toString(e) {
				return this.dataView.toString(e, this.constructor.name);
			}
			ensureChunk() {}
		}
		function k(e, t) {
			m(`${e} '${t}' was not loaded, try using full build of exifr.`);
		}
		class w extends Map {
			constructor(e) {
				super(), this.kind = e;
			}
			get(e, t) {
				return this.has(e) || k(this.kind, e), t && (e in t || function(e, t) {
					m(`Unknown ${e} '${t}'.`);
				}(this.kind, e), t[e].enabled || k(this.kind, e)), super.get(e);
			}
			keyList() {
				return Array.from(this.keys());
			}
		}
		var T = new w("file parser"), A = new w("segment parser"), D = new w("file reader");
		const O = "Invalid input argument";
		function x(e, t) {
			return "string" == typeof e ? v(e, t) : i && !n && e instanceof HTMLImageElement ? v(e.src, t) : e instanceof Uint8Array || e instanceof ArrayBuffer || e instanceof DataView ? new I(e) : i && e instanceof Blob ? M(e, t, "blob", U) : void m(O);
		}
		function v(e, t) {
			return (n = e).startsWith("data:") || n.length > 1e4 ? R(e, t, "base64") : s && e.includes("://") ? M(e, t, "url", L) : s ? R(e, t, "fs") : i ? M(e, t, "url", L) : void m(O);
			var n;
		}
		async function M(e, t, i, n) {
			return D.has(i) ? R(e, t, i) : n ? async function(e, t) {
				let i = await t(e);
				return new I(i);
			}(e, n) : void m(`Parser ${i} is not loaded`);
		}
		async function R(e, t, i) {
			let n = new (D.get(i))(e, t);
			return await n.read(), n;
		}
		const L = (e) => u(e).then(((e) => e.arrayBuffer())), U = (e) => new Promise(((t, i) => {
			let n = new FileReader();
			n.onloadend = () => t(n.result || /* @__PURE__ */ new ArrayBuffer()), n.onerror = i, n.readAsArrayBuffer(e);
		}));
		class F extends Map {
			get tagKeys() {
				return this.allKeys || (this.allKeys = Array.from(this.keys())), this.allKeys;
			}
			get tagValues() {
				return this.allValues || (this.allValues = Array.from(this.values())), this.allValues;
			}
		}
		function B(e, t, i) {
			let n = new F();
			for (let [e, t] of i) n.set(e, t);
			if (Array.isArray(t)) for (let i of t) e.set(i, n);
			else e.set(t, n);
			return n;
		}
		function E(e, t, i) {
			let n, s = e.get(t);
			for (n of i) s.set(n[0], n[1]);
		}
		const N = /* @__PURE__ */ new Map(), G = /* @__PURE__ */ new Map(), V = /* @__PURE__ */ new Map(), z = 37500, H = 37510, j = 700, W = 33723, K = 34675, X = 34665, _ = 34853, Y = 40965, $ = [
			"chunked",
			"firstChunkSize",
			"firstChunkSizeNode",
			"firstChunkSizeBrowser",
			"chunkSize",
			"chunkLimit"
		], J = [
			"jfif",
			"xmp",
			"icc",
			"iptc",
			"ihdr"
		], q = ["tiff", ...J], Q = [
			"ifd0",
			"ifd1",
			"exif",
			"gps",
			"interop"
		], Z = [...q, ...Q], ee = ["makerNote", "userComment"], te = [
			"translateKeys",
			"translateValues",
			"reviveValues",
			"multiSegment"
		], ie = [
			...te,
			"sanitize",
			"mergeOutput",
			"silentErrors"
		];
		class ne {
			get translate() {
				return this.translateKeys || this.translateValues || this.reviveValues;
			}
		}
		class se extends ne {
			get needed() {
				return this.enabled || this.deps.size > 0;
			}
			constructor(e, t, i, n) {
				if (super(), f(this, "enabled", !1), f(this, "skip", /* @__PURE__ */ new Set()), f(this, "pick", /* @__PURE__ */ new Set()), f(this, "deps", /* @__PURE__ */ new Set()), f(this, "translateKeys", !1), f(this, "translateValues", !1), f(this, "reviveValues", !1), this.key = e, this.enabled = t, this.parse = this.enabled, this.applyInheritables(n), this.canBeFiltered = Q.includes(e), this.canBeFiltered && (this.dict = N.get(e)), void 0 !== i) if (Array.isArray(i)) this.parse = this.enabled = !0, this.canBeFiltered && i.length > 0 && this.translateTagSet(i, this.pick);
				else if ("object" == typeof i) {
					if (this.enabled = !0, this.parse = !1 !== i.parse, this.canBeFiltered) {
						let { pick: e, skip: t } = i;
						e && e.length > 0 && this.translateTagSet(e, this.pick), t && t.length > 0 && this.translateTagSet(t, this.skip);
					}
					this.applyInheritables(i);
				} else !0 === i || !1 === i ? this.parse = this.enabled = i : m(`Invalid options argument: ${i}`);
			}
			applyInheritables(e) {
				let t, i;
				for (t of te) i = e[t], void 0 !== i && (this[t] = i);
			}
			translateTagSet(e, t) {
				if (this.dict) {
					let i, n, { tagKeys: s, tagValues: r } = this.dict;
					for (i of e) "string" == typeof i ? (n = r.indexOf(i), -1 === n && (n = s.indexOf(Number(i))), -1 !== n && t.add(Number(s[n]))) : t.add(i);
				} else for (let i of e) t.add(i);
			}
			finalizeFilters() {
				!this.enabled && this.deps.size > 0 ? (this.enabled = !0, ue(this.pick, this.deps)) : this.enabled && this.pick.size > 0 && ue(this.pick, this.deps);
			}
		}
		var re = {
			jfif: !1,
			tiff: !0,
			xmp: !1,
			icc: !1,
			iptc: !1,
			ifd0: !0,
			ifd1: !1,
			exif: !0,
			gps: !0,
			interop: !1,
			ihdr: void 0,
			makerNote: !1,
			userComment: !1,
			multiSegment: !1,
			skip: [],
			pick: [],
			translateKeys: !0,
			translateValues: !0,
			reviveValues: !0,
			sanitize: !0,
			mergeOutput: !0,
			silentErrors: !0,
			chunked: !0,
			firstChunkSize: void 0,
			firstChunkSizeNode: 512,
			firstChunkSizeBrowser: 65536,
			chunkSize: 65536,
			chunkLimit: 5
		}, ae = /* @__PURE__ */ new Map();
		class oe extends ne {
			static useCached(e) {
				let t = ae.get(e);
				return void 0 !== t || (t = new this(e), ae.set(e, t)), t;
			}
			constructor(e) {
				super(), !0 === e ? this.setupFromTrue() : void 0 === e ? this.setupFromUndefined() : Array.isArray(e) ? this.setupFromArray(e) : "object" == typeof e ? this.setupFromObject(e) : m(`Invalid options argument ${e}`), void 0 === this.firstChunkSize && (this.firstChunkSize = i ? this.firstChunkSizeBrowser : this.firstChunkSizeNode), this.mergeOutput && (this.ifd1.enabled = !1), this.filterNestedSegmentTags(), this.traverseTiffDependencyTree(), this.checkLoadedPlugins();
			}
			setupFromUndefined() {
				let e;
				for (e of $) this[e] = re[e];
				for (e of ie) this[e] = re[e];
				for (e of ee) this[e] = re[e];
				for (e of Z) this[e] = new se(e, re[e], void 0, this);
			}
			setupFromTrue() {
				let e;
				for (e of $) this[e] = re[e];
				for (e of ie) this[e] = re[e];
				for (e of ee) this[e] = !0;
				for (e of Z) this[e] = new se(e, !0, void 0, this);
			}
			setupFromArray(e) {
				let t;
				for (t of $) this[t] = re[t];
				for (t of ie) this[t] = re[t];
				for (t of ee) this[t] = re[t];
				for (t of Z) this[t] = new se(t, !1, void 0, this);
				this.setupGlobalFilters(e, void 0, Q);
			}
			setupFromObject(e) {
				let t;
				for (t of (Q.ifd0 = Q.ifd0 || Q.image, Q.ifd1 = Q.ifd1 || Q.thumbnail, Object.assign(this, e), $)) this[t] = he(e[t], re[t]);
				for (t of ie) this[t] = he(e[t], re[t]);
				for (t of ee) this[t] = he(e[t], re[t]);
				for (t of q) this[t] = new se(t, re[t], e[t], this);
				for (t of Q) this[t] = new se(t, re[t], e[t], this.tiff);
				this.setupGlobalFilters(e.pick, e.skip, Q, Z), !0 === e.tiff ? this.batchEnableWithBool(Q, !0) : !1 === e.tiff ? this.batchEnableWithUserValue(Q, e) : Array.isArray(e.tiff) ? this.setupGlobalFilters(e.tiff, void 0, Q) : "object" == typeof e.tiff && this.setupGlobalFilters(e.tiff.pick, e.tiff.skip, Q);
			}
			batchEnableWithBool(e, t) {
				for (let i of e) this[i].enabled = t;
			}
			batchEnableWithUserValue(e, t) {
				for (let i of e) {
					let e = t[i];
					this[i].enabled = !1 !== e && void 0 !== e;
				}
			}
			setupGlobalFilters(e, t, i, n = i) {
				if (e && e.length) {
					for (let e of n) this[e].enabled = !1;
					let t = le(e, i);
					for (let [e, i] of t) ue(this[e].pick, i), this[e].enabled = !0;
				} else if (t && t.length) {
					let e = le(t, i);
					for (let [t, i] of e) ue(this[t].skip, i);
				}
			}
			filterNestedSegmentTags() {
				let { ifd0: e, exif: t, xmp: i, iptc: n, icc: s } = this;
				this.makerNote ? t.deps.add(z) : t.skip.add(z), this.userComment ? t.deps.add(H) : t.skip.add(H), i.enabled || e.skip.add(j), n.enabled || e.skip.add(W), s.enabled || e.skip.add(K);
			}
			traverseTiffDependencyTree() {
				let { ifd0: e, exif: t, gps: i, interop: n } = this;
				n.needed && (t.deps.add(Y), e.deps.add(Y)), t.needed && e.deps.add(X), i.needed && e.deps.add(_), this.tiff.enabled = Q.some(((e) => !0 === this[e].enabled)) || this.makerNote || this.userComment;
				for (let e of Q) this[e].finalizeFilters();
			}
			get onlyTiff() {
				return !J.map(((e) => this[e].enabled)).some(((e) => !0 === e)) && this.tiff.enabled;
			}
			checkLoadedPlugins() {
				for (let e of q) this[e].enabled && !A.has(e) && k("segment parser", e);
			}
		}
		function le(e, t) {
			let i, n, s, r, a = [];
			for (s of t) {
				for (r of (i = N.get(s), n = [], i)) (e.includes(r[0]) || e.includes(r[1])) && n.push(r[0]);
				n.length && a.push([s, n]);
			}
			return a;
		}
		function he(e, t) {
			return void 0 !== e ? e : void 0 !== t ? t : void 0;
		}
		function ue(e, t) {
			for (let i of t) e.add(i);
		}
		f(oe, "default", re);
		class ce {
			constructor(e) {
				f(this, "parsers", {}), f(this, "output", {}), f(this, "errors", []), f(this, "pushToErrors", ((e) => this.errors.push(e))), this.options = oe.useCached(e);
			}
			async read(e) {
				this.file = await x(e, this.options);
			}
			setup() {
				if (this.fileParser) return;
				let { file: e } = this, t = e.getUint16(0);
				for (let [i, n] of T) if (n.canHandle(e, t)) return this.fileParser = new n(this.options, this.file, this.parsers), e[i] = !0;
				this.file.close && this.file.close(), m("Unknown file format");
			}
			async parse() {
				let { output: e, errors: t } = this;
				return this.setup(), this.options.silentErrors ? (await this.executeParsers().catch(this.pushToErrors), t.push(...this.fileParser.errors)) : await this.executeParsers(), this.file.close && this.file.close(), this.options.silentErrors && t.length > 0 && (e.errors = t), d(e);
			}
			async executeParsers() {
				let { output: e } = this;
				await this.fileParser.parse();
				let t = Object.values(this.parsers).map((async (t) => {
					let i = await t.parse();
					t.assignToOutput(e, i);
				}));
				this.options.silentErrors && (t = t.map(((e) => e.catch(this.pushToErrors)))), await Promise.all(t);
			}
			async extractThumbnail() {
				this.setup();
				let { options: e, file: t } = this, i = A.get("tiff", e);
				var n;
				if (t.tiff ? n = {
					start: 0,
					type: "tiff"
				} : t.jpeg && (n = await this.fileParser.getOrFindSegment("tiff")), void 0 === n) return;
				let s = await this.fileParser.ensureSegmentChunk(n), a = await (this.parsers.tiff = new i(s, e, t)).extractThumbnail();
				return t.close && t.close(), a;
			}
		}
		async function fe(e, t) {
			let i = new ce(t);
			return await i.read(e), i.parse();
		}
		var de = Object.freeze({
			__proto__: null,
			parse: fe,
			Exifr: ce,
			fileParsers: T,
			segmentParsers: A,
			fileReaders: D,
			tagKeys: N,
			tagValues: G,
			tagRevivers: V,
			createDictionary: B,
			extendDictionary: E,
			fetchUrlAsArrayBuffer: L,
			readBlobAsArrayBuffer: U,
			chunkedProps: $,
			otherSegments: J,
			segments: q,
			tiffBlocks: Q,
			segmentsAndBlocks: Z,
			tiffExtractables: ee,
			inheritables: te,
			allFormatters: ie,
			Options: oe
		});
		class pe {
			constructor(e, t, i) {
				f(this, "errors", []), f(this, "ensureSegmentChunk", (async (e) => {
					let t = e.start, i = e.size || 65536;
					if (this.file.chunked) if (this.file.available(t, i)) e.chunk = this.file.subarray(t, i);
					else try {
						e.chunk = await this.file.readChunk(t, i);
					} catch (t) {
						m(`Couldn't read segment: ${JSON.stringify(e)}. ${t.message}`);
					}
					else this.file.byteLength > t + i ? e.chunk = this.file.subarray(t, i) : void 0 === e.size ? e.chunk = this.file.subarray(t) : m("Segment unreachable: " + JSON.stringify(e));
					return e.chunk;
				})), this.extendOptions && this.extendOptions(e), this.options = e, this.file = t, this.parsers = i;
			}
			injectSegment(e, t) {
				this.options[e].enabled && this.createParser(e, t);
			}
			createParser(e, t) {
				let i = new (A.get(e))(t, this.options, this.file);
				return this.parsers[e] = i;
			}
			createParsers(e) {
				for (let t of e) {
					let { type: e, chunk: i } = t, n = this.options[e];
					if (n && n.enabled) {
						let t = this.parsers[e];
						t && t.append || t || this.createParser(e, i);
					}
				}
			}
			async readSegments(e) {
				let t = e.map(this.ensureSegmentChunk);
				await Promise.all(t);
			}
		}
		class ge {
			static findPosition(e, t) {
				let i = e.getUint16(t + 2) + 2, n = "function" == typeof this.headerLength ? this.headerLength(e, t, i) : this.headerLength, s = t + n, r = i - n;
				return {
					offset: t,
					length: i,
					headerLength: n,
					start: s,
					size: r,
					end: s + r
				};
			}
			static parse(e, t = {}) {
				return new this(e, new oe({ [this.type]: t }), e).parse();
			}
			normalizeInput(e) {
				return e instanceof I ? e : new I(e);
			}
			constructor(e, t = {}, i) {
				f(this, "errors", []), f(this, "raw", /* @__PURE__ */ new Map()), f(this, "handleError", ((e) => {
					if (!this.options.silentErrors) throw e;
					this.errors.push(e.message);
				})), this.chunk = this.normalizeInput(e), this.file = i, this.type = this.constructor.type, this.globalOptions = this.options = t, this.localOptions = t[this.type], this.canTranslate = this.localOptions && this.localOptions.translate;
			}
			translate() {
				this.canTranslate && (this.translated = this.translateBlock(this.raw, this.type));
			}
			get output() {
				return this.translated ? this.translated : this.raw ? Object.fromEntries(this.raw) : void 0;
			}
			translateBlock(e, t) {
				let i = V.get(t), n = G.get(t), s = N.get(t), r = this.options[t], a = r.reviveValues && !!i, o = r.translateValues && !!n, l = r.translateKeys && !!s, h = {};
				for (let [t, r] of e) a && i.has(t) ? r = i.get(t)(r) : o && n.has(t) && (r = this.translateValue(r, n.get(t))), l && s.has(t) && (t = s.get(t) || t), h[t] = r;
				return h;
			}
			translateValue(e, t) {
				return t[e] || t.DEFAULT || e;
			}
			assignToOutput(e, t) {
				this.assignObjectToOutput(e, this.constructor.type, t);
			}
			assignObjectToOutput(e, t, i) {
				if (this.globalOptions.mergeOutput) return Object.assign(e, i);
				e[t] ? Object.assign(e[t], i) : e[t] = i;
			}
		}
		f(ge, "headerLength", 4), f(ge, "type", void 0), f(ge, "multiSegment", !1), f(ge, "canHandle", (() => !1));
		function me(e) {
			return 192 === e || 194 === e || 196 === e || 219 === e || 221 === e || 218 === e || 254 === e;
		}
		function Se(e) {
			return e >= 224 && e <= 239;
		}
		function Ce(e, t, i) {
			for (let [n, s] of A) if (s.canHandle(e, t, i)) return n;
		}
		class ye extends pe {
			constructor(...e) {
				super(...e), f(this, "appSegments", []), f(this, "jpegSegments", []), f(this, "unknownSegments", []);
			}
			static canHandle(e, t) {
				return 65496 === t;
			}
			async parse() {
				await this.findAppSegments(), await this.readSegments(this.appSegments), this.mergeMultiSegments(), this.createParsers(this.mergedAppSegments || this.appSegments);
			}
			setupSegmentFinderArgs(e) {
				!0 === e ? (this.findAll = !0, this.wanted = new Set(A.keyList())) : (e = void 0 === e ? A.keyList().filter(((e) => this.options[e].enabled)) : e.filter(((e) => this.options[e].enabled && A.has(e))), this.findAll = !1, this.remaining = new Set(e), this.wanted = new Set(e)), this.unfinishedMultiSegment = !1;
			}
			async findAppSegments(e = 0, t) {
				this.setupSegmentFinderArgs(t);
				let { file: i, findAll: n, wanted: s, remaining: r } = this;
				if (!n && this.file.chunked && (n = Array.from(s).some(((e) => {
					let t = A.get(e), i = this.options[e];
					return t.multiSegment && i.multiSegment;
				})), n && await this.file.readWhole()), e = this.findAppSegmentsInRange(e, i.byteLength), !this.options.onlyTiff && i.chunked) {
					let t = !1;
					for (; r.size > 0 && !t && (i.canReadNextChunk || this.unfinishedMultiSegment);) {
						let { nextChunkOffset: n } = i, s = this.appSegments.some(((e) => !this.file.available(e.offset || e.start, e.length || e.size)));
						if (t = e > n && !s ? !await i.readNextChunk(e) : !await i.readNextChunk(n), void 0 === (e = this.findAppSegmentsInRange(e, i.byteLength))) return;
					}
				}
			}
			findAppSegmentsInRange(e, t) {
				t -= 2;
				let i, n, s, r, a, o, { file: l, findAll: h, wanted: u, remaining: c, options: f } = this;
				for (; e < t; e++) if (255 === l.getUint8(e)) {
					if (i = l.getUint8(e + 1), Se(i)) {
						if (n = l.getUint16(e + 2), s = Ce(l, e, n), s && u.has(s) && (r = A.get(s), a = r.findPosition(l, e), o = f[s], a.type = s, this.appSegments.push(a), !h && (r.multiSegment && o.multiSegment ? (this.unfinishedMultiSegment = a.chunkNumber < a.chunkCount, this.unfinishedMultiSegment || c.delete(s)) : c.delete(s), 0 === c.size))) break;
						f.recordUnknownSegments && (a = ge.findPosition(l, e), a.marker = i, this.unknownSegments.push(a)), e += n + 1;
					} else if (me(i)) {
						if (n = l.getUint16(e + 2), 218 === i && !1 !== f.stopAfterSos) return;
						f.recordJpegSegments && this.jpegSegments.push({
							offset: e,
							length: n,
							marker: i
						}), e += n + 1;
					}
				}
				return e;
			}
			mergeMultiSegments() {
				if (!this.appSegments.some(((e) => e.multiSegment))) return;
				let e = function(e, t) {
					let i, n, s, r = /* @__PURE__ */ new Map();
					for (let a = 0; a < e.length; a++) i = e[a], n = i[t], r.has(n) ? s = r.get(n) : r.set(n, s = []), s.push(i);
					return Array.from(r);
				}(this.appSegments, "type");
				this.mergedAppSegments = e.map((([e, t]) => {
					let i = A.get(e, this.options);
					if (i.handleMultiSegments) return {
						type: e,
						chunk: i.handleMultiSegments(t)
					};
					return t[0];
				}));
			}
			getSegment(e) {
				return this.appSegments.find(((t) => t.type === e));
			}
			async getOrFindSegment(e) {
				let t = this.getSegment(e);
				return void 0 === t && (await this.findAppSegments(0, [e]), t = this.getSegment(e)), t;
			}
		}
		f(ye, "type", "jpeg"), T.set("jpeg", ye);
		const be = [
			void 0,
			1,
			1,
			2,
			4,
			8,
			1,
			1,
			2,
			4,
			8,
			4,
			8,
			4
		];
		class Pe extends ge {
			parseHeader() {
				var e = this.chunk.getUint16();
				18761 === e ? this.le = !0 : 19789 === e && (this.le = !1), this.chunk.le = this.le, this.headerParsed = !0;
			}
			parseTags(e, t, i = /* @__PURE__ */ new Map()) {
				let { pick: n, skip: s } = this.options[t];
				n = new Set(n);
				let r = n.size > 0, a = 0 === s.size, o = this.chunk.getUint16(e);
				e += 2;
				for (let l = 0; l < o; l++) {
					let o = this.chunk.getUint16(e);
					if (r) {
						if (n.has(o) && (i.set(o, this.parseTag(e, o, t)), n.delete(o), 0 === n.size)) break;
					} else !a && s.has(o) || i.set(o, this.parseTag(e, o, t));
					e += 12;
				}
				return i;
			}
			parseTag(e, t, i) {
				let { chunk: n } = this, s = n.getUint16(e + 2), r = n.getUint32(e + 4), a = be[s];
				if (a * r <= 4 ? e += 8 : e = n.getUint32(e + 8), (s < 1 || s > 13) && m(`Invalid TIFF value type. block: ${i.toUpperCase()}, tag: ${t.toString(16)}, type: ${s}, offset ${e}`), e > n.byteLength && m(`Invalid TIFF value offset. block: ${i.toUpperCase()}, tag: ${t.toString(16)}, type: ${s}, offset ${e} is outside of chunk size ${n.byteLength}`), 1 === s) return n.getUint8Array(e, r);
				if (2 === s) return S(n.getString(e, r));
				if (7 === s) return n.getUint8Array(e, r);
				if (1 === r) return this.parseTagValue(s, e);
				{
					let t = new (function(e) {
						switch (e) {
							case 1: return Uint8Array;
							case 3: return Uint16Array;
							case 4: return Uint32Array;
							case 5: return Array;
							case 6: return Int8Array;
							case 8: return Int16Array;
							case 9: return Int32Array;
							case 10: return Array;
							case 11: return Float32Array;
							case 12: return Float64Array;
							default: return Array;
						}
					}(s))(r), i = a;
					for (let n = 0; n < r; n++) t[n] = this.parseTagValue(s, e), e += i;
					return t;
				}
			}
			parseTagValue(e, t) {
				let { chunk: i } = this;
				switch (e) {
					case 1: return i.getUint8(t);
					case 3: return i.getUint16(t);
					case 4: return i.getUint32(t);
					case 5: return i.getUint32(t) / i.getUint32(t + 4);
					case 6: return i.getInt8(t);
					case 8: return i.getInt16(t);
					case 9: return i.getInt32(t);
					case 10: return i.getInt32(t) / i.getInt32(t + 4);
					case 11: return i.getFloat(t);
					case 12: return i.getDouble(t);
					case 13: return i.getUint32(t);
					default: m(`Invalid tiff type ${e}`);
				}
			}
		}
		class Ie extends Pe {
			static canHandle(e, t) {
				return 225 === e.getUint8(t + 1) && 1165519206 === e.getUint32(t + 4) && 0 === e.getUint16(t + 8);
			}
			async parse() {
				this.parseHeader();
				let { options: e } = this;
				return e.ifd0.enabled && await this.parseIfd0Block(), e.exif.enabled && await this.safeParse("parseExifBlock"), e.gps.enabled && await this.safeParse("parseGpsBlock"), e.interop.enabled && await this.safeParse("parseInteropBlock"), e.ifd1.enabled && await this.safeParse("parseThumbnailBlock"), this.createOutput();
			}
			safeParse(e) {
				let t = this[e]();
				return void 0 !== t.catch && (t = t.catch(this.handleError)), t;
			}
			findIfd0Offset() {
				void 0 === this.ifd0Offset && (this.ifd0Offset = this.chunk.getUint32(4));
			}
			findIfd1Offset() {
				if (void 0 === this.ifd1Offset) {
					this.findIfd0Offset();
					let e = this.chunk.getUint16(this.ifd0Offset), t = this.ifd0Offset + 2 + 12 * e;
					this.ifd1Offset = this.chunk.getUint32(t);
				}
			}
			parseBlock(e, t) {
				let i = /* @__PURE__ */ new Map();
				return this[t] = i, this.parseTags(e, t, i), i;
			}
			async parseIfd0Block() {
				if (this.ifd0) return;
				let { file: e } = this;
				this.findIfd0Offset(), this.ifd0Offset < 8 && m("Malformed EXIF data"), !e.chunked && this.ifd0Offset > e.byteLength && m(`IFD0 offset points to outside of file.\nthis.ifd0Offset: ${this.ifd0Offset}, file.byteLength: ${e.byteLength}`), e.tiff && await e.ensureChunk(this.ifd0Offset, C(this.options));
				let t = this.parseBlock(this.ifd0Offset, "ifd0");
				return 0 !== t.size ? (this.exifOffset = t.get(X), this.interopOffset = t.get(Y), this.gpsOffset = t.get(_), this.xmp = t.get(j), this.iptc = t.get(W), this.icc = t.get(K), this.options.sanitize && (t.delete(X), t.delete(Y), t.delete(_), t.delete(j), t.delete(W), t.delete(K)), t) : void 0;
			}
			async parseExifBlock() {
				if (this.exif) return;
				if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.exifOffset) return;
				this.file.tiff && await this.file.ensureChunk(this.exifOffset, C(this.options));
				let e = this.parseBlock(this.exifOffset, "exif");
				return this.interopOffset || (this.interopOffset = e.get(Y)), this.makerNote = e.get(z), this.userComment = e.get(H), this.options.sanitize && (e.delete(Y), e.delete(z), e.delete(H)), this.unpack(e, 41728), this.unpack(e, 41729), e;
			}
			unpack(e, t) {
				let i = e.get(t);
				i && 1 === i.length && e.set(t, i[0]);
			}
			async parseGpsBlock() {
				if (this.gps) return;
				if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.gpsOffset) return;
				let e = this.parseBlock(this.gpsOffset, "gps");
				return e && e.has(2) && e.has(4) && (e.set("latitude", ke(...e.get(2), e.get(1))), e.set("longitude", ke(...e.get(4), e.get(3)))), e;
			}
			async parseInteropBlock() {
				if (!this.interop && (this.ifd0 || await this.parseIfd0Block(), void 0 !== this.interopOffset || this.exif || await this.parseExifBlock(), void 0 !== this.interopOffset)) return this.parseBlock(this.interopOffset, "interop");
			}
			async parseThumbnailBlock(e = !1) {
				if (!this.ifd1 && !this.ifd1Parsed && (!this.options.mergeOutput || e)) return this.findIfd1Offset(), this.ifd1Offset > 0 && (this.parseBlock(this.ifd1Offset, "ifd1"), this.ifd1Parsed = !0), this.ifd1;
			}
			async extractThumbnail() {
				if (this.headerParsed || this.parseHeader(), this.ifd1Parsed || await this.parseThumbnailBlock(!0), void 0 === this.ifd1) return;
				let e = this.ifd1.get(513), t = this.ifd1.get(514);
				return this.chunk.getUint8Array(e, t);
			}
			get image() {
				return this.ifd0;
			}
			get thumbnail() {
				return this.ifd1;
			}
			createOutput() {
				let e, t, i, n = {};
				for (t of Q) if (e = this[t], !g(e)) if (i = this.canTranslate ? this.translateBlock(e, t) : Object.fromEntries(e), this.options.mergeOutput) {
					if ("ifd1" === t) continue;
					Object.assign(n, i);
				} else n[t] = i;
				return this.makerNote && (n.makerNote = this.makerNote), this.userComment && (n.userComment = this.userComment), n;
			}
			assignToOutput(e, t) {
				if (this.globalOptions.mergeOutput) Object.assign(e, t);
				else for (let [i, n] of Object.entries(t)) this.assignObjectToOutput(e, i, n);
			}
		}
		function ke(e, t, i, n) {
			var s = e + t / 60 + i / 3600;
			return "S" !== n && "W" !== n || (s *= -1), s;
		}
		f(Ie, "type", "tiff"), f(Ie, "headerLength", 10), A.set("tiff", Ie);
		var we = Object.freeze({
			__proto__: null,
			default: de,
			Exifr: ce,
			fileParsers: T,
			segmentParsers: A,
			fileReaders: D,
			tagKeys: N,
			tagValues: G,
			tagRevivers: V,
			createDictionary: B,
			extendDictionary: E,
			fetchUrlAsArrayBuffer: L,
			readBlobAsArrayBuffer: U,
			chunkedProps: $,
			otherSegments: J,
			segments: q,
			tiffBlocks: Q,
			segmentsAndBlocks: Z,
			tiffExtractables: ee,
			inheritables: te,
			allFormatters: ie,
			Options: oe,
			parse: fe
		});
		const Te = {
			ifd0: !1,
			ifd1: !1,
			exif: !1,
			gps: !1,
			interop: !1,
			sanitize: !1,
			reviveValues: !0,
			translateKeys: !1,
			translateValues: !1,
			mergeOutput: !1
		}, Ae = Object.assign({}, Te, {
			firstChunkSize: 4e4,
			gps: [
				1,
				2,
				3,
				4
			]
		});
		async function De(e) {
			let t = new ce(Ae);
			await t.read(e);
			let i = await t.parse();
			if (i && i.gps) {
				let { latitude: e, longitude: t } = i.gps;
				return {
					latitude: e,
					longitude: t
				};
			}
		}
		const Oe = Object.assign({}, Te, {
			tiff: !1,
			ifd1: !0,
			mergeOutput: !1
		});
		async function xe(e) {
			let t = new ce(Oe);
			await t.read(e);
			let i = await t.extractThumbnail();
			return i && o ? r.from(i) : i;
		}
		async function ve(e) {
			let t = await this.thumbnail(e);
			if (void 0 !== t) {
				let e = new Blob([t]);
				return URL.createObjectURL(e);
			}
		}
		const Me = Object.assign({}, Te, {
			firstChunkSize: 4e4,
			ifd0: [274]
		});
		async function Re(e) {
			let t = new ce(Me);
			await t.read(e);
			let i = await t.parse();
			if (i && i.ifd0) return i.ifd0[274];
		}
		const Le = Object.freeze({
			1: {
				dimensionSwapped: !1,
				scaleX: 1,
				scaleY: 1,
				deg: 0,
				rad: 0
			},
			2: {
				dimensionSwapped: !1,
				scaleX: -1,
				scaleY: 1,
				deg: 0,
				rad: 0
			},
			3: {
				dimensionSwapped: !1,
				scaleX: 1,
				scaleY: 1,
				deg: 180,
				rad: 180 * Math.PI / 180
			},
			4: {
				dimensionSwapped: !1,
				scaleX: -1,
				scaleY: 1,
				deg: 180,
				rad: 180 * Math.PI / 180
			},
			5: {
				dimensionSwapped: !0,
				scaleX: 1,
				scaleY: -1,
				deg: 90,
				rad: 90 * Math.PI / 180
			},
			6: {
				dimensionSwapped: !0,
				scaleX: 1,
				scaleY: 1,
				deg: 90,
				rad: 90 * Math.PI / 180
			},
			7: {
				dimensionSwapped: !0,
				scaleX: 1,
				scaleY: -1,
				deg: 270,
				rad: 270 * Math.PI / 180
			},
			8: {
				dimensionSwapped: !0,
				scaleX: 1,
				scaleY: 1,
				deg: 270,
				rad: 270 * Math.PI / 180
			}
		});
		if (e.rotateCanvas = !0, e.rotateCss = !0, "object" == typeof navigator) {
			let t = navigator.userAgent;
			if (t.includes("iPad") || t.includes("iPhone")) {
				let i = t.match(/OS (\d+)_(\d+)/);
				if (i) {
					let [, t, n] = i;
					e.rotateCanvas = Number(t) + .1 * Number(n) < 13.4, e.rotateCss = !1;
				}
			} else if (t.includes("OS X 10")) {
				let [, i] = t.match(/OS X 10[_.](\d+)/);
				e.rotateCanvas = e.rotateCss = Number(i) < 15;
			}
			if (t.includes("Chrome/")) {
				let [, i] = t.match(/Chrome\/(\d+)/);
				e.rotateCanvas = e.rotateCss = Number(i) < 81;
			} else if (t.includes("Firefox/")) {
				let [, i] = t.match(/Firefox\/(\d+)/);
				e.rotateCanvas = e.rotateCss = Number(i) < 77;
			}
		}
		async function Ue(t) {
			let i = await Re(t);
			return Object.assign({
				canvas: e.rotateCanvas,
				css: e.rotateCss
			}, Le[i]);
		}
		class Fe extends I {
			constructor(...e) {
				super(...e), f(this, "ranges", new Be()), 0 !== this.byteLength && this.ranges.add(0, this.byteLength);
			}
			_tryExtend(e, t, i) {
				if (0 === e && 0 === this.byteLength && i) {
					let e = new DataView(i.buffer || i, i.byteOffset, i.byteLength);
					this._swapDataView(e);
				} else {
					let i = e + t;
					if (i > this.byteLength) {
						let { dataView: e } = this._extend(i);
						this._swapDataView(e);
					}
				}
			}
			_extend(e) {
				let t;
				t = o ? r.allocUnsafe(e) : new Uint8Array(e);
				let i = new DataView(t.buffer, t.byteOffset, t.byteLength);
				return t.set(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), 0), {
					uintView: t,
					dataView: i
				};
			}
			subarray(e, t, i = !1) {
				return t = t || this._lengthToEnd(e), i && this._tryExtend(e, t), this.ranges.add(e, t), super.subarray(e, t);
			}
			set(e, t, i = !1) {
				i && this._tryExtend(t, e.byteLength, e);
				let n = super.set(e, t);
				return this.ranges.add(t, n.byteLength), n;
			}
			async ensureChunk(e, t) {
				this.chunked && (this.ranges.available(e, t) || await this.readChunk(e, t));
			}
			available(e, t) {
				return this.ranges.available(e, t);
			}
		}
		class Be {
			constructor() {
				f(this, "list", []);
			}
			get length() {
				return this.list.length;
			}
			add(e, t, i = 0) {
				let n = e + t, s = this.list.filter(((t) => Ee(e, t.offset, n) || Ee(e, t.end, n)));
				if (s.length > 0) {
					e = Math.min(e, ...s.map(((e) => e.offset))), n = Math.max(n, ...s.map(((e) => e.end))), t = n - e;
					let i = s.shift();
					i.offset = e, i.length = t, i.end = n, this.list = this.list.filter(((e) => !s.includes(e)));
				} else this.list.push({
					offset: e,
					length: t,
					end: n
				});
			}
			available(e, t) {
				let i = e + t;
				return this.list.some(((t) => t.offset <= e && i <= t.end));
			}
		}
		function Ee(e, t, i) {
			return e <= t && t <= i;
		}
		class Ne extends Fe {
			constructor(e, t) {
				super(0), f(this, "chunksRead", 0), this.input = e, this.options = t;
			}
			async readWhole() {
				this.chunked = !1, await this.readChunk(this.nextChunkOffset);
			}
			async readChunked() {
				this.chunked = !0, await this.readChunk(0, this.options.firstChunkSize);
			}
			async readNextChunk(e = this.nextChunkOffset) {
				if (this.fullyRead) return this.chunksRead++, !1;
				let t = this.options.chunkSize, i = await this.readChunk(e, t);
				return !!i && i.byteLength === t;
			}
			async readChunk(e, t) {
				if (this.chunksRead++, 0 !== (t = this.safeWrapAddress(e, t))) return this._readChunk(e, t);
			}
			safeWrapAddress(e, t) {
				return void 0 !== this.size && e + t > this.size ? Math.max(0, this.size - e) : t;
			}
			get nextChunkOffset() {
				if (0 !== this.ranges.list.length) return this.ranges.list[0].length;
			}
			get canReadNextChunk() {
				return this.chunksRead < this.options.chunkLimit;
			}
			get fullyRead() {
				return void 0 !== this.size && this.nextChunkOffset === this.size;
			}
			read() {
				return this.options.chunked ? this.readChunked() : this.readWhole();
			}
			close() {}
		}
		D.set("blob", class extends Ne {
			async readWhole() {
				this.chunked = !1;
				let e = await U(this.input);
				this._swapArrayBuffer(e);
			}
			readChunked() {
				return this.chunked = !0, this.size = this.input.size, super.readChunked();
			}
			async _readChunk(e, t) {
				let i = t ? e + t : void 0, n = this.input.slice(e, i), s = await U(n);
				return this.set(s, e, !0);
			}
		});
		var Ge = Object.freeze({
			__proto__: null,
			default: we,
			Exifr: ce,
			fileParsers: T,
			segmentParsers: A,
			fileReaders: D,
			tagKeys: N,
			tagValues: G,
			tagRevivers: V,
			createDictionary: B,
			extendDictionary: E,
			fetchUrlAsArrayBuffer: L,
			readBlobAsArrayBuffer: U,
			chunkedProps: $,
			otherSegments: J,
			segments: q,
			tiffBlocks: Q,
			segmentsAndBlocks: Z,
			tiffExtractables: ee,
			inheritables: te,
			allFormatters: ie,
			Options: oe,
			parse: fe,
			gpsOnlyOptions: Ae,
			gps: De,
			thumbnailOnlyOptions: Oe,
			thumbnail: xe,
			thumbnailUrl: ve,
			orientationOnlyOptions: Me,
			orientation: Re,
			rotations: Le,
			get rotateCanvas() {
				return e.rotateCanvas;
			},
			get rotateCss() {
				return e.rotateCss;
			},
			rotation: Ue
		});
		D.set("url", class extends Ne {
			async readWhole() {
				this.chunked = !1;
				let e = await L(this.input);
				e instanceof ArrayBuffer ? this._swapArrayBuffer(e) : e instanceof Uint8Array && this._swapBuffer(e);
			}
			async _readChunk(e, t) {
				let i = t ? e + t - 1 : void 0, n = this.options.httpHeaders || {};
				(e || i) && (n.range = `bytes=${[e, i].join("-")}`);
				let s = await u(this.input, { headers: n }), r = await s.arrayBuffer(), a = r.byteLength;
				if (416 !== s.status) return a !== t && (this.size = e + a), this.set(r, e, !0);
			}
		});
		I.prototype.getUint64 = function(e) {
			let t = this.getUint32(e), i = this.getUint32(e + 4);
			return t < 1048575 ? t << 32 | i : (console.warn("Using BigInt because of type 64uint but JS can only handle 53b numbers."), a(t) << a(32) | a(i));
		};
		class Ve extends pe {
			parseBoxes(e = 0) {
				let t = [];
				for (; e < this.file.byteLength - 4;) {
					let i = this.parseBoxHead(e);
					if (t.push(i), 0 === i.length) break;
					e += i.length;
				}
				return t;
			}
			parseSubBoxes(e) {
				e.boxes = this.parseBoxes(e.start);
			}
			findBox(e, t) {
				return void 0 === e.boxes && this.parseSubBoxes(e), e.boxes.find(((e) => e.kind === t));
			}
			parseBoxHead(e) {
				let t = this.file.getUint32(e), i = this.file.getString(e + 4, 4), n = e + 8;
				return 1 === t && (t = this.file.getUint64(e + 8), n += 8), {
					offset: e,
					length: t,
					kind: i,
					start: n
				};
			}
			parseBoxFullHead(e) {
				if (void 0 !== e.version) return;
				e.version = this.file.getUint32(e.start) >> 24, e.start += 4;
			}
		}
		class ze extends Ve {
			static canHandle(e, t) {
				if (0 !== t) return !1;
				let i = e.getUint16(2);
				if (i > 50) return !1;
				let n = 16, s = [];
				for (; n < i;) s.push(e.getString(n, 4)), n += 4;
				return s.includes(this.type);
			}
			async parse() {
				let e = this.file.getUint32(0), t = this.parseBoxHead(e);
				for (; "meta" !== t.kind;) e += t.length, await this.file.ensureChunk(e, 16), t = this.parseBoxHead(e);
				await this.file.ensureChunk(t.offset, t.length), this.parseBoxFullHead(t), this.parseSubBoxes(t), this.options.icc.enabled && await this.findIcc(t), this.options.tiff.enabled && await this.findExif(t);
			}
			async registerSegment(e, t, i) {
				await this.file.ensureChunk(t, i);
				let n = this.file.subarray(t, i);
				this.createParser(e, n);
			}
			async findIcc(e) {
				let t = this.findBox(e, "iprp");
				if (void 0 === t) return;
				let i = this.findBox(t, "ipco");
				if (void 0 === i) return;
				let n = this.findBox(i, "colr");
				void 0 !== n && await this.registerSegment("icc", n.offset + 12, n.length);
			}
			async findExif(e) {
				let t = this.findBox(e, "iinf");
				if (void 0 === t) return;
				let i = this.findBox(e, "iloc");
				if (void 0 === i) return;
				let n = this.findExifLocIdInIinf(t), s = this.findExtentInIloc(i, n);
				if (void 0 === s) return;
				let [r, a] = s;
				await this.file.ensureChunk(r, a);
				let o = 4 + this.file.getUint32(r);
				r += o, a -= o, await this.registerSegment("tiff", r, a);
			}
			findExifLocIdInIinf(e) {
				this.parseBoxFullHead(e);
				let t, i, n, s, r = e.start, a = this.file.getUint16(r);
				for (r += 2; a--;) {
					if (t = this.parseBoxHead(r), this.parseBoxFullHead(t), i = t.start, t.version >= 2 && (n = 3 === t.version ? 4 : 2, s = this.file.getString(i + n + 2, 4), "Exif" === s)) return this.file.getUintBytes(i, n);
					r += t.length;
				}
			}
			get8bits(e) {
				let t = this.file.getUint8(e);
				return [t >> 4, 15 & t];
			}
			findExtentInIloc(e, t) {
				this.parseBoxFullHead(e);
				let i = e.start, [n, s] = this.get8bits(i++), [r, a] = this.get8bits(i++), o = 2 === e.version ? 4 : 2, l = 1 === e.version || 2 === e.version ? 2 : 0, h = a + n + s, u = 2 === e.version ? 4 : 2, c = this.file.getUintBytes(i, u);
				for (i += u; c--;) {
					let e = this.file.getUintBytes(i, o);
					i += o + l + 2 + r;
					let u = this.file.getUint16(i);
					if (i += 2, e === t) return u > 1 && console.warn("ILOC box has more than one extent but we're only processing one\nPlease create an issue at https://github.com/MikeKovarik/exifr with this file"), [this.file.getUintBytes(i + a, n), this.file.getUintBytes(i + a + n, s)];
					i += u * h;
				}
			}
		}
		class He extends ze {}
		f(He, "type", "heic");
		class je extends ze {}
		f(je, "type", "avif"), T.set("heic", He), T.set("avif", je), B(N, ["ifd0", "ifd1"], [
			[256, "ImageWidth"],
			[257, "ImageHeight"],
			[258, "BitsPerSample"],
			[259, "Compression"],
			[262, "PhotometricInterpretation"],
			[270, "ImageDescription"],
			[271, "Make"],
			[272, "Model"],
			[273, "StripOffsets"],
			[274, "Orientation"],
			[277, "SamplesPerPixel"],
			[278, "RowsPerStrip"],
			[279, "StripByteCounts"],
			[282, "XResolution"],
			[283, "YResolution"],
			[284, "PlanarConfiguration"],
			[296, "ResolutionUnit"],
			[301, "TransferFunction"],
			[305, "Software"],
			[306, "ModifyDate"],
			[315, "Artist"],
			[316, "HostComputer"],
			[317, "Predictor"],
			[318, "WhitePoint"],
			[319, "PrimaryChromaticities"],
			[513, "ThumbnailOffset"],
			[514, "ThumbnailLength"],
			[529, "YCbCrCoefficients"],
			[530, "YCbCrSubSampling"],
			[531, "YCbCrPositioning"],
			[532, "ReferenceBlackWhite"],
			[700, "ApplicationNotes"],
			[33432, "Copyright"],
			[33723, "IPTC"],
			[34665, "ExifIFD"],
			[34675, "ICC"],
			[34853, "GpsIFD"],
			[330, "SubIFD"],
			[40965, "InteropIFD"],
			[40091, "XPTitle"],
			[40092, "XPComment"],
			[40093, "XPAuthor"],
			[40094, "XPKeywords"],
			[40095, "XPSubject"]
		]), B(N, "exif", [
			[33434, "ExposureTime"],
			[33437, "FNumber"],
			[34850, "ExposureProgram"],
			[34852, "SpectralSensitivity"],
			[34855, "ISO"],
			[34858, "TimeZoneOffset"],
			[34859, "SelfTimerMode"],
			[34864, "SensitivityType"],
			[34865, "StandardOutputSensitivity"],
			[34866, "RecommendedExposureIndex"],
			[34867, "ISOSpeed"],
			[34868, "ISOSpeedLatitudeyyy"],
			[34869, "ISOSpeedLatitudezzz"],
			[36864, "ExifVersion"],
			[36867, "DateTimeOriginal"],
			[36868, "CreateDate"],
			[36873, "GooglePlusUploadCode"],
			[36880, "OffsetTime"],
			[36881, "OffsetTimeOriginal"],
			[36882, "OffsetTimeDigitized"],
			[37121, "ComponentsConfiguration"],
			[37122, "CompressedBitsPerPixel"],
			[37377, "ShutterSpeedValue"],
			[37378, "ApertureValue"],
			[37379, "BrightnessValue"],
			[37380, "ExposureCompensation"],
			[37381, "MaxApertureValue"],
			[37382, "SubjectDistance"],
			[37383, "MeteringMode"],
			[37384, "LightSource"],
			[37385, "Flash"],
			[37386, "FocalLength"],
			[37393, "ImageNumber"],
			[37394, "SecurityClassification"],
			[37395, "ImageHistory"],
			[37396, "SubjectArea"],
			[37500, "MakerNote"],
			[37510, "UserComment"],
			[37520, "SubSecTime"],
			[37521, "SubSecTimeOriginal"],
			[37522, "SubSecTimeDigitized"],
			[37888, "AmbientTemperature"],
			[37889, "Humidity"],
			[37890, "Pressure"],
			[37891, "WaterDepth"],
			[37892, "Acceleration"],
			[37893, "CameraElevationAngle"],
			[40960, "FlashpixVersion"],
			[40961, "ColorSpace"],
			[40962, "ExifImageWidth"],
			[40963, "ExifImageHeight"],
			[40964, "RelatedSoundFile"],
			[41483, "FlashEnergy"],
			[41486, "FocalPlaneXResolution"],
			[41487, "FocalPlaneYResolution"],
			[41488, "FocalPlaneResolutionUnit"],
			[41492, "SubjectLocation"],
			[41493, "ExposureIndex"],
			[41495, "SensingMethod"],
			[41728, "FileSource"],
			[41729, "SceneType"],
			[41730, "CFAPattern"],
			[41985, "CustomRendered"],
			[41986, "ExposureMode"],
			[41987, "WhiteBalance"],
			[41988, "DigitalZoomRatio"],
			[41989, "FocalLengthIn35mmFormat"],
			[41990, "SceneCaptureType"],
			[41991, "GainControl"],
			[41992, "Contrast"],
			[41993, "Saturation"],
			[41994, "Sharpness"],
			[41996, "SubjectDistanceRange"],
			[42016, "ImageUniqueID"],
			[42032, "OwnerName"],
			[42033, "SerialNumber"],
			[42034, "LensInfo"],
			[42035, "LensMake"],
			[42036, "LensModel"],
			[42037, "LensSerialNumber"],
			[42080, "CompositeImage"],
			[42081, "CompositeImageCount"],
			[42082, "CompositeImageExposureTimes"],
			[42240, "Gamma"],
			[59932, "Padding"],
			[59933, "OffsetSchema"],
			[65e3, "OwnerName"],
			[65001, "SerialNumber"],
			[65002, "Lens"],
			[65100, "RawFile"],
			[65101, "Converter"],
			[65102, "WhiteBalance"],
			[65105, "Exposure"],
			[65106, "Shadows"],
			[65107, "Brightness"],
			[65108, "Contrast"],
			[65109, "Saturation"],
			[65110, "Sharpness"],
			[65111, "Smoothness"],
			[65112, "MoireFilter"],
			[40965, "InteropIFD"]
		]), B(N, "gps", [
			[0, "GPSVersionID"],
			[1, "GPSLatitudeRef"],
			[2, "GPSLatitude"],
			[3, "GPSLongitudeRef"],
			[4, "GPSLongitude"],
			[5, "GPSAltitudeRef"],
			[6, "GPSAltitude"],
			[7, "GPSTimeStamp"],
			[8, "GPSSatellites"],
			[9, "GPSStatus"],
			[10, "GPSMeasureMode"],
			[11, "GPSDOP"],
			[12, "GPSSpeedRef"],
			[13, "GPSSpeed"],
			[14, "GPSTrackRef"],
			[15, "GPSTrack"],
			[16, "GPSImgDirectionRef"],
			[17, "GPSImgDirection"],
			[18, "GPSMapDatum"],
			[19, "GPSDestLatitudeRef"],
			[20, "GPSDestLatitude"],
			[21, "GPSDestLongitudeRef"],
			[22, "GPSDestLongitude"],
			[23, "GPSDestBearingRef"],
			[24, "GPSDestBearing"],
			[25, "GPSDestDistanceRef"],
			[26, "GPSDestDistance"],
			[27, "GPSProcessingMethod"],
			[28, "GPSAreaInformation"],
			[29, "GPSDateStamp"],
			[30, "GPSDifferential"],
			[31, "GPSHPositioningError"]
		]), B(G, ["ifd0", "ifd1"], [[274, {
			1: "Horizontal (normal)",
			2: "Mirror horizontal",
			3: "Rotate 180",
			4: "Mirror vertical",
			5: "Mirror horizontal and rotate 270 CW",
			6: "Rotate 90 CW",
			7: "Mirror horizontal and rotate 90 CW",
			8: "Rotate 270 CW"
		}], [296, {
			1: "None",
			2: "inches",
			3: "cm"
		}]]);
		let We = B(G, "exif", [
			[34850, {
				0: "Not defined",
				1: "Manual",
				2: "Normal program",
				3: "Aperture priority",
				4: "Shutter priority",
				5: "Creative program",
				6: "Action program",
				7: "Portrait mode",
				8: "Landscape mode"
			}],
			[37121, {
				0: "-",
				1: "Y",
				2: "Cb",
				3: "Cr",
				4: "R",
				5: "G",
				6: "B"
			}],
			[37383, {
				0: "Unknown",
				1: "Average",
				2: "CenterWeightedAverage",
				3: "Spot",
				4: "MultiSpot",
				5: "Pattern",
				6: "Partial",
				255: "Other"
			}],
			[37384, {
				0: "Unknown",
				1: "Daylight",
				2: "Fluorescent",
				3: "Tungsten (incandescent light)",
				4: "Flash",
				9: "Fine weather",
				10: "Cloudy weather",
				11: "Shade",
				12: "Daylight fluorescent (D 5700 - 7100K)",
				13: "Day white fluorescent (N 4600 - 5400K)",
				14: "Cool white fluorescent (W 3900 - 4500K)",
				15: "White fluorescent (WW 3200 - 3700K)",
				17: "Standard light A",
				18: "Standard light B",
				19: "Standard light C",
				20: "D55",
				21: "D65",
				22: "D75",
				23: "D50",
				24: "ISO studio tungsten",
				255: "Other"
			}],
			[37385, {
				0: "Flash did not fire",
				1: "Flash fired",
				5: "Strobe return light not detected",
				7: "Strobe return light detected",
				9: "Flash fired, compulsory flash mode",
				13: "Flash fired, compulsory flash mode, return light not detected",
				15: "Flash fired, compulsory flash mode, return light detected",
				16: "Flash did not fire, compulsory flash mode",
				24: "Flash did not fire, auto mode",
				25: "Flash fired, auto mode",
				29: "Flash fired, auto mode, return light not detected",
				31: "Flash fired, auto mode, return light detected",
				32: "No flash function",
				65: "Flash fired, red-eye reduction mode",
				69: "Flash fired, red-eye reduction mode, return light not detected",
				71: "Flash fired, red-eye reduction mode, return light detected",
				73: "Flash fired, compulsory flash mode, red-eye reduction mode",
				77: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
				79: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
				89: "Flash fired, auto mode, red-eye reduction mode",
				93: "Flash fired, auto mode, return light not detected, red-eye reduction mode",
				95: "Flash fired, auto mode, return light detected, red-eye reduction mode"
			}],
			[41495, {
				1: "Not defined",
				2: "One-chip color area sensor",
				3: "Two-chip color area sensor",
				4: "Three-chip color area sensor",
				5: "Color sequential area sensor",
				7: "Trilinear sensor",
				8: "Color sequential linear sensor"
			}],
			[41728, {
				1: "Film Scanner",
				2: "Reflection Print Scanner",
				3: "Digital Camera"
			}],
			[41729, { 1: "Directly photographed" }],
			[41985, {
				0: "Normal",
				1: "Custom",
				2: "HDR (no original saved)",
				3: "HDR (original saved)",
				4: "Original (for HDR)",
				6: "Panorama",
				7: "Portrait HDR",
				8: "Portrait"
			}],
			[41986, {
				0: "Auto",
				1: "Manual",
				2: "Auto bracket"
			}],
			[41987, {
				0: "Auto",
				1: "Manual"
			}],
			[41990, {
				0: "Standard",
				1: "Landscape",
				2: "Portrait",
				3: "Night",
				4: "Other"
			}],
			[41991, {
				0: "None",
				1: "Low gain up",
				2: "High gain up",
				3: "Low gain down",
				4: "High gain down"
			}],
			[41996, {
				0: "Unknown",
				1: "Macro",
				2: "Close",
				3: "Distant"
			}],
			[42080, {
				0: "Unknown",
				1: "Not a Composite Image",
				2: "General Composite Image",
				3: "Composite Image Captured While Shooting"
			}]
		]);
		const Ke = {
			1: "No absolute unit of measurement",
			2: "Inch",
			3: "Centimeter"
		};
		We.set(37392, Ke), We.set(41488, Ke);
		const Xe = {
			0: "Normal",
			1: "Low",
			2: "High"
		};
		function _e(e) {
			return "object" == typeof e && void 0 !== e.length ? e[0] : e;
		}
		function Ye(e) {
			let t = Array.from(e).slice(1);
			return t[1] > 15 && (t = t.map(((e) => String.fromCharCode(e)))), "0" !== t[2] && 0 !== t[2] || t.pop(), t.join(".");
		}
		function $e(e) {
			if ("string" == typeof e) {
				var [t, i, n, s, r, a] = e.trim().split(/[-: ]/g).map(Number), o = new Date(t, i - 1, n);
				return Number.isNaN(s) || Number.isNaN(r) || Number.isNaN(a) || (o.setHours(s), o.setMinutes(r), o.setSeconds(a)), Number.isNaN(+o) ? e : o;
			}
		}
		function Je(e) {
			if ("string" == typeof e) return e;
			let t = [];
			if (0 === e[1] && 0 === e[e.length - 1]) for (let i = 0; i < e.length; i += 2) t.push(qe(e[i + 1], e[i]));
			else for (let i = 0; i < e.length; i += 2) t.push(qe(e[i], e[i + 1]));
			return S(String.fromCodePoint(...t));
		}
		function qe(e, t) {
			return e << 8 | t;
		}
		We.set(41992, Xe), We.set(41993, Xe), We.set(41994, Xe), B(V, ["ifd0", "ifd1"], [
			[50827, function(e) {
				return "string" != typeof e ? P(e) : e;
			}],
			[306, $e],
			[40091, Je],
			[40092, Je],
			[40093, Je],
			[40094, Je],
			[40095, Je]
		]), B(V, "exif", [
			[40960, Ye],
			[36864, Ye],
			[36867, $e],
			[36868, $e],
			[40962, _e],
			[40963, _e]
		]), B(V, "gps", [[0, (e) => Array.from(e).join(".")], [7, (e) => Array.from(e).join(":")]]);
		const Qe = "http://ns.adobe.com/", Ze = "http://ns.adobe.com/xmp/extension/";
		class et extends ge {
			static canHandle(e, t) {
				return 225 === e.getUint8(t + 1) && 1752462448 === e.getUint32(t + 4) && e.getString(t + 4, 20) === Qe;
			}
			static headerLength(e, t) {
				return e.getString(t + 4, 34) === Ze ? 79 : 33;
			}
			static findPosition(e, t) {
				let i = super.findPosition(e, t);
				return i.multiSegment = i.extended = 79 === i.headerLength, i.multiSegment ? (i.chunkCount = e.getUint8(t + 72), i.chunkNumber = e.getUint8(t + 76), 0 !== e.getUint8(t + 77) && i.chunkNumber++) : (i.chunkCount = 1 / 0, i.chunkNumber = -1), i;
			}
			static handleMultiSegments(e) {
				return e.map(((e) => e.chunk.getString())).join("");
			}
			normalizeInput(e) {
				return "string" == typeof e ? e : I.from(e).getString();
			}
			parse(e = this.chunk) {
				if (!this.localOptions.parse) return e;
				e = function(e) {
					let t = {}, i = {};
					for (let e of ut) t[e] = [], i[e] = 0;
					return e.replace(ct, ((e, n, s) => {
						if ("<" === n) {
							let n = ++i[s];
							return t[s].push(n), `${e}#${n}`;
						}
						return `${e}#${t[s].pop()}`;
					}));
				}(e);
				let t = nt.findAll(e, "rdf", "Description");
				0 === t.length && t.push(new nt("rdf", "Description", void 0, e));
				let i, n = {};
				for (let e of t) for (let t of e.properties) i = ot(t.ns, n), st(t, i);
				return function(e) {
					let t;
					for (let i in e) t = e[i] = d(e[i]), void 0 === t && delete e[i];
					return d(e);
				}(n);
			}
			assignToOutput(e, t) {
				if (this.localOptions.parse) for (let [i, n] of Object.entries(t)) switch (i) {
					case "tiff":
						this.assignObjectToOutput(e, "ifd0", n);
						break;
					case "exif":
						this.assignObjectToOutput(e, "exif", n);
						break;
					case "xmlns": break;
					default: this.assignObjectToOutput(e, i, n);
				}
				else e.xmp = t;
			}
		}
		f(et, "type", "xmp"), f(et, "multiSegment", !0), A.set("xmp", et);
		class tt {
			static findAll(e) {
				return lt(e, /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)=("[^"]*"|'[^']*')/gm).map(tt.unpackMatch);
			}
			static unpackMatch(e) {
				let t = e[1], i = e[2], n = e[3].slice(1, -1);
				return n = ht(n), new tt(t, i, n);
			}
			constructor(e, t, i) {
				this.ns = e, this.name = t, this.value = i;
			}
			serialize() {
				return this.value;
			}
		}
		const it = "[\\w\\d-]+";
		class nt {
			static findAll(e, t, i) {
				if (void 0 !== t || void 0 !== i) {
					t = t || it, i = i || it;
					var n = new RegExp(`<(${t}):(${i})(#\\d+)?((\\s+?[\\w\\d-:]+=("[^"]*"|'[^']*'))*\\s*)(\\/>|>([\\s\\S]*?)<\\/\\1:\\2\\3>)`, "gm");
				} else n = /<([\w\d-]+):([\w\d-]+)(#\d+)?((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2\3>)/gm;
				return lt(e, n).map(nt.unpackMatch);
			}
			static unpackMatch(e) {
				let t = e[1], i = e[2], n = e[4], s = e[8];
				return new nt(t, i, n, s);
			}
			constructor(e, t, i, n) {
				this.ns = e, this.name = t, this.attrString = i, this.innerXml = n, this.attrs = tt.findAll(i), this.children = nt.findAll(n), this.value = 0 === this.children.length ? ht(n) : void 0, this.properties = [...this.attrs, ...this.children];
			}
			get isPrimitive() {
				return void 0 !== this.value && 0 === this.attrs.length && 0 === this.children.length;
			}
			get isListContainer() {
				return 1 === this.children.length && this.children[0].isList;
			}
			get isList() {
				let { ns: e, name: t } = this;
				return "rdf" === e && ("Seq" === t || "Bag" === t || "Alt" === t);
			}
			get isListItem() {
				return "rdf" === this.ns && "li" === this.name;
			}
			serialize() {
				if (0 === this.properties.length && void 0 === this.value) return;
				if (this.isPrimitive) return this.value;
				if (this.isListContainer) return this.children[0].serialize();
				if (this.isList) return at(this.children.map(rt));
				if (this.isListItem && 1 === this.children.length && 0 === this.attrs.length) return this.children[0].serialize();
				let e = {};
				for (let t of this.properties) st(t, e);
				return void 0 !== this.value && (e.value = this.value), d(e);
			}
		}
		function st(e, t) {
			let i = e.serialize();
			void 0 !== i && (t[e.name] = i);
		}
		var rt = (e) => e.serialize(), at = (e) => 1 === e.length ? e[0] : e, ot = (e, t) => t[e] ? t[e] : t[e] = {};
		function lt(e, t) {
			let i, n = [];
			if (!e) return n;
			for (; null !== (i = t.exec(e));) n.push(i);
			return n;
		}
		function ht(e) {
			if (function(e) {
				return null == e || "null" === e || "undefined" === e || "" === e || "" === e.trim();
			}(e)) return;
			let t = Number(e);
			if (!Number.isNaN(t)) return t;
			let i = e.toLowerCase();
			return "true" === i || "false" !== i && e.trim();
		}
		const ut = [
			"rdf:li",
			"rdf:Seq",
			"rdf:Bag",
			"rdf:Alt",
			"rdf:Description"
		], ct = new RegExp(`(<|\\/)(${ut.join("|")})`, "g");
		var ft = Object.freeze({
			__proto__: null,
			default: Ge,
			Exifr: ce,
			fileParsers: T,
			segmentParsers: A,
			fileReaders: D,
			tagKeys: N,
			tagValues: G,
			tagRevivers: V,
			createDictionary: B,
			extendDictionary: E,
			fetchUrlAsArrayBuffer: L,
			readBlobAsArrayBuffer: U,
			chunkedProps: $,
			otherSegments: J,
			segments: q,
			tiffBlocks: Q,
			segmentsAndBlocks: Z,
			tiffExtractables: ee,
			inheritables: te,
			allFormatters: ie,
			Options: oe,
			parse: fe,
			gpsOnlyOptions: Ae,
			gps: De,
			thumbnailOnlyOptions: Oe,
			thumbnail: xe,
			thumbnailUrl: ve,
			orientationOnlyOptions: Me,
			orientation: Re,
			rotations: Le,
			get rotateCanvas() {
				return e.rotateCanvas;
			},
			get rotateCss() {
				return e.rotateCss;
			},
			rotation: Ue
		});
		const dt = [
			"xmp",
			"icc",
			"iptc",
			"tiff"
		], pt = () => {};
		async function gt(e, t, i) {
			let n = i[e];
			return n.enabled = !0, n.parse = !0, A.get(e).parse(t, n);
		}
		let mt = h("fs", ((e) => e.promises));
		D.set("fs", class extends Ne {
			async readWhole() {
				this.chunked = !1, this.fs = await mt;
				let e = await this.fs.readFile(this.input);
				this._swapBuffer(e);
			}
			async readChunked() {
				this.chunked = !0, this.fs = await mt, await this.open(), await this.readChunk(0, this.options.firstChunkSize);
			}
			async open() {
				void 0 === this.fh && (this.fh = await this.fs.open(this.input, "r"), this.size = (await this.fh.stat(this.input)).size);
			}
			async _readChunk(e, t) {
				void 0 === this.fh && await this.open(), e + t > this.size && (t = this.size - e);
				var i = this.subarray(e, t, !0);
				return await this.fh.read(i.dataView, 0, t, e), i;
			}
			async close() {
				if (this.fh) {
					let e = this.fh;
					this.fh = void 0, await e.close();
				}
			}
		});
		D.set("base64", class extends Ne {
			constructor(...e) {
				super(...e), this.input = this.input.replace(/^data:([^;]+);base64,/gim, ""), this.size = this.input.length / 4 * 3, this.input.endsWith("==") ? this.size -= 2 : this.input.endsWith("=") && (this.size -= 1);
			}
			async _readChunk(e, t) {
				let i, n, s = this.input;
				void 0 === e ? (e = 0, i = 0, n = 0) : (i = 4 * Math.floor(e / 3), n = e - i / 4 * 3), void 0 === t && (t = this.size);
				let a = e + t, l = i + 4 * Math.ceil(a / 3);
				s = s.slice(i, l);
				let h = Math.min(t, this.size - e);
				if (o) {
					let t = r.from(s, "base64").slice(n, n + h);
					return this.set(t, e, !0);
				}
				{
					let t = this.subarray(e, h, !0), i = atob(s), r = t.toUint8();
					for (let e = 0; e < h; e++) r[e] = i.charCodeAt(n + e);
					return t;
				}
			}
		});
		class St extends pe {
			static canHandle(e, t) {
				return 18761 === t || 19789 === t;
			}
			extendOptions(e) {
				let { ifd0: t, xmp: i, iptc: n, icc: s } = e;
				i.enabled && t.deps.add(j), n.enabled && t.deps.add(W), s.enabled && t.deps.add(K), t.finalizeFilters();
			}
			async parse() {
				let { tiff: e, xmp: t, iptc: i, icc: n } = this.options;
				if (e.enabled || t.enabled || i.enabled || n.enabled) {
					let e = Math.max(C(this.options), this.options.chunkSize);
					await this.file.ensureChunk(0, e), this.createParser("tiff", this.file), this.parsers.tiff.parseHeader(), await this.parsers.tiff.parseIfd0Block(), this.adaptTiffPropAsSegment("xmp"), this.adaptTiffPropAsSegment("iptc"), this.adaptTiffPropAsSegment("icc");
				}
			}
			adaptTiffPropAsSegment(e) {
				if (this.parsers.tiff[e]) {
					let t = this.parsers.tiff[e];
					this.injectSegment(e, t);
				}
			}
		}
		f(St, "type", "tiff"), T.set("tiff", St);
		let Ct = h("zlib");
		const yt = "XML:com.adobe.xmp", bt = "ihdr", Pt = "iccp", It = "text", kt = "itxt", wt = [
			bt,
			Pt,
			It,
			kt,
			"exif"
		];
		class Tt extends pe {
			constructor(...e) {
				super(...e), f(this, "catchError", ((e) => this.errors.push(e))), f(this, "metaChunks", []), f(this, "unknownChunks", []);
			}
			static canHandle(e, t) {
				return 35152 === t && 2303741511 === e.getUint32(0) && 218765834 === e.getUint32(4);
			}
			async parse() {
				let { file: e } = this;
				await this.findPngChunksInRange(8, e.byteLength), await this.readSegments(this.metaChunks), this.findIhdr(), this.parseTextChunks(), await this.findExif().catch(this.catchError), await this.findXmp().catch(this.catchError), await this.findIcc().catch(this.catchError);
			}
			async findPngChunksInRange(e, t) {
				let { file: i } = this;
				for (; e < t;) {
					let t = i.getUint32(e), n = i.getUint32(e + 4), s = i.getString(e + 4, 4).toLowerCase(), r = t + 4 + 4 + 4, a = {
						type: s,
						offset: e,
						length: r,
						start: e + 4 + 4,
						size: t,
						marker: n
					};
					wt.includes(s) ? this.metaChunks.push(a) : this.unknownChunks.push(a), e += r;
				}
			}
			parseTextChunks() {
				let e = this.metaChunks.filter(((e) => e.type === It));
				for (let t of e) {
					let [e, i] = this.file.getString(t.start, t.size).split("\0");
					this.injectKeyValToIhdr(e, i);
				}
			}
			injectKeyValToIhdr(e, t) {
				let i = this.parsers.ihdr;
				i && i.raw.set(e, t);
			}
			findIhdr() {
				let e = this.metaChunks.find(((e) => e.type === bt));
				e && !1 !== this.options.ihdr.enabled && this.createParser(bt, e.chunk);
			}
			async findExif() {
				let e = this.metaChunks.find(((e) => "exif" === e.type));
				e && this.injectSegment("tiff", e.chunk);
			}
			async findXmp() {
				let e = this.metaChunks.filter(((e) => e.type === kt));
				for (let t of e) t.chunk.getString(0, 17) === yt && this.injectSegment("xmp", t.chunk);
			}
			async findIcc() {
				let e = this.metaChunks.find(((e) => e.type === Pt));
				if (!e) return;
				let { chunk: t } = e, i = t.getUint8Array(0, 81), n = 0;
				for (; n < 80 && 0 !== i[n];) n++;
				let r = n + 2, a = t.getString(0, n);
				if (this.injectKeyValToIhdr("ProfileName", a), s) {
					let e = await Ct, i = t.getUint8Array(r);
					i = e.inflateSync(i), this.injectSegment("icc", i);
				}
			}
		}
		f(Tt, "type", "png"), T.set("png", Tt), B(N, "interop", [
			[1, "InteropIndex"],
			[2, "InteropVersion"],
			[4096, "RelatedImageFileFormat"],
			[4097, "RelatedImageWidth"],
			[4098, "RelatedImageHeight"]
		]), E(N, "ifd0", [
			[11, "ProcessingSoftware"],
			[254, "SubfileType"],
			[255, "OldSubfileType"],
			[263, "Thresholding"],
			[264, "CellWidth"],
			[265, "CellLength"],
			[266, "FillOrder"],
			[269, "DocumentName"],
			[280, "MinSampleValue"],
			[281, "MaxSampleValue"],
			[285, "PageName"],
			[286, "XPosition"],
			[287, "YPosition"],
			[290, "GrayResponseUnit"],
			[297, "PageNumber"],
			[321, "HalftoneHints"],
			[322, "TileWidth"],
			[323, "TileLength"],
			[332, "InkSet"],
			[337, "TargetPrinter"],
			[18246, "Rating"],
			[18249, "RatingPercent"],
			[33550, "PixelScale"],
			[34264, "ModelTransform"],
			[34377, "PhotoshopSettings"],
			[50706, "DNGVersion"],
			[50707, "DNGBackwardVersion"],
			[50708, "UniqueCameraModel"],
			[50709, "LocalizedCameraModel"],
			[50736, "DNGLensInfo"],
			[50739, "ShadowScale"],
			[50740, "DNGPrivateData"],
			[33920, "IntergraphMatrix"],
			[33922, "ModelTiePoint"],
			[34118, "SEMInfo"],
			[34735, "GeoTiffDirectory"],
			[34736, "GeoTiffDoubleParams"],
			[34737, "GeoTiffAsciiParams"],
			[50341, "PrintIM"],
			[50721, "ColorMatrix1"],
			[50722, "ColorMatrix2"],
			[50723, "CameraCalibration1"],
			[50724, "CameraCalibration2"],
			[50725, "ReductionMatrix1"],
			[50726, "ReductionMatrix2"],
			[50727, "AnalogBalance"],
			[50728, "AsShotNeutral"],
			[50729, "AsShotWhiteXY"],
			[50730, "BaselineExposure"],
			[50731, "BaselineNoise"],
			[50732, "BaselineSharpness"],
			[50734, "LinearResponseLimit"],
			[50735, "CameraSerialNumber"],
			[50741, "MakerNoteSafety"],
			[50778, "CalibrationIlluminant1"],
			[50779, "CalibrationIlluminant2"],
			[50781, "RawDataUniqueID"],
			[50827, "OriginalRawFileName"],
			[50828, "OriginalRawFileData"],
			[50831, "AsShotICCProfile"],
			[50832, "AsShotPreProfileMatrix"],
			[50833, "CurrentICCProfile"],
			[50834, "CurrentPreProfileMatrix"],
			[50879, "ColorimetricReference"],
			[50885, "SRawType"],
			[50898, "PanasonicTitle"],
			[50899, "PanasonicTitle2"],
			[50931, "CameraCalibrationSig"],
			[50932, "ProfileCalibrationSig"],
			[50933, "ProfileIFD"],
			[50934, "AsShotProfileName"],
			[50936, "ProfileName"],
			[50937, "ProfileHueSatMapDims"],
			[50938, "ProfileHueSatMapData1"],
			[50939, "ProfileHueSatMapData2"],
			[50940, "ProfileToneCurve"],
			[50941, "ProfileEmbedPolicy"],
			[50942, "ProfileCopyright"],
			[50964, "ForwardMatrix1"],
			[50965, "ForwardMatrix2"],
			[50966, "PreviewApplicationName"],
			[50967, "PreviewApplicationVersion"],
			[50968, "PreviewSettingsName"],
			[50969, "PreviewSettingsDigest"],
			[50970, "PreviewColorSpace"],
			[50971, "PreviewDateTime"],
			[50972, "RawImageDigest"],
			[50973, "OriginalRawFileDigest"],
			[50981, "ProfileLookTableDims"],
			[50982, "ProfileLookTableData"],
			[51043, "TimeCodes"],
			[51044, "FrameRate"],
			[51058, "TStop"],
			[51081, "ReelName"],
			[51089, "OriginalDefaultFinalSize"],
			[51090, "OriginalBestQualitySize"],
			[51091, "OriginalDefaultCropSize"],
			[51105, "CameraLabel"],
			[51107, "ProfileHueSatMapEncoding"],
			[51108, "ProfileLookTableEncoding"],
			[51109, "BaselineExposureOffset"],
			[51110, "DefaultBlackRender"],
			[51111, "NewRawImageDigest"],
			[51112, "RawToPreviewGain"]
		]);
		let At = [
			[273, "StripOffsets"],
			[279, "StripByteCounts"],
			[288, "FreeOffsets"],
			[289, "FreeByteCounts"],
			[291, "GrayResponseCurve"],
			[292, "T4Options"],
			[293, "T6Options"],
			[300, "ColorResponseUnit"],
			[320, "ColorMap"],
			[324, "TileOffsets"],
			[325, "TileByteCounts"],
			[326, "BadFaxLines"],
			[327, "CleanFaxData"],
			[328, "ConsecutiveBadFaxLines"],
			[330, "SubIFD"],
			[333, "InkNames"],
			[334, "NumberofInks"],
			[336, "DotRange"],
			[338, "ExtraSamples"],
			[339, "SampleFormat"],
			[340, "SMinSampleValue"],
			[341, "SMaxSampleValue"],
			[342, "TransferRange"],
			[343, "ClipPath"],
			[344, "XClipPathUnits"],
			[345, "YClipPathUnits"],
			[346, "Indexed"],
			[347, "JPEGTables"],
			[351, "OPIProxy"],
			[400, "GlobalParametersIFD"],
			[401, "ProfileType"],
			[402, "FaxProfile"],
			[403, "CodingMethods"],
			[404, "VersionYear"],
			[405, "ModeNumber"],
			[433, "Decode"],
			[434, "DefaultImageColor"],
			[435, "T82Options"],
			[437, "JPEGTables"],
			[512, "JPEGProc"],
			[515, "JPEGRestartInterval"],
			[517, "JPEGLosslessPredictors"],
			[518, "JPEGPointTransforms"],
			[519, "JPEGQTables"],
			[520, "JPEGDCTables"],
			[521, "JPEGACTables"],
			[559, "StripRowCounts"],
			[999, "USPTOMiscellaneous"],
			[18247, "XP_DIP_XML"],
			[18248, "StitchInfo"],
			[28672, "SonyRawFileType"],
			[28688, "SonyToneCurve"],
			[28721, "VignettingCorrection"],
			[28722, "VignettingCorrParams"],
			[28724, "ChromaticAberrationCorrection"],
			[28725, "ChromaticAberrationCorrParams"],
			[28726, "DistortionCorrection"],
			[28727, "DistortionCorrParams"],
			[29895, "SonyCropTopLeft"],
			[29896, "SonyCropSize"],
			[32781, "ImageID"],
			[32931, "WangTag1"],
			[32932, "WangAnnotation"],
			[32933, "WangTag3"],
			[32934, "WangTag4"],
			[32953, "ImageReferencePoints"],
			[32954, "RegionXformTackPoint"],
			[32955, "WarpQuadrilateral"],
			[32956, "AffineTransformMat"],
			[32995, "Matteing"],
			[32996, "DataType"],
			[32997, "ImageDepth"],
			[32998, "TileDepth"],
			[33300, "ImageFullWidth"],
			[33301, "ImageFullHeight"],
			[33302, "TextureFormat"],
			[33303, "WrapModes"],
			[33304, "FovCot"],
			[33305, "MatrixWorldToScreen"],
			[33306, "MatrixWorldToCamera"],
			[33405, "Model2"],
			[33421, "CFARepeatPatternDim"],
			[33422, "CFAPattern2"],
			[33423, "BatteryLevel"],
			[33424, "KodakIFD"],
			[33445, "MDFileTag"],
			[33446, "MDScalePixel"],
			[33447, "MDColorTable"],
			[33448, "MDLabName"],
			[33449, "MDSampleInfo"],
			[33450, "MDPrepDate"],
			[33451, "MDPrepTime"],
			[33452, "MDFileUnits"],
			[33589, "AdventScale"],
			[33590, "AdventRevision"],
			[33628, "UIC1Tag"],
			[33629, "UIC2Tag"],
			[33630, "UIC3Tag"],
			[33631, "UIC4Tag"],
			[33918, "IntergraphPacketData"],
			[33919, "IntergraphFlagRegisters"],
			[33921, "INGRReserved"],
			[34016, "Site"],
			[34017, "ColorSequence"],
			[34018, "IT8Header"],
			[34019, "RasterPadding"],
			[34020, "BitsPerRunLength"],
			[34021, "BitsPerExtendedRunLength"],
			[34022, "ColorTable"],
			[34023, "ImageColorIndicator"],
			[34024, "BackgroundColorIndicator"],
			[34025, "ImageColorValue"],
			[34026, "BackgroundColorValue"],
			[34027, "PixelIntensityRange"],
			[34028, "TransparencyIndicator"],
			[34029, "ColorCharacterization"],
			[34030, "HCUsage"],
			[34031, "TrapIndicator"],
			[34032, "CMYKEquivalent"],
			[34152, "AFCP_IPTC"],
			[34232, "PixelMagicJBIGOptions"],
			[34263, "JPLCartoIFD"],
			[34306, "WB_GRGBLevels"],
			[34310, "LeafData"],
			[34687, "TIFF_FXExtensions"],
			[34688, "MultiProfiles"],
			[34689, "SharedData"],
			[34690, "T88Options"],
			[34732, "ImageLayer"],
			[34750, "JBIGOptions"],
			[34856, "Opto-ElectricConvFactor"],
			[34857, "Interlace"],
			[34908, "FaxRecvParams"],
			[34909, "FaxSubAddress"],
			[34910, "FaxRecvTime"],
			[34929, "FedexEDR"],
			[34954, "LeafSubIFD"],
			[37387, "FlashEnergy"],
			[37388, "SpatialFrequencyResponse"],
			[37389, "Noise"],
			[37390, "FocalPlaneXResolution"],
			[37391, "FocalPlaneYResolution"],
			[37392, "FocalPlaneResolutionUnit"],
			[37397, "ExposureIndex"],
			[37398, "TIFF-EPStandardID"],
			[37399, "SensingMethod"],
			[37434, "CIP3DataFile"],
			[37435, "CIP3Sheet"],
			[37436, "CIP3Side"],
			[37439, "StoNits"],
			[37679, "MSDocumentText"],
			[37680, "MSPropertySetStorage"],
			[37681, "MSDocumentTextPosition"],
			[37724, "ImageSourceData"],
			[40965, "InteropIFD"],
			[40976, "SamsungRawPointersOffset"],
			[40977, "SamsungRawPointersLength"],
			[41217, "SamsungRawByteOrder"],
			[41218, "SamsungRawUnknown"],
			[41484, "SpatialFrequencyResponse"],
			[41485, "Noise"],
			[41489, "ImageNumber"],
			[41490, "SecurityClassification"],
			[41491, "ImageHistory"],
			[41494, "TIFF-EPStandardID"],
			[41995, "DeviceSettingDescription"],
			[42112, "GDALMetadata"],
			[42113, "GDALNoData"],
			[44992, "ExpandSoftware"],
			[44993, "ExpandLens"],
			[44994, "ExpandFilm"],
			[44995, "ExpandFilterLens"],
			[44996, "ExpandScanner"],
			[44997, "ExpandFlashLamp"],
			[46275, "HasselbladRawImage"],
			[48129, "PixelFormat"],
			[48130, "Transformation"],
			[48131, "Uncompressed"],
			[48132, "ImageType"],
			[48256, "ImageWidth"],
			[48257, "ImageHeight"],
			[48258, "WidthResolution"],
			[48259, "HeightResolution"],
			[48320, "ImageOffset"],
			[48321, "ImageByteCount"],
			[48322, "AlphaOffset"],
			[48323, "AlphaByteCount"],
			[48324, "ImageDataDiscard"],
			[48325, "AlphaDataDiscard"],
			[50215, "OceScanjobDesc"],
			[50216, "OceApplicationSelector"],
			[50217, "OceIDNumber"],
			[50218, "OceImageLogic"],
			[50255, "Annotations"],
			[50459, "HasselbladExif"],
			[50547, "OriginalFileName"],
			[50560, "USPTOOriginalContentType"],
			[50656, "CR2CFAPattern"],
			[50710, "CFAPlaneColor"],
			[50711, "CFALayout"],
			[50712, "LinearizationTable"],
			[50713, "BlackLevelRepeatDim"],
			[50714, "BlackLevel"],
			[50715, "BlackLevelDeltaH"],
			[50716, "BlackLevelDeltaV"],
			[50717, "WhiteLevel"],
			[50718, "DefaultScale"],
			[50719, "DefaultCropOrigin"],
			[50720, "DefaultCropSize"],
			[50733, "BayerGreenSplit"],
			[50737, "ChromaBlurRadius"],
			[50738, "AntiAliasStrength"],
			[50752, "RawImageSegmentation"],
			[50780, "BestQualityScale"],
			[50784, "AliasLayerMetadata"],
			[50829, "ActiveArea"],
			[50830, "MaskedAreas"],
			[50935, "NoiseReductionApplied"],
			[50974, "SubTileBlockSize"],
			[50975, "RowInterleaveFactor"],
			[51008, "OpcodeList1"],
			[51009, "OpcodeList2"],
			[51022, "OpcodeList3"],
			[51041, "NoiseProfile"],
			[51114, "CacheVersion"],
			[51125, "DefaultUserCrop"],
			[51157, "NikonNEFInfo"],
			[65024, "KdcIFD"]
		];
		E(N, "ifd0", At), E(N, "exif", At), B(G, "gps", [[23, {
			M: "Magnetic North",
			T: "True North"
		}], [25, {
			K: "Kilometers",
			M: "Miles",
			N: "Nautical Miles"
		}]]);
		class Dt extends ge {
			static canHandle(e, t) {
				return 224 === e.getUint8(t + 1) && 1246120262 === e.getUint32(t + 4) && 0 === e.getUint8(t + 8);
			}
			parse() {
				return this.parseTags(), this.translate(), this.output;
			}
			parseTags() {
				this.raw = /* @__PURE__ */ new Map([
					[0, this.chunk.getUint16(0)],
					[2, this.chunk.getUint8(2)],
					[3, this.chunk.getUint16(3)],
					[5, this.chunk.getUint16(5)],
					[7, this.chunk.getUint8(7)],
					[8, this.chunk.getUint8(8)]
				]);
			}
		}
		f(Dt, "type", "jfif"), f(Dt, "headerLength", 9), A.set("jfif", Dt), B(N, "jfif", [
			[0, "JFIFVersion"],
			[2, "ResolutionUnit"],
			[3, "XResolution"],
			[5, "YResolution"],
			[7, "ThumbnailWidth"],
			[8, "ThumbnailHeight"]
		]);
		class Ot extends ge {
			parse() {
				return this.parseTags(), this.translate(), this.output;
			}
			parseTags() {
				this.raw = new Map([
					[0, this.chunk.getUint32(0)],
					[4, this.chunk.getUint32(4)],
					[8, this.chunk.getUint8(8)],
					[9, this.chunk.getUint8(9)],
					[10, this.chunk.getUint8(10)],
					[11, this.chunk.getUint8(11)],
					[12, this.chunk.getUint8(12)],
					...Array.from(this.raw)
				]);
			}
		}
		f(Ot, "type", "ihdr"), A.set("ihdr", Ot), B(N, "ihdr", [
			[0, "ImageWidth"],
			[4, "ImageHeight"],
			[8, "BitDepth"],
			[9, "ColorType"],
			[10, "Compression"],
			[11, "Filter"],
			[12, "Interlace"]
		]), B(G, "ihdr", [
			[9, {
				0: "Grayscale",
				2: "RGB",
				3: "Palette",
				4: "Grayscale with Alpha",
				6: "RGB with Alpha",
				DEFAULT: "Unknown"
			}],
			[10, {
				0: "Deflate/Inflate",
				DEFAULT: "Unknown"
			}],
			[11, {
				0: "Adaptive",
				DEFAULT: "Unknown"
			}],
			[12, {
				0: "Noninterlaced",
				1: "Adam7 Interlace",
				DEFAULT: "Unknown"
			}]
		]);
		const xt = "\0\0\0\0";
		class vt extends ge {
			static canHandle(e, t) {
				return 226 === e.getUint8(t + 1) && 1229144927 === e.getUint32(t + 4);
			}
			static findPosition(e, t) {
				let i = super.findPosition(e, t);
				return i.chunkNumber = e.getUint8(t + 16), i.chunkCount = e.getUint8(t + 17), i.multiSegment = i.chunkCount > 1, i;
			}
			static handleMultiSegments(e) {
				return function(e) {
					let t = function(e) {
						let t = e[0].constructor, i = 0;
						for (let t of e) i += t.length;
						let n = new t(i), s = 0;
						for (let t of e) n.set(t, s), s += t.length;
						return n;
					}(e.map(((e) => e.chunk.toUint8())));
					return new I(t);
				}(e);
			}
			parse() {
				return this.raw = /* @__PURE__ */ new Map(), this.parseHeader(), this.parseTags(), this.translate(), this.output;
			}
			parseHeader() {
				let { raw: e } = this;
				this.chunk.byteLength < 84 && m("ICC header is too short");
				for (let [t, i] of Object.entries(Mt)) {
					t = parseInt(t, 10);
					let n = i(this.chunk, t);
					n !== xt && e.set(t, n);
				}
			}
			parseTags() {
				let e, t, i, n, s, { raw: r } = this, a = this.chunk.getUint32(128), o = 132, l = this.chunk.byteLength;
				for (; a--;) {
					if (e = this.chunk.getString(o, 4), t = this.chunk.getUint32(o + 4), i = this.chunk.getUint32(o + 8), n = this.chunk.getString(t, 4), t + i > l) return void console.warn("reached the end of the first ICC chunk. Enable options.tiff.multiSegment to read all ICC segments.");
					s = this.parseTag(n, t, i), void 0 !== s && s !== xt && r.set(e, s), o += 12;
				}
			}
			parseTag(e, t, i) {
				switch (e) {
					case "desc": return this.parseDesc(t);
					case "mluc": return this.parseMluc(t);
					case "text": return this.parseText(t, i);
					case "sig ": return this.parseSig(t);
				}
				if (!(t + i > this.chunk.byteLength)) return this.chunk.getUint8Array(t, i);
			}
			parseDesc(e) {
				let t = this.chunk.getUint32(e + 8) - 1;
				return S(this.chunk.getString(e + 12, t));
			}
			parseText(e, t) {
				return S(this.chunk.getString(e + 8, t - 8));
			}
			parseSig(e) {
				return S(this.chunk.getString(e + 8, 4));
			}
			parseMluc(e) {
				let { chunk: t } = this, i = t.getUint32(e + 8), n = t.getUint32(e + 12), s = e + 16, r = [];
				for (let a = 0; a < i; a++) {
					let i = t.getString(s + 0, 2), a = t.getString(s + 2, 2), o = t.getUint32(s + 4), l = t.getUint32(s + 8) + e, h = S(t.getUnicodeString(l, o));
					r.push({
						lang: i,
						country: a,
						text: h
					}), s += n;
				}
				return 1 === i ? r[0].text : r;
			}
			translateValue(e, t) {
				return "string" == typeof e ? t[e] || t[e.toLowerCase()] || e : t[e] || e;
			}
		}
		f(vt, "type", "icc"), f(vt, "multiSegment", !0), f(vt, "headerLength", 18);
		const Mt = {
			4: Rt,
			8: function(e, t) {
				return [
					e.getUint8(t),
					e.getUint8(t + 1) >> 4,
					e.getUint8(t + 1) % 16
				].map(((e) => e.toString(10))).join(".");
			},
			12: Rt,
			16: Rt,
			20: Rt,
			24: function(e, t) {
				const i = e.getUint16(t), n = e.getUint16(t + 2) - 1, s = e.getUint16(t + 4), r = e.getUint16(t + 6), a = e.getUint16(t + 8), o = e.getUint16(t + 10);
				return new Date(Date.UTC(i, n, s, r, a, o));
			},
			36: Rt,
			40: Rt,
			48: Rt,
			52: Rt,
			64: (e, t) => e.getUint32(t),
			80: Rt
		};
		function Rt(e, t) {
			return S(e.getString(t, 4));
		}
		A.set("icc", vt), B(N, "icc", [
			[4, "ProfileCMMType"],
			[8, "ProfileVersion"],
			[12, "ProfileClass"],
			[16, "ColorSpaceData"],
			[20, "ProfileConnectionSpace"],
			[24, "ProfileDateTime"],
			[36, "ProfileFileSignature"],
			[40, "PrimaryPlatform"],
			[44, "CMMFlags"],
			[48, "DeviceManufacturer"],
			[52, "DeviceModel"],
			[56, "DeviceAttributes"],
			[64, "RenderingIntent"],
			[68, "ConnectionSpaceIlluminant"],
			[80, "ProfileCreator"],
			[84, "ProfileID"],
			["Header", "ProfileHeader"],
			["MS00", "WCSProfiles"],
			["bTRC", "BlueTRC"],
			["bXYZ", "BlueMatrixColumn"],
			["bfd", "UCRBG"],
			["bkpt", "MediaBlackPoint"],
			["calt", "CalibrationDateTime"],
			["chad", "ChromaticAdaptation"],
			["chrm", "Chromaticity"],
			["ciis", "ColorimetricIntentImageState"],
			["clot", "ColorantTableOut"],
			["clro", "ColorantOrder"],
			["clrt", "ColorantTable"],
			["cprt", "ProfileCopyright"],
			["crdi", "CRDInfo"],
			["desc", "ProfileDescription"],
			["devs", "DeviceSettings"],
			["dmdd", "DeviceModelDesc"],
			["dmnd", "DeviceMfgDesc"],
			["dscm", "ProfileDescriptionML"],
			["fpce", "FocalPlaneColorimetryEstimates"],
			["gTRC", "GreenTRC"],
			["gXYZ", "GreenMatrixColumn"],
			["gamt", "Gamut"],
			["kTRC", "GrayTRC"],
			["lumi", "Luminance"],
			["meas", "Measurement"],
			["meta", "Metadata"],
			["mmod", "MakeAndModel"],
			["ncl2", "NamedColor2"],
			["ncol", "NamedColor"],
			["ndin", "NativeDisplayInfo"],
			["pre0", "Preview0"],
			["pre1", "Preview1"],
			["pre2", "Preview2"],
			["ps2i", "PS2RenderingIntent"],
			["ps2s", "PostScript2CSA"],
			["psd0", "PostScript2CRD0"],
			["psd1", "PostScript2CRD1"],
			["psd2", "PostScript2CRD2"],
			["psd3", "PostScript2CRD3"],
			["pseq", "ProfileSequenceDesc"],
			["psid", "ProfileSequenceIdentifier"],
			["psvm", "PS2CRDVMSize"],
			["rTRC", "RedTRC"],
			["rXYZ", "RedMatrixColumn"],
			["resp", "OutputResponse"],
			["rhoc", "ReflectionHardcopyOrigColorimetry"],
			["rig0", "PerceptualRenderingIntentGamut"],
			["rig2", "SaturationRenderingIntentGamut"],
			["rpoc", "ReflectionPrintOutputColorimetry"],
			["sape", "SceneAppearanceEstimates"],
			["scoe", "SceneColorimetryEstimates"],
			["scrd", "ScreeningDesc"],
			["scrn", "Screening"],
			["targ", "CharTarget"],
			["tech", "Technology"],
			["vcgt", "VideoCardGamma"],
			["view", "ViewingConditions"],
			["vued", "ViewingCondDesc"],
			["wtpt", "MediaWhitePoint"]
		]);
		const Lt = {
			"4d2p": "Erdt Systems",
			AAMA: "Aamazing Technologies",
			ACER: "Acer",
			ACLT: "Acolyte Color Research",
			ACTI: "Actix Sytems",
			ADAR: "Adara Technology",
			ADBE: "Adobe",
			ADI: "ADI Systems",
			AGFA: "Agfa Graphics",
			ALMD: "Alps Electric",
			ALPS: "Alps Electric",
			ALWN: "Alwan Color Expertise",
			AMTI: "Amiable Technologies",
			AOC: "AOC International",
			APAG: "Apago",
			APPL: "Apple Computer",
			AST: "AST",
			"AT&T": "AT&T",
			BAEL: "BARBIERI electronic",
			BRCO: "Barco NV",
			BRKP: "Breakpoint",
			BROT: "Brother",
			BULL: "Bull",
			BUS: "Bus Computer Systems",
			"C-IT": "C-Itoh",
			CAMR: "Intel",
			CANO: "Canon",
			CARR: "Carroll Touch",
			CASI: "Casio",
			CBUS: "Colorbus PL",
			CEL: "Crossfield",
			CELx: "Crossfield",
			CGS: "CGS Publishing Technologies International",
			CHM: "Rochester Robotics",
			CIGL: "Colour Imaging Group, London",
			CITI: "Citizen",
			CL00: "Candela",
			CLIQ: "Color IQ",
			CMCO: "Chromaco",
			CMiX: "CHROMiX",
			COLO: "Colorgraphic Communications",
			COMP: "Compaq",
			COMp: "Compeq/Focus Technology",
			CONR: "Conrac Display Products",
			CORD: "Cordata Technologies",
			CPQ: "Compaq",
			CPRO: "ColorPro",
			CRN: "Cornerstone",
			CTX: "CTX International",
			CVIS: "ColorVision",
			CWC: "Fujitsu Laboratories",
			DARI: "Darius Technology",
			DATA: "Dataproducts",
			DCP: "Dry Creek Photo",
			DCRC: "Digital Contents Resource Center, Chung-Ang University",
			DELL: "Dell Computer",
			DIC: "Dainippon Ink and Chemicals",
			DICO: "Diconix",
			DIGI: "Digital",
			"DL&C": "Digital Light & Color",
			DPLG: "Doppelganger",
			DS: "Dainippon Screen",
			DSOL: "DOOSOL",
			DUPN: "DuPont",
			EPSO: "Epson",
			ESKO: "Esko-Graphics",
			ETRI: "Electronics and Telecommunications Research Institute",
			EVER: "Everex Systems",
			EXAC: "ExactCODE",
			Eizo: "Eizo",
			FALC: "Falco Data Products",
			FF: "Fuji Photo Film",
			FFEI: "FujiFilm Electronic Imaging",
			FNRD: "Fnord Software",
			FORA: "Fora",
			FORE: "Forefront Technology",
			FP: "Fujitsu",
			FPA: "WayTech Development",
			FUJI: "Fujitsu",
			FX: "Fuji Xerox",
			GCC: "GCC Technologies",
			GGSL: "Global Graphics Software",
			GMB: "Gretagmacbeth",
			GMG: "GMG",
			GOLD: "GoldStar Technology",
			GOOG: "Google",
			GPRT: "Giantprint",
			GTMB: "Gretagmacbeth",
			GVC: "WayTech Development",
			GW2K: "Sony",
			HCI: "HCI",
			HDM: "Heidelberger Druckmaschinen",
			HERM: "Hermes",
			HITA: "Hitachi America",
			HP: "Hewlett-Packard",
			HTC: "Hitachi",
			HiTi: "HiTi Digital",
			IBM: "IBM",
			IDNT: "Scitex",
			IEC: "Hewlett-Packard",
			IIYA: "Iiyama North America",
			IKEG: "Ikegami Electronics",
			IMAG: "Image Systems",
			IMI: "Ingram Micro",
			INTC: "Intel",
			INTL: "N/A (INTL)",
			INTR: "Intra Electronics",
			IOCO: "Iocomm International Technology",
			IPS: "InfoPrint Solutions Company",
			IRIS: "Scitex",
			ISL: "Ichikawa Soft Laboratory",
			ITNL: "N/A (ITNL)",
			IVM: "IVM",
			IWAT: "Iwatsu Electric",
			Idnt: "Scitex",
			Inca: "Inca Digital Printers",
			Iris: "Scitex",
			JPEG: "Joint Photographic Experts Group",
			JSFT: "Jetsoft Development",
			JVC: "JVC Information Products",
			KART: "Scitex",
			KFC: "KFC Computek Components",
			KLH: "KLH Computers",
			KMHD: "Konica Minolta",
			KNCA: "Konica",
			KODA: "Kodak",
			KYOC: "Kyocera",
			Kart: "Scitex",
			LCAG: "Leica",
			LCCD: "Leeds Colour",
			LDAK: "Left Dakota",
			LEAD: "Leading Technology",
			LEXM: "Lexmark International",
			LINK: "Link Computer",
			LINO: "Linotronic",
			LITE: "Lite-On",
			Leaf: "Leaf",
			Lino: "Linotronic",
			MAGC: "Mag Computronic",
			MAGI: "MAG Innovision",
			MANN: "Mannesmann",
			MICN: "Micron Technology",
			MICR: "Microtek",
			MICV: "Microvitec",
			MINO: "Minolta",
			MITS: "Mitsubishi Electronics America",
			MITs: "Mitsuba",
			MNLT: "Minolta",
			MODG: "Modgraph",
			MONI: "Monitronix",
			MONS: "Monaco Systems",
			MORS: "Morse Technology",
			MOTI: "Motive Systems",
			MSFT: "Microsoft",
			MUTO: "MUTOH INDUSTRIES",
			Mits: "Mitsubishi Electric",
			NANA: "NANAO",
			NEC: "NEC",
			NEXP: "NexPress Solutions",
			NISS: "Nissei Sangyo America",
			NKON: "Nikon",
			NONE: "none",
			OCE: "Oce Technologies",
			OCEC: "OceColor",
			OKI: "Oki",
			OKID: "Okidata",
			OKIP: "Okidata",
			OLIV: "Olivetti",
			OLYM: "Olympus",
			ONYX: "Onyx Graphics",
			OPTI: "Optiquest",
			PACK: "Packard Bell",
			PANA: "Matsushita Electric Industrial",
			PANT: "Pantone",
			PBN: "Packard Bell",
			PFU: "PFU",
			PHIL: "Philips Consumer Electronics",
			PNTX: "HOYA",
			POne: "Phase One A/S",
			PREM: "Premier Computer Innovations",
			PRIN: "Princeton Graphic Systems",
			PRIP: "Princeton Publishing Labs",
			QLUX: "Hong Kong",
			QMS: "QMS",
			QPCD: "QPcard AB",
			QUAD: "QuadLaser",
			QUME: "Qume",
			RADI: "Radius",
			RDDx: "Integrated Color Solutions",
			RDG: "Roland DG",
			REDM: "REDMS Group",
			RELI: "Relisys",
			RGMS: "Rolf Gierling Multitools",
			RICO: "Ricoh",
			RNLD: "Edmund Ronald",
			ROYA: "Royal",
			RPC: "Ricoh Printing Systems",
			RTL: "Royal Information Electronics",
			SAMP: "Sampo",
			SAMS: "Samsung",
			SANT: "Jaime Santana Pomares",
			SCIT: "Scitex",
			SCRN: "Dainippon Screen",
			SDP: "Scitex",
			SEC: "Samsung",
			SEIK: "Seiko Instruments",
			SEIk: "Seikosha",
			SGUY: "ScanGuy.com",
			SHAR: "Sharp Laboratories",
			SICC: "International Color Consortium",
			SONY: "Sony",
			SPCL: "SpectraCal",
			STAR: "Star",
			STC: "Sampo Technology",
			Scit: "Scitex",
			Sdp: "Scitex",
			Sony: "Sony",
			TALO: "Talon Technology",
			TAND: "Tandy",
			TATU: "Tatung",
			TAXA: "TAXAN America",
			TDS: "Tokyo Denshi Sekei",
			TECO: "TECO Information Systems",
			TEGR: "Tegra",
			TEKT: "Tektronix",
			TI: "Texas Instruments",
			TMKR: "TypeMaker",
			TOSB: "Toshiba",
			TOSH: "Toshiba",
			TOTK: "TOTOKU ELECTRIC",
			TRIU: "Triumph",
			TSBT: "Toshiba",
			TTX: "TTX Computer Products",
			TVM: "TVM Professional Monitor",
			TW: "TW Casper",
			ULSX: "Ulead Systems",
			UNIS: "Unisys",
			UTZF: "Utz Fehlau & Sohn",
			VARI: "Varityper",
			VIEW: "Viewsonic",
			VISL: "Visual communication",
			VIVO: "Vivo Mobile Communication",
			WANG: "Wang",
			WLBR: "Wilbur Imaging",
			WTG2: "Ware To Go",
			WYSE: "WYSE Technology",
			XERX: "Xerox",
			XRIT: "X-Rite",
			ZRAN: "Zoran",
			Zebr: "Zebra Technologies",
			appl: "Apple Computer",
			bICC: "basICColor",
			berg: "bergdesign",
			ceyd: "Integrated Color Solutions",
			clsp: "MacDermid ColorSpan",
			ds: "Dainippon Screen",
			dupn: "DuPont",
			ffei: "FujiFilm Electronic Imaging",
			flux: "FluxData",
			iris: "Scitex",
			kart: "Scitex",
			lcms: "Little CMS",
			lino: "Linotronic",
			none: "none",
			ob4d: "Erdt Systems",
			obic: "Medigraph",
			quby: "Qubyx Sarl",
			scit: "Scitex",
			scrn: "Dainippon Screen",
			sdp: "Scitex",
			siwi: "SIWI GRAFIKA",
			yxym: "YxyMaster"
		}, Ut = {
			scnr: "Scanner",
			mntr: "Monitor",
			prtr: "Printer",
			link: "Device Link",
			abst: "Abstract",
			spac: "Color Space Conversion Profile",
			nmcl: "Named Color",
			cenc: "ColorEncodingSpace profile",
			mid: "MultiplexIdentification profile",
			mlnk: "MultiplexLink profile",
			mvis: "MultiplexVisualization profile",
			nkpf: "Nikon Input Device Profile (NON-STANDARD!)"
		};
		B(G, "icc", [
			[4, Lt],
			[12, Ut],
			[40, Object.assign({}, Lt, Ut)],
			[48, Lt],
			[80, Lt],
			[64, {
				0: "Perceptual",
				1: "Relative Colorimetric",
				2: "Saturation",
				3: "Absolute Colorimetric"
			}],
			["tech", {
				amd: "Active Matrix Display",
				crt: "Cathode Ray Tube Display",
				kpcd: "Photo CD",
				pmd: "Passive Matrix Display",
				dcam: "Digital Camera",
				dcpj: "Digital Cinema Projector",
				dmpc: "Digital Motion Picture Camera",
				dsub: "Dye Sublimation Printer",
				epho: "Electrophotographic Printer",
				esta: "Electrostatic Printer",
				flex: "Flexography",
				fprn: "Film Writer",
				fscn: "Film Scanner",
				grav: "Gravure",
				ijet: "Ink Jet Printer",
				imgs: "Photo Image Setter",
				mpfr: "Motion Picture Film Recorder",
				mpfs: "Motion Picture Film Scanner",
				offs: "Offset Lithography",
				pjtv: "Projection Television",
				rpho: "Photographic Paper Printer",
				rscn: "Reflective Scanner",
				silk: "Silkscreen",
				twax: "Thermal Wax Printer",
				vidc: "Video Camera",
				vidm: "Video Monitor"
			}]
		]);
		class Ft extends ge {
			static canHandle(e, t, i) {
				return 237 === e.getUint8(t + 1) && "Photoshop" === e.getString(t + 4, 9) && void 0 !== this.containsIptc8bim(e, t, i);
			}
			static headerLength(e, t, i) {
				let n, s = this.containsIptc8bim(e, t, i);
				if (void 0 !== s) return n = e.getUint8(t + s + 7), n % 2 != 0 && (n += 1), 0 === n && (n = 4), s + 8 + n;
			}
			static containsIptc8bim(e, t, i) {
				for (let n = 0; n < i; n++) if (this.isIptcSegmentHead(e, t + n)) return n;
			}
			static isIptcSegmentHead(e, t) {
				return 56 === e.getUint8(t) && 943868237 === e.getUint32(t) && 1028 === e.getUint16(t + 4);
			}
			parse() {
				let { raw: e } = this, t = this.chunk.byteLength - 1, i = !1;
				for (let n = 0; n < t; n++) if (28 === this.chunk.getUint8(n) && 2 === this.chunk.getUint8(n + 1)) {
					i = !0;
					let t = this.chunk.getUint16(n + 3), s = this.chunk.getUint8(n + 2), r = this.chunk.getLatin1String(n + 5, t);
					e.set(s, this.pluralizeValue(e.get(s), r)), n += 4 + t;
				} else if (i) break;
				return this.translate(), this.output;
			}
			pluralizeValue(e, t) {
				return void 0 !== e ? e instanceof Array ? (e.push(t), e) : [e, t] : t;
			}
		}
		f(Ft, "type", "iptc"), f(Ft, "translateValues", !1), f(Ft, "reviveValues", !1), A.set("iptc", Ft), B(N, "iptc", [
			[0, "ApplicationRecordVersion"],
			[3, "ObjectTypeReference"],
			[4, "ObjectAttributeReference"],
			[5, "ObjectName"],
			[7, "EditStatus"],
			[8, "EditorialUpdate"],
			[10, "Urgency"],
			[12, "SubjectReference"],
			[15, "Category"],
			[20, "SupplementalCategories"],
			[22, "FixtureIdentifier"],
			[25, "Keywords"],
			[26, "ContentLocationCode"],
			[27, "ContentLocationName"],
			[30, "ReleaseDate"],
			[35, "ReleaseTime"],
			[37, "ExpirationDate"],
			[38, "ExpirationTime"],
			[40, "SpecialInstructions"],
			[42, "ActionAdvised"],
			[45, "ReferenceService"],
			[47, "ReferenceDate"],
			[50, "ReferenceNumber"],
			[55, "DateCreated"],
			[60, "TimeCreated"],
			[62, "DigitalCreationDate"],
			[63, "DigitalCreationTime"],
			[65, "OriginatingProgram"],
			[70, "ProgramVersion"],
			[75, "ObjectCycle"],
			[80, "Byline"],
			[85, "BylineTitle"],
			[90, "City"],
			[92, "Sublocation"],
			[95, "State"],
			[100, "CountryCode"],
			[101, "Country"],
			[103, "OriginalTransmissionReference"],
			[105, "Headline"],
			[110, "Credit"],
			[115, "Source"],
			[116, "CopyrightNotice"],
			[118, "Contact"],
			[120, "Caption"],
			[121, "LocalCaption"],
			[122, "Writer"],
			[125, "RasterizedCaption"],
			[130, "ImageType"],
			[131, "ImageOrientation"],
			[135, "LanguageIdentifier"],
			[150, "AudioType"],
			[151, "AudioSamplingRate"],
			[152, "AudioSamplingResolution"],
			[153, "AudioDuration"],
			[154, "AudioOutcue"],
			[184, "JobID"],
			[185, "MasterDocumentID"],
			[186, "ShortDocumentID"],
			[187, "UniqueDocumentID"],
			[188, "OwnerID"],
			[200, "ObjectPreviewFileFormat"],
			[201, "ObjectPreviewFileVersion"],
			[202, "ObjectPreviewData"],
			[221, "Prefs"],
			[225, "ClassifyState"],
			[228, "SimilarityIndex"],
			[230, "DocumentNotes"],
			[231, "DocumentHistory"],
			[232, "ExifCameraInfo"],
			[255, "CatalogSets"]
		]), B(G, "iptc", [
			[10, {
				0: "0 (reserved)",
				1: "1 (most urgent)",
				2: "2",
				3: "3",
				4: "4",
				5: "5 (normal urgency)",
				6: "6",
				7: "7",
				8: "8 (least urgent)",
				9: "9 (user-defined priority)"
			}],
			[75, {
				a: "Morning",
				b: "Both Morning and Evening",
				p: "Evening"
			}],
			[131, {
				L: "Landscape",
				P: "Portrait",
				S: "Square"
			}]
		]), e.Exifr = ce, e.Options = oe, e.allFormatters = ie, e.chunkedProps = $, e.createDictionary = B, e.default = ft, e.extendDictionary = E, e.fetchUrlAsArrayBuffer = L, e.fileParsers = T, e.fileReaders = D, e.gps = De, e.gpsOnlyOptions = Ae, e.inheritables = te, e.orientation = Re, e.orientationOnlyOptions = Me, e.otherSegments = J, e.parse = fe, e.readBlobAsArrayBuffer = U, e.rotation = Ue, e.rotations = Le, e.segmentParsers = A, e.segments = q, e.segmentsAndBlocks = Z, e.sidecar = async function(e, t, i) {
			let n = new oe(t);
			n.chunked = !1, void 0 === i && "string" == typeof e && (i = function(e) {
				let t = e.toLowerCase().split(".").pop();
				if (function(e) {
					return "exif" === e || "tiff" === e || "tif" === e;
				}(t)) return "tiff";
				if (dt.includes(t)) return t;
			}(e));
			let s = await x(e, n);
			if (i) {
				if (dt.includes(i)) return gt(i, s, n);
				m("Invalid segment type");
			} else {
				if (function(e) {
					let t = e.getString(0, 50).trim();
					return t.includes("<?xpacket") || t.includes("<x:");
				}(s)) return gt("xmp", s, n);
				for (let [e] of A) {
					if (!dt.includes(e)) continue;
					let t = await gt(e, s, n).catch(pt);
					if (t) return t;
				}
				m("Unknown file format");
			}
		}, e.tagKeys = N, e.tagRevivers = V, e.tagValues = G, e.thumbnail = xe, e.thumbnailOnlyOptions = Oe, e.thumbnailUrl = ve, e.tiffBlocks = Q, e.tiffExtractables = ee, Object.defineProperty(e, "__esModule", { value: !0 });
	}));
})))(), 1);
/**
* Detect file type using magic bytes (file signature verification).
* Reads the first 16 bytes of the file and matches them against known signatures.
* @param headerBytes Uint8Array of at least the first 16 bytes.
*/
function detectFileType(headerBytes) {
	if (!headerBytes || headerBytes.length < 4) return {
		isValid: false,
		mimeType: null,
		extension: null,
		detectedFormat: null
	};
	const header = headerBytes.subarray(0, 16);
	if (header[0] === 255 && header[1] === 216 && header[2] === 255) return {
		isValid: true,
		mimeType: "image/jpeg",
		extension: "jpg",
		detectedFormat: "JPEG"
	};
	if (header.length >= 8 && header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71 && header[4] === 13 && header[5] === 10 && header[6] === 26 && header[7] === 10) return {
		isValid: true,
		mimeType: "image/png",
		extension: "png",
		detectedFormat: "PNG"
	};
	if (header[0] === 71 && header[1] === 73 && header[2] === 70 && header[3] === 56) return {
		isValid: true,
		mimeType: "image/gif",
		extension: "gif",
		detectedFormat: "GIF"
	};
	if (header.length >= 12 && header[0] === 82 && header[1] === 73 && header[2] === 70 && header[3] === 70 && header[8] === 87 && header[9] === 69 && header[10] === 66 && header[11] === 80) return {
		isValid: true,
		mimeType: "image/webp",
		extension: "webp",
		detectedFormat: "WEBP"
	};
	if (header[0] === 73 && header[1] === 73 && header[2] === 42 && header[3] === 0) {
		if (header.length >= 12 && header[8] === 67 && header[9] === 82 && header[10] === 2 && header[11] === 0) return {
			isValid: true,
			mimeType: "image/x-canon-cr2",
			extension: "cr2",
			detectedFormat: "Canon RAW (CR2)"
		};
		return {
			isValid: true,
			mimeType: "image/tiff",
			extension: "tiff",
			detectedFormat: "TIFF"
		};
	}
	if (header[0] === 77 && header[1] === 77 && header[2] === 0 && header[3] === 42) return {
		isValid: true,
		mimeType: "image/tiff",
		extension: "tiff",
		detectedFormat: "TIFF"
	};
	if (header.length >= 12 && header[4] === 102 && header[5] === 116 && header[6] === 121 && header[7] === 112) {
		const brand = String.fromCharCode(header[8], header[9], header[10], header[11]).toLowerCase();
		if ([
			"heic",
			"heix",
			"hevc",
			"mif1",
			"msf1"
		].some((b) => brand.includes(b))) return {
			isValid: true,
			mimeType: "image/heic",
			extension: "heic",
			detectedFormat: "HEIC/HEIF"
		};
	}
	return {
		isValid: false,
		mimeType: null,
		extension: null,
		detectedFormat: null
	};
}
// src/core/forensics/hashing.ts
/**
* Calculates a cryptographic hash of an ArrayBuffer using the Web Crypto API.
* @param buffer ArrayBuffer of the binary data.
* @param algorithm 'SHA-256' or 'SHA-1'.
* @returns Hex uppercase representation of the digest.
*/
async function calculateFileHash(buffer, algorithm = "SHA-256") {
	const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
	return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
let idCounter = 0;
/**
* Generates a unique, uppercase forensic session identifier.
* Format: ES-[BASE36_TIMESTAMP]-[RANDOM_3] (REQ-HASH-002)
* @param timestamp Optional timestamp integer (defaults to Date.now()).
*/
function generateForensicId(timestamp = Date.now()) {
	const base = timestamp.toString(36).toUpperCase();
	idCounter = (idCounter + 1) % 46656;
	return `ES-${base}-${idCounter.toString(36).toUpperCase().padStart(3, "0")}`;
}
// src/core/forensics/metadata.ts
const PROPERTY_MAP = {
	Make: "Device Hardware",
	Model: "Device Hardware",
	Software: "Device Hardware",
	LensModel: "Device Hardware",
	LensMake: "Device Hardware",
	BodySerialNumber: "Device Hardware",
	LensSerialNumber: "Device Hardware",
	SerialNumber: "Device Hardware",
	InternalSerialNumber: "Device Hardware",
	ExposureTime: "Exposure Settings",
	FNumber: "Exposure Settings",
	ISO: "Exposure Settings",
	ExposureProgram: "Exposure Settings",
	ExposureBiasValue: "Exposure Settings",
	MeteringMode: "Exposure Settings",
	Flash: "Exposure Settings",
	WhiteBalance: "Exposure Settings",
	ShutterSpeedValue: "Exposure Settings",
	ApertureValue: "Exposure Settings",
	FocalLength: "Optics & Lens",
	FocalLengthIn35mmFormat: "Optics & Lens",
	MaxApertureValue: "Optics & Lens",
	DigitalZoomRatio: "Optics & Lens",
	SubjectDistance: "Optics & Lens",
	PixelXDimension: "Image Quality",
	PixelYDimension: "Image Quality",
	ImageWidth: "Image Quality",
	ImageHeight: "Image Quality",
	ColorSpace: "Image Quality",
	Orientation: "Image Quality",
	Contrast: "Image Quality",
	Saturation: "Image Quality",
	Sharpness: "Image Quality",
	SceneCaptureType: "Image Quality",
	GainControl: "Image Quality",
	DateTimeOriginal: "Timeline & Date",
	CreateDate: "Timeline & Date",
	ModifyDate: "Timeline & Date",
	DateTime: "Timeline & Date",
	SubSecTimeOriginal: "Timeline & Date",
	SubSecTimeDigitized: "Timeline & Date",
	OffsetTime: "Timeline & Date",
	OffsetTimeOriginal: "Timeline & Date",
	OffsetTimeDigitized: "Timeline & Date",
	GPSDateStamp: "Timeline & Date",
	GPSTimeStamp: "Timeline & Date",
	latitude: "Geospatial",
	longitude: "Geospatial",
	GPSLatitude: "Geospatial",
	GPSLongitude: "Geospatial",
	GPSAltitude: "Geospatial",
	GPSImgDirection: "Geospatial",
	GPSDestBearing: "Geospatial",
	GPSSpeed: "Geospatial",
	ExifVersion: "Standards & Info",
	FlashpixVersion: "Standards & Info",
	ComponentsConfiguration: "Standards & Info",
	UserComment: "Standards & Info"
};
/**
* Categorizes arbitrary parsed EXIF tags into 8 standardized forensic domains (REQ-META-001).
*/
function categorizeExif(rawExif) {
	const categories = {
		"Device Hardware": {},
		"Exposure Settings": {},
		"Optics & Lens": {},
		"Image Quality": {},
		"Timeline & Date": {},
		"Geospatial": {},
		"Standards & Info": {},
		"Miscellaneous": {}
	};
	if (!rawExif) return categories;
	for (const [key, value] of Object.entries(rawExif)) {
		if (value == null) continue;
		if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) continue;
		let category = PROPERTY_MAP[key];
		if (!category) {
			const lowerKey = key.toLowerCase();
			if (lowerKey.includes("gps") || lowerKey.includes("latitude") || lowerKey.includes("longitude")) category = "Geospatial";
			else if (key.startsWith("Profile")) category = "Miscellaneous";
			else if (lowerKey.includes("date") || lowerKey.includes("time")) category = "Timeline & Date";
			else category = "Miscellaneous";
		}
		categories[category][key] = value;
	}
	return categories;
}
/**
* Robustly parses camera EXIF date representations into a valid Date object (REQ-META-002).
* Returns null if the value is empty, invalid, or unparseable.
*/
function parseExifDate(dateVal) {
	if (!dateVal) return null;
	if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
	let cleaned = String(dateVal).trim();
	if (!cleaned || cleaned.startsWith("0000:00:00")) return null;
	if (/^\d{4}:\d{2}:\d{2}/.test(cleaned)) cleaned = cleaned.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
	if (/^\d+$/.test(cleaned)) {
		const d = new Date(Number(cleaned));
		if (!isNaN(d.getTime())) return d;
	}
	const dDefault = new Date(cleaned);
	if (!isNaN(dDefault.getTime())) return dDefault;
	const tSeparated = cleaned.replace(" ", "T");
	const d2 = new Date(tSeparated);
	if (!isNaN(d2.getTime())) return d2;
	return null;
}
/**
* Formats a Date instance into standard DD-MM-YYYY HH:mm:ss string.
*/
function formatFullDate(dateVal) {
	const d = parseExifDate(dateVal);
	if (!d || isNaN(d.getTime())) return "Unknown";
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/**
* Formats a Date or EXIF date value into a natural, localized string.
* (e.g. "Selasa, 19 Maret 2019 pukul 16:04:23", "Tuesday, March 19, 2019 at 16:04:23").
*/
function formatNaturalDate(dateVal, locale = "en") {
	const d = dateVal instanceof Date ? dateVal : parseExifDate(dateVal);
	if (!d || isNaN(d.getTime())) return "Unknown";
	const targetLocale = {
		id: "id-ID",
		en: "en-US",
		ar: "ar-SA"
	}[locale] || "en-US";
	let str = new Intl.DateTimeFormat(targetLocale, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}).format(d);
	if (locale === "id") str = str.replace(/pukul (\d{2})\.(\d{2})\.(\d{2})/, "pukul $1:$2:$3");
	return str;
}
// src/core/forensics/integrity.ts
const MEANINGFUL_CATEGORIES = [
	"Device Hardware",
	"Exposure Settings",
	"Optics & Lens",
	"Image Quality",
	"Timeline & Date",
	"Geospatial"
];
const EDITING_SOFTWARE_KEYWORDS = [
	"adobe",
	"photoshop",
	"lightroom",
	"gimp",
	"canva",
	"snapseed",
	"pixlr",
	"corel",
	"affinity",
	"picsart",
	"paint.net",
	"illustrator"
];
function evaluateSingleAssetIntegrity(asset, _now = /* @__PURE__ */ new Date()) {
	const alerts = [];
	const exif = asset.exifData || {};
	const hasGps = exif.latitude != null && exif.longitude != null;
	const hasDateTime = Boolean(exif.DateTimeOriginal || exif.CreateDate || exif.DateTime || exif.ModifyDate);
	const hasMake = Boolean(exif.Make || exif.Model);
	const hasExposure = Boolean(exif.ExposureTime || exif.FNumber || exif.ISO);
	const categorized = categorizeExif(exif);
	const hasAnyExif = MEANINGFUL_CATEGORIES.some((cat) => Object.keys(categorized[cat]).length > 0);
	if (!hasAnyExif && !hasGps) {
		alerts.push({
			type: "fully_stripped",
			severity: "info",
			defaultMessage: "No EXIF metadata found in this file."
		});
		return alerts;
	}
	const missingPillars = [];
	if (!hasGps) missingPillars.push("gps");
	if (!hasDateTime) missingPillars.push("datetime");
	if (!hasMake && !hasExposure) missingPillars.push("device");
	if (missingPillars.length >= 2 && hasAnyExif) for (const pillar of missingPillars) alerts.push({
		type: `missing_${pillar}`,
		severity: "info",
		defaultMessage: `Selective Metadata Removal: ${pillar.toUpperCase()} data is absent while other metadata is present.`
	});
	const software = typeof exif.Software === "string" ? exif.Software : "";
	if (software) {
		const softwareLower = software.toLowerCase();
		if (EDITING_SOFTWARE_KEYWORDS.some((kw) => softwareLower.includes(kw))) alerts.push({
			type: "editing_software",
			severity: "info",
			messageParam: { software },
			defaultMessage: `Editing software signature found: "${software}". This image was likely saved or processed using an image editor.`
		});
	}
	const originalDate = parseExifDate(exif.DateTimeOriginal || exif.CreateDate || exif.DateTime);
	const modifyDate = parseExifDate(exif.ModifyDate);
	const fileDate = typeof asset.fileDate === "number" && !Number.isNaN(asset.fileDate) ? new Date(asset.fileDate) : null;
	if (originalDate) {
		if (originalDate.getTime() > _now.getTime() + 3e5) alerts.push({
			type: "future_capture_date",
			severity: "warning",
			messageParam: { date: formatFullDate(originalDate) },
			defaultMessage: `Chronological Anomaly: Capture date (${formatFullDate(originalDate)}) is in the future. This indicates possible timestamp manipulation.`
		});
		if (fileDate && originalDate.getTime() > fileDate.getTime() + 5e3) alerts.push({
			type: "capture_after_file_modification",
			severity: "warning",
			messageParam: {
				date: formatFullDate(originalDate),
				fileDate: formatFullDate(fileDate)
			},
			defaultMessage: `Chronological Mismatch: Capture date (${formatFullDate(originalDate)}) is newer than the file modification date (${formatFullDate(fileDate)}). This is chronologically impossible.`
		});
	}
	if (!originalDate && (modifyDate || software)) alerts.push({
		type: "missing_original_metadata",
		severity: "warning",
		messageParam: { indicator: software || (modifyDate ? "ModifyDate" : "") },
		defaultMessage: "Stripped Capture Metadata: Original capture timestamp is missing, but post-processing indicators are present."
	});
	const rawExifWidth = exif.ExifImageWidth ?? exif.PixelXDimension ?? exif.ImageWidth;
	const rawExifHeight = exif.ExifImageHeight ?? exif.PixelYDimension ?? exif.ImageHeight;
	const actualWidth = asset.actualWidth;
	const actualHeight = asset.actualHeight;
	if (rawExifWidth != null && rawExifHeight != null && actualWidth != null && actualHeight != null) {
		const exifWidth = Number(rawExifWidth);
		const exifHeight = Number(rawExifHeight);
		const numActualWidth = Number(actualWidth);
		const numActualHeight = Number(actualHeight);
		if (!Number.isNaN(exifWidth) && !Number.isNaN(exifHeight) && !Number.isNaN(numActualWidth) && !Number.isNaN(numActualHeight) && (exifWidth !== numActualWidth || exifHeight !== numActualHeight)) alerts.push({
			type: "dimension_mismatch",
			severity: "warning",
			messageParam: {
				exifWidth,
				exifHeight,
				actualWidth: numActualWidth,
				actualHeight: numActualHeight
			},
			defaultMessage: `Dimension Mismatch: EXIF metadata reports image dimensions as ${exifWidth}x${exifHeight}, but the actual pixel array size is ${numActualWidth}x${numActualHeight}. This suggests the image was cropped or resized without updating the EXIF metadata.`
		});
	}
	if (exif.latitude != null && exif.longitude != null) {
		const lat = Number(exif.latitude);
		const lng = Number(exif.longitude);
		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			if (Math.abs(lat) < 1e-4 && Math.abs(lng) < 1e-4) alerts.push({
				type: "null_island",
				severity: "critical",
				defaultMessage: "Geospatial Spoofing: Coordinates point to Null Island (0, 0), indicating invalid or spoofed GPS data."
			});
			else if (Number.isInteger(lat) || Number.isInteger(lng)) alerts.push({
				type: "integer_coordinate_precision",
				severity: "warning",
				defaultMessage: "Synthetic Coordinates: Latitude or longitude has integer precision, suggesting manual or synthetic coordinate entry."
			});
		}
	}
	return alerts;
}
// src/cli/loader.ts
var FileNotFoundError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "FileNotFoundError";
	}
};
var InvalidJsonError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "InvalidJsonError";
	}
};
var UnsupportedFormatError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "UnsupportedFormatError";
	}
};
var ScenarioNotFoundError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ScenarioNotFoundError";
	}
};
function resolveScenariosDirectory() {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	const candidateFromBin = path.resolve(currentDir, "../tests/fixtures/scenarios");
	if (fs.existsSync(candidateFromBin)) return candidateFromBin;
	const candidateFromSrc = path.resolve(currentDir, "../../tests/fixtures/scenarios");
	if (fs.existsSync(candidateFromSrc)) return candidateFromSrc;
	const candidateFromCwd = path.resolve(process.cwd(), "tests/fixtures/scenarios");
	if (fs.existsSync(candidateFromCwd)) return candidateFromCwd;
	return candidateFromBin;
}
function mapRawObjectToAsset(raw, fallbackFileName, contentBytes, fallbackSha256, fallbackSha1) {
	const fileName = typeof raw.fileName === "string" && raw.fileName ? raw.fileName : fallbackFileName;
	const fileSize = typeof raw.fileSize === "number" ? raw.fileSize : contentBytes ?? 0;
	const fileDate = typeof raw.fileDate === "number" ? raw.fileDate : Date.now();
	const fileType = typeof raw.fileType === "string" ? raw.fileType : "image/jpeg";
	const exifData = raw.exifData && typeof raw.exifData === "object" ? raw.exifData : raw;
	const actualWidth = typeof raw.actualWidth === "number" ? raw.actualWidth : null;
	const actualHeight = typeof raw.actualHeight === "number" ? raw.actualHeight : null;
	const sha256 = typeof raw.sha256 === "string" ? raw.sha256 : fallbackSha256 ?? "0000000000000000000000000000000000000000000000000000000000000000";
	const sha1 = typeof raw.sha1 === "string" ? raw.sha1 : fallbackSha1 ?? "0000000000000000000000000000000000000000";
	return {
		id: typeof raw.id === "string" ? raw.id : generateForensicId(),
		fileName,
		fileSize,
		fileType,
		fileDate,
		sha256,
		sha1,
		actualWidth,
		actualHeight,
		exifData,
		categorizedExif: categorizeExif(exifData),
		integrityAlerts: evaluateSingleAssetIntegrity({
			fileName,
			fileSize,
			fileDate,
			exifData,
			actualWidth,
			actualHeight
		})
	};
}
function resolveFsPath(targetPath) {
	if (targetPath.startsWith("~/") || targetPath === "~") return path.join(os.homedir(), targetPath.slice(1));
	if (path.isAbsolute(targetPath)) return targetPath;
	return path.resolve(process.cwd(), targetPath);
}
async function loadAssetSource(resolvedPath) {
	const absPath = resolveFsPath(resolvedPath);
	try {
		await fs.promises.stat(absPath);
	} catch {
		throw new FileNotFoundError(`File not found: ${resolvedPath}`);
	}
	if (path.extname(absPath).toLowerCase() === ".json") return loadJsonAsset(absPath, resolvedPath);
	return loadImageAsset(absPath, resolvedPath);
}
async function loadJsonAsset(absPath, displayPath) {
	const contentBuffer = await fs.promises.readFile(absPath);
	const contentString = contentBuffer.toString("utf8");
	let parsed;
	try {
		parsed = JSON.parse(contentString);
	} catch (err) {
		throw new InvalidJsonError(`Invalid JSON in ${displayPath}: ${err instanceof Error ? err.message : String(err)}`);
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InvalidJsonError(`JSON in ${displayPath} must be an object representing an asset.`);
	const arrayBuf = contentBuffer.buffer.slice(contentBuffer.byteOffset, contentBuffer.byteOffset + contentBuffer.byteLength);
	const [sha256, sha1] = await Promise.all([calculateFileHash(arrayBuf, "SHA-256"), calculateFileHash(arrayBuf, "SHA-1")]);
	return mapRawObjectToAsset(parsed, path.basename(absPath), contentBuffer.byteLength, sha256, sha1);
}
async function loadImageAsset(absPath, displayPath) {
	const fileBuffer = await fs.promises.readFile(absPath);
	const signature = detectFileType(new Uint8Array(fileBuffer.subarray(0, 16)));
	if (!signature.isValid) throw new UnsupportedFormatError(`Unsupported image format for '${displayPath}'.`);
	const arrayBuf = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
	const [sha256, sha1] = await Promise.all([calculateFileHash(arrayBuf, "SHA-256"), calculateFileHash(arrayBuf, "SHA-1")]);
	let rawExif = {};
	try {
		const parsed = await import_full_umd.default.parse(fileBuffer, true);
		if (parsed && typeof parsed === "object") rawExif = parsed;
	} catch {}
	const stat = await fs.promises.stat(absPath);
	const fileName = path.basename(absPath);
	const fileSize = stat.size;
	const fileDate = Math.floor(stat.mtimeMs);
	const fileType = signature.mimeType || "image/jpeg";
	const id = generateForensicId();
	const widthVal = rawExif.ImageWidth ?? rawExif.PixelXDimension ?? rawExif.ExifImageWidth;
	const heightVal = rawExif.ImageHeight ?? rawExif.PixelYDimension ?? rawExif.ExifImageHeight;
	const actualWidth = typeof widthVal === "number" ? widthVal : null;
	const actualHeight = typeof heightVal === "number" ? heightVal : null;
	const categorizedExif = categorizeExif(rawExif);
	const integrityAlerts = evaluateSingleAssetIntegrity({
		fileName,
		fileSize,
		fileDate,
		exifData: rawExif,
		actualWidth,
		actualHeight
	});
	return {
		id,
		fileName,
		fileSize,
		fileType,
		fileDate,
		sha256,
		sha1,
		actualWidth,
		actualHeight,
		exifData: rawExif,
		categorizedExif,
		integrityAlerts
	};
}
function collectAvailableScenarios(dir, baseDir) {
	if (!fs.existsSync(dir)) return [];
	const results = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) results.push(...collectAvailableScenarios(fullPath, baseDir));
		else if (entry.isFile() && entry.name.endsWith(".json")) {
			const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
			results.push(relPath.replace(/\.json$/, ""));
		}
	}
	return results;
}
async function resolveScenario(scenarioName) {
	const scenariosDir = resolveScenariosDirectory();
	const cleanName = scenarioName.replace(/\.json$/, "");
	const candidatePaths = [
		path.join(scenariosDir, `${cleanName}.json`),
		path.join(scenariosDir, "single", `${cleanName}.json`),
		path.join(scenariosDir, "batch", `${cleanName}.json`),
		path.join(scenariosDir, cleanName)
	];
	let resolvedFile = null;
	for (const cand of candidatePaths) if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
		resolvedFile = cand;
		break;
	}
	if (!resolvedFile) throw new ScenarioNotFoundError(`Scenario '${scenarioName}' not found. Available scenarios: ${collectAvailableScenarios(scenariosDir, scenariosDir).join(", ")}`);
	const contentBuffer = await fs.promises.readFile(resolvedFile);
	let parsed;
	try {
		parsed = JSON.parse(contentBuffer.toString("utf8"));
	} catch (err) {
		throw new InvalidJsonError(`Invalid JSON in scenario '${scenarioName}': ${err instanceof Error ? err.message : String(err)}`);
	}
	if (Array.isArray(parsed)) return parsed.map((item, index) => {
		return mapRawObjectToAsset(item, `${path.basename(resolvedFile, ".json")}_${index + 1}.jpg`);
	});
	if (parsed && typeof parsed === "object") return mapRawObjectToAsset(parsed, path.basename(resolvedFile, ".json") + ".jpg");
	throw new InvalidJsonError(`Scenario '${scenarioName}' must contain an object or array of objects.`);
}
async function extractBaseline(sourceImagePath, destinationJsonPath) {
	const absSource = resolveFsPath(sourceImagePath);
	try {
		await fs.promises.stat(absSource);
	} catch {
		throw new FileNotFoundError(`Source image not found: ${sourceImagePath}`);
	}
	const fileBuffer = await fs.promises.readFile(absSource);
	let rawExif = {};
	try {
		const parsed = await import_full_umd.default.parse(fileBuffer, true);
		if (parsed && typeof parsed === "object") rawExif = parsed;
	} catch {}
	if (destinationJsonPath) {
		const absDest = resolveFsPath(destinationJsonPath);
		await fs.promises.mkdir(path.dirname(absDest), { recursive: true });
		await fs.promises.writeFile(absDest, JSON.stringify(rawExif, null, 2), "utf8");
	}
	return rawExif;
}
// src/locales/en.json
var en_default = {
	ui: {
		"title": "ExifSense | Photo Analysis & Privacy",
		"logo_sense": "SENSE",
		"yes": "Yes",
		"no": "No",
		"export_report": "Export Report",
		"pdf_doc": "PDF Document",
		"md_file": "Markdown File",
		"json_file": "JSON Data File",
		"csv_dataset": "CSV Dataset",
		"copy_clipboard": "Copy to Clipboard",
		"copied_to_clipboard": "Copied to clipboard!",
		"swipe_hint": "Swipe to switch categories",
		"analyze_new": "Analyze New",
		"hero_badge": "Digital Metadata for Everyone",
		"hero_title_part1": "Reveal the Data Behind",
		"hero_title_span": "Every Image",
		"hero_desc": "You don't need to be an expert to understand the hidden information in your photos. ExifSense makes it easy for anyone to read location, device, and image history—securely and privately.",
		"begin_investigation": "Start Exploring",
		"review_history": "Review History",
		"tab_new": "New Analysis",
		"tab_history": "History",
		"mode_single": "Single Asset",
		"mode_batch": "Batch Analysis",
		"mode_remove": "Remove Metadata",
		"mode_single_desc": "Analyze one image with a detailed breakdown of camera settings, map location, image history, and quality details.",
		"mode_batch_desc": "Analyze multiple images simultaneously with side-by-side comparison, travel route map, and combined metadata insights.",
		"mode_remove_desc": "Strip metadata from your photos to protect privacy. Supports batch processing — select multiple files at once to sanitize all in sequence.",
		"sanitize_asset": "Sanitize Metadata",
		"remove_all": "Remove All",
		"remove_all_desc": "Complete sanitization (Recommended)",
		"remove_specific": "Remove Specific",
		"remove_specific_desc": "Choose categories to strip",
		"download_cleaned": "Download Cleaned Photo",
		"download_all_sanitized": "Download All Sanitized",
		"customize_options": "Customize Options",
		"customize_file_options": "Customize Options for File",
		"reset_to_global": "Reset to Global",
		"apply": "Apply",
		"batch": "Batch",
		"processing": "Processing...",
		"err_no_entries": "No files could be processed.",
		"batch_confirm_title": "Batch Staging",
		"batch_confirm_msg": "You currently have {count} file(s) staged. Would you like to proceed with the analysis now?",
		"add_more": "Add More Files",
		"process_now": "Process Now",
		"staged_files_title": "Staged Queue",
		"clear_staging": "Clear Queue",
		"process_staged_btn": "Process All Files",
		"removal_modal_title": "Metadata Removal Options",
		"removal_modal_desc": "Select which information you would like to strip from this image.",
		"cat_gps_removal": "Location Information (GPS)",
		"cat_device_removal": "Device Information",
		"cat_camera_removal": "Camera Settings Information",
		"dropzone_prompt": "Drop your images here or click to browse",
		"dropzone_hint": "JPG, PNG, TIFF, HEIC (Local Processing)",
		"advisory_title": "Technical Advisory",
		"advisory_mobile_warn": "Mobile Users: Capturing photos directly via browser may result in missing geospatial metadata due to browser privacy sandboxing.",
		"advisory_recommend": "To preserve maximum metadata details, we recommend using your device's native camera app first, then selecting the file from your gallery via the \"Files\" option.",
		"filter_all": "All",
		"filter_single": "Single",
		"filter_batch": "Batch",
		"search_placeholder": "Search history...",
		"clear_history": "Clear All History",
		"feature_secure_title": "Secure by Design",
		"feature_secure_desc": "100% local browser processing. No image assets or EXIF tags are ever transmitted to a server, keeping your data confidential.",
		"feature_spoof_title": "Spoofing Protection",
		"feature_spoof_desc": "Validates assets at the binary level using Magic Bytes signatures. Detects disguised extensions and rejects malicious files.",
		"feature_integrity_title": "Integrity Analysis",
		"feature_integrity_desc": "Automatically computes SHA-256/SHA-1 hashes and analyzes metadata for chronological anomalies, tampering, and edit history.",
		"feature_image_analysis_title": "Automatic Image Analysis",
		"feature_image_analysis_desc": "Upload any photo and the system automatically extracts and organizes all hidden metadata into a clean, human-readable dashboard. See device details, location, timestamps, camera settings, and more — all presented clearly so anyone can understand the story behind their images.",
		"feature_sanitize_title": "Metadata Sanitization",
		"feature_sanitize_desc": "Easily strip GPS coordinates, camera details, and personal information from your photos before sharing. Supports batch sanitization — process multiple files in sequence with per-file customization options.",
		"extracting_metadata": "Extracting Metadata...",
		"analyzing_text": "Analyzing Assets...",
		"geospatial_data": "Geospatial Data",
		"show_route": "Show Route",
		"combined_intel": "Combined Analysis",
		"cross_asset": "Cross-Asset Analysis",
		"select_asset": "Select Asset to Inspect",
		"asset_count": "{n} Assets",
		"individual_analysis": "Individual Asset Analysis",
		"dynamic_asset_analysis": "{name} Analysis",
		"forensic_grade": "Complete Details",
		"source_file": "Source File",
		"confirm_title": "Confirm Action",
		"confirm_message": "Are you sure you want to proceed?",
		"cancel": "Cancel",
		"confirm": "Confirm",
		"history_empty": "Your history is empty. Start a new analysis to see items here.",
		"cat_hardware": "Device Hardware",
		"cat_exposure": "Exposure Settings",
		"cat_optics": "Optics & Lens",
		"cat_quality": "Image Quality",
		"cat_timeline": "Timeline & Date",
		"cat_geospatial": "Geospatial",
		"cat_standards": "Standards & Info",
		"cat_misc": "Miscellaneous",
		"file_name": "Name",
		"file_type": "Type",
		"file_size": "Size",
		"file_date": "File System (Last Modified)",
		"analysis_hardware": "Hardware Analysis",
		"analysis_exposure": "Exposure Analysis",
		"analysis_optics": "Optics Analysis",
		"analysis_quality": "Quality Analysis",
		"analysis_timeline": "Timeline Analysis",
		"analysis_geospatial": "Geospatial Analysis",
		"analysis_integrity": "Integrity Analysis",
		"view_details": "View {cat} Details",
		"no_exif_title": "No EXIF Data Found",
		"no_exif_desc": "This image has been stripped of its metadata or did not contain any to begin with.",
		"gps_coords": "LAT: {lat} | LNG: {lng}",
		"no_gps": "No GPS signatures found in this asset.",
		"history_no_matches": "No matches found for \"{query}\"",
		"history_no_analyses": "No previous analyses found",
		"history_more": "{name} + {n} more",
		"history_delete_title": "Delete record",
		"history_delete_confirm_title": "Delete Analysis Record",
		"history_delete_confirm_msg": "Are you sure you want to permanently purge the record for \"{name}\"? This action cannot be reversed.",
		"history_delete_confirm_btn": "Purge Record",
		"history_clear_confirm_title": "Delete All Records",
		"history_clear_confirm_msg": "This will permanently remove all analysis sessions from your browser storage. This action cannot be reversed.",
		"history_clear_confirm_btn": "Purge All Records",
		"history_unknown_device": "Unknown Device",
		"history_sanitized_badge": "Sanitized",
		"sanitized_session_title": "Cleaned: {name}",
		"sanitized_device_short": "Device",
		"sanitized_camera_short": "Camera",
		"sanitized_date_short": "Date",
		"reupload_required_title": "Original File Required",
		"reupload_required_msg": "Metadata removal requires the original file data. Since you are accessing this from history, please re-upload the original file in the New Analysis tab using the \"Remove Metadata\" mode.",
		"go_to_upload": "Reset & Upload",
		"sanitization_complete_title": "Sanitization Complete",
		"sanitization_complete_msg": "Your image has been cleaned and the download has started.",
		"done": "Done",
		"err_batch_limit": "Batch limit exceeded. Please upload a maximum of {n} files at once.",
		"err_invalid_files": "Please select valid image files (max 100MB each).",
		"err_sanitize_failed": "Sanitization failed. Please try again.",
		"err_invalid_signature": "File \"{name}\" contains an unrecognized format signature or corrupt headers.",
		"warn_extension_mismatch": "Format Alert: File \"{name}\" exhibits a mismatched extension. Restored to actual structure: {detected}.",
		"hash_copied": "Hash copied to clipboard!",
		"integrity_title": "Digital Integrity Verification",
		"tab_verify": "Verify Manifest",
		"verify_dropzone_prompt": "Drop a signed manifest JSON file here or click to browse",
		"verify_dropzone_hint": "JSON Manifest Files only (.json)",
		"identity_title": "Digital Identity Signature",
		"stamp_desc": "This unique cryptographic ID is used to sign all metadata manifests exported in this session.",
		"regenerate_identity": "Regenerate Identity",
		"verify_invalid_signature": "Signature verification failed! The manifest file has been tampered with or corrupted.",
		"verify_success": "Signature verified successfully! The manifest is authentic and untampered.",
		"verify_signed_by": "Signed by User ID: {id} on {date}",
		"evidence_verification": "Photo Integrity Verification",
		"evidence_verify_prompt": "Drop the original image files here to check their integrity against this manifest.",
		"evidence_verify_hint": "Drag and drop the files to calculate and match hashes.",
		"manifest_asset_match": "Asset verified: {name} is unaltered.",
		"manifest_asset_mismatch": "Asset tampered: {name} content has been modified!",
		"manifest_asset_missing": "Asset missing from drop: {name} was in the manifest but has not been verified.",
		"chain_custody": "Data Verification & Sealing",
		"export_signed_manifest": "Signed Data Manifest",
		"export_section_integrity": "Data Sealing & Integrity",
		"export_section_reports": "Export Reports",
		"key_backup_success": "Identity Key Backup downloaded successfully.",
		"key_restore_success": "User identity successfully restored!",
		"key_restore_error": "Failed to restore identity key. Invalid file.",
		"confirm_regenerate": "Are you sure you want to regenerate your identity? Your current key will be replaced.",
		"confirm_regenerate_title": "Regenerate Identity",
		"regenerate_btn": "Regenerate",
		"key_regenerate_success": "New cryptographic identity generated successfully!",
		"verify_invalid_manifest": "Failed to read manifest file. Ensure it is valid JSON and contains signature.",
		"evidence_matching_updated": "Photo files verified against manifest.",
		"passphrase_title_backup": "Set Passphrase",
		"passphrase_desc_backup": "Please enter a passphrase to encrypt your private key backup.",
		"passphrase_title_restore": "Enter Passphrase",
		"passphrase_desc_restore": "Please enter the passphrase to decrypt your private key backup.",
		"passphrase_placeholder": "Enter passphrase...",
		"passphrase_error_empty": "Passphrase cannot be empty.",
		"passphrase_error_invalid": "Incorrect passphrase. Please try again.",
		"sanitize_presets_title": "Quick Presets",
		"sanitize_presets_desc": "Select a preset to quickly toggle metadata settings for your sharing needs:",
		"preset_max_privacy": "Max Privacy",
		"preset_photo_share": "Photographer Share",
		"preset_location_only": "Remove Location Only",
		"selective_controls_title": "Selective Metadata Controls",
		"sanitize_toggle_date": "Remove Date & Time Taken",
		"location_hidden": "Location Info Removed",
		"no_location_found": "No location coordinates found",
		"no_device_found": "No device manufacturer or model info found",
		"no_exposure_found": "No camera exposure settings found",
		"no_date_found": "No timestamp found",
		"metadata_preview": "Metadata Preview (Real-Time)",
		"status_removed": "Will Be Removed",
		"status_kept": "Kept",
		"privacy_analysis": "Image Privacy Analysis",
		"privacy_score_safe": "Highly Secure",
		"privacy_score_risk": "Contains Sensitive Data",
		"privacy_desc_safe": "All sensitive information is stripped or clean. This photo is safe to share freely.",
		"privacy_desc_risk": "This photo still retains information that could reveal your identity or location if shared.",
		"privacy_item_gps_risk": "Precise GPS Location: Coordinates ({coords}) found. Makes it easy for others to track your whereabouts.",
		"privacy_item_gps_safe": "GPS location will be removed (safe).",
		"privacy_item_gps_none": "No GPS location data found in this photo.",
		"privacy_item_date_risk": "Original Capture Time: Timestamp ({time}) found. Reveals exactly when you took this photo.",
		"privacy_item_date_safe": "Capture timestamp will be removed (safe).",
		"privacy_item_date_none": "No capture timestamp found in this photo.",
		"privacy_item_device_risk": "Device Make & Model: Model ({device}) found. Reveals your personal device model.",
		"privacy_item_device_safe": "Manufacturer & model info will be removed (safe).",
		"privacy_item_device_none": "No device manufacturer or model info found.",
		"privacy_item_camera_risk": "Camera Settings & Lens: Technical details ({settings}) found. Reveals exposure and optics configuration.",
		"privacy_item_camera_safe": "Camera exposure & lens info will be removed (safe).",
		"privacy_item_camera_none": "No lens or camera exposure settings found.",
		"guide_btn": "Guide",
		"guide_title": "How to Use ExifSense",
		"guide_tab_overview": "Overview",
		"guide_tab_navigation": "Navigation",
		"guide_tab_features": "Features",
		"guide_overview_intro": "ExifSense is an image metadata and privacy tool that runs entirely in your browser — no servers, no uploads, no data leaves your machine. It reads hidden metadata from photos and transforms it into clear, human-readable insights. Whether you're learning about camera settings, tracing a travel journey, or cleaning sensitive location data before sharing, ExifSense keeps everything private and zero-footprint.",
		"guide_feat_secure_title": "Secure by Design",
		"guide_feat_secure_desc": "100% local processing — your images never leave your device. No server uploads, no data leakage.",
		"guide_feat_integrity_title": "Integrity Analysis",
		"guide_feat_integrity_desc": "SHA-256 / SHA-1 hashing with anomaly detection to verify image authenticity and detect tampering.",
		"guide_feat_spoof_title": "Spoofing Protection",
		"guide_feat_spoof_desc": "Validates file signatures at the binary level using Magic Bytes, rejecting disguised or malicious files.",
		"guide_feat_sanitize_overview_title": "Metadata Sanitization",
		"guide_feat_sanitize_overview_desc": "Strip GPS coordinates, camera details, and personal information with selective controls before sharing.",
		"guide_nav_header_title": "Navigation Bar",
		"guide_nav_header_desc": "The navigation bar provides quick access to the Guide button, language settings, and contextual controls like Export and Sanitize that appear after analysis.",
		"guide_nav_upload_title": "Upload Zone",
		"guide_nav_upload_desc": "Three modes to choose from: Single Asset for one photo, Batch Analysis for multiple files, and Remove Metadata for sanitization. Switch modes via tabs or arrow keys on mobile.",
		"guide_nav_dashboard_title": "Dashboard",
		"guide_nav_dashboard_desc": "After analysis, the dashboard displays the image preview, an interactive GPS map, clear narrative insights, and categorized metadata tables. Batch analyses include a cross-asset comparison panel.",
		"guide_nav_history_title": "History Panel",
		"guide_nav_history_desc": "Every session is stored in your browser's local storage. Filter by type (Single / Batch), search by filename, and reload past analyses. Sanitized sessions are marked with an amber border.",
		"guide_feat_analyze_title": "Analyze a Photo",
		"guide_feat_analyze_desc": "Select Single Asset mode, then drag and drop a photo or click to browse. ExifSense extracts all metadata, generates plain-language insights, plots GPS on the map, and computes SHA hashes.",
		"guide_feat_batch_title": "Batch Analysis",
		"guide_feat_batch_desc": "Switch to Batch Analysis mode and add multiple files. Stage them in a queue before processing. After analysis, use the asset selector to switch between photos and view combined travel and camera insights.",
		"guide_feat_sanitize_title": "Sanitize Metadata",
		"guide_feat_sanitize_desc": "Select Remove Metadata mode to enter the sanitizer studio. Use quick presets or toggle individual categories. Supports batch processing — sanitize multiple files in sequence with one click. Preview which tags are removed before downloading the cleaned file.",
		"guide_btn_start": "Start Exploring",
		"guide_btn_history": "Review History",
		"hero_subtitle": "Client-side image verification, manipulation heuristics, timeline reconstruction, and surgical privacy sanitization.",
		"dropzone_title_single": "Drop Image for Forensic Inspection",
		"dropzone_subtitle_single": "Inspect EXIF, detect manipulation, calculate hashes",
		"dropzone_title_batch": "Drop Photos for Collective Analysis",
		"dropzone_subtitle_batch": "Compare hardware signatures & timeline spread (up to 50)",
		"dropzone_title_remove": "Drop Image for Instant Sanitization",
		"dropzone_subtitle_remove": "Surgically strip GPS, device, and timeline metadata",
		"clear_all": "Clear All",
		"remove": "Remove",
		"process_assets_btn": "Process Assets",
		"open_sanitizer_studio": "Open Sanitizer Studio",
		"evidence_preview": "Evidence Overview",
		"investigation_assets": "Investigation Assets",
		"collective_intelligence": "Collective Intelligence",
		"integrity_matrix_title": "Integrity Verification Matrix",
		"assets": "Assets",
		"no_narrative_available": "No metadata narrative available.",
		"no_metadata_found": "No metadata properties recorded for this domain.",
		"geospatial_map": "Geospatial Travel Mapping",
		"no_gps_recorded": "No GPS coordinates found in loaded image metadata.",
		"geotagged_assets": "Geotagged",
		"quick_presets": "Quick Presets",
		"strip_categories": "Metadata Categories to Strip",
		"privacy_protected": "Protected: All Sensitive Metadata Selected for Removal",
		"privacy_risk_detected": "Privacy Risk: Sensitive Metadata Remains Unstripped",
		"safe_to_publish_desc": "No identifying device serials, coordinates, or timestamps will remain in the output.",
		"privacy_risk_desc": "Some private tags are still enabled. Choose a preset or toggle individual options below.",
		"per_file_override_title": "Customize File Sanitization",
		"no_sanitizer_target": "No images loaded for sanitization. Drop a photo to start.",
		"return_to_home": "Return to Home",
		"investigation_history": "Investigation History",
		"history_subtitle": "Review, restore, or export previously analyzed forensic sessions.",
		"clear_all_history": "Clear History",
		"search_history_placeholder": "Search sessions by filename, forensic ID, camera...",
		"no_history_records": "No Historical Sessions Recorded",
		"session_restored": "Historical session restored to workspace!",
		"guide_subtitle": "Learn how to perform client-side image forensics and surgical privacy stripping.",
		"return_to_workspace": "Return to Workspace",
		"session_reset_complete": "Investigation session reset",
		"analysis_complete": "Forensic analysis completed",
		"batch_analysis_complete": "Batch forensic analysis completed",
		"sanitizer_ready": "Photos ready for sanitization",
		"property": "Property",
		"value": "Value",
		"chronological_story_title": "Chronological Story",
		"chronological_story_subtitle": "Sequential timeline reconstruction across the batch",
		"copy_story": "Copy Story",
		"copy_story_markdown": "Copy Markdown",
		"copy_story_plain": "Copy Plain Text",
		"story_copied": "Copied to clipboard",
		"inspect_asset": "Inspect Photo"
	},
	narratives: {
		"integrity_clean": "This photo retains its original date and location details. No common indicators of external editing tools were found in the basic metadata.",
		"integrity_clean_no_gps": "Device and timeline information are intact. No location data was embedded — this is normal if GPS was turned off when the photo was taken.",
		"integrity_clean_no_datetime": "Device and location data are intact. No capture timestamp was recorded — this can happen with screenshots or certain export tools.",
		"integrity_clean_no_device": "Timeline and location data are intact. No device information was recorded — common for screenshots or images shared via social media.",
		"integrity_edit_software": "Recorded Processing Software: The metadata indicates this photo was saved or processed using <strong>{software}</strong>. Some original camera details may have been modified.",
		"integrity_future_date": "Unusual Capture Time: The recorded capture date (<strong>{date}</strong>) is in the future compared to the current system time. This is commonly caused by an incorrectly set camera clock, <strong>but it also raises the possibility of deliberate date modification.</strong>",
		"integrity_capture_after_file": "File Time Difference: The recorded photo capture date (<strong>{date}</strong>) is newer than the file modification date (<strong>{fileDate}</strong>). This can be caused by device time zone variations or file transfers between unsynchronized systems, <strong>but it may also occur if the camera capture date was intentionally adjusted backward.</strong>",
		"integrity_missing_original": "Capture Time Not Found: The original capture time is missing, but processing traces from <strong>{indicator}</strong> are present. While this typically occurs automatically when a photo is exported, <strong>it can also indicate intentional metadata sanitization to remove the original timeline.</strong>",
		"integrity_dimension_mismatch": "Dimension Mismatch: EXIF metadata reports image dimensions as <strong>{exifWidth}x{exifHeight}</strong>, but the actual pixel array size is <strong>{actualWidth}x{actualHeight}</strong>. This mismatch suggests the image was cropped or resized without updating the EXIF metadata, which is common in manual tampering.",
		"integrity_fully_stripped": "No Metadata Available: This file contains no EXIF information. This is a common condition and can happen for a variety of reasons — such as when photos are sent via WhatsApp, social media, or other platforms that automatically remove metadata; it also occurs with screenshots, or when someone intentionally removes metadata to protect their privacy. No technical information can be further analyzed from this file.",
		"integrity_missing_gps": "GPS Location: Not available. The file contains no GPS coordinates.",
		"integrity_missing_datetime": "Capture Time: Not available. No timestamp was found in the file.",
		"integrity_missing_device": "Device Information: Not available. No manufacturer, model, or camera settings found.",
		"hardware": "This photo was taken using an <strong>{make} {model}</strong> camera{lens}.",
		"hardware_software": "The device was running <strong>{software}</strong> when taking this photo.",
		"hardware_analysis": "Analysis indicates a standard and expected camera profile for this device type.",
		"hardware_mod": "This photo was taken with a <strong>{make} {model}</strong>{lens} camera, and subsequently processed or saved via <strong>{software}</strong>.",
		"with_lens": " with a {lens} lens",
		"exposure": "Captured with an aperture of <strong>{aperture}</strong>, shutter speed of <strong>{shutter}</strong>, and sensor sensitivity of <strong>{iso}</strong>{program}.",
		"exp_low_light": "The high sensor sensitivity (ISO) suggests this photo was taken in a dark place or indoors.",
		"exp_bright": "The low ISO and fast shutter speed indicate a well-lit environment, likely outdoors during daylight.",
		"exp_shallow_depth": "The wide aperture creates a blurry background (bokeh effect) to make the main subject stand out.",
		"exp_standard": "The camera settings indicate a standard, well-balanced lighting environment.",
		"unknown_aperture": "unknown aperture",
		"unknown_shutter": "unspecified shutter speed",
		"unspecified_iso": "unspecified ISO",
		"using_program": " using {program} mode",
		"optics": "The lens was set to a focal length of <strong>{focal}</strong>{focal35}{zoom}. This indicates the level of zoom used when taking the photo.",
		"unknown_focal": "unknown focal length",
		"equivalent_35mm": " (equivalent to {mm}mm on a standard 35mm film camera)",
		"digital_zoom": "Digital zoom of {zoom}x was used",
		"quality": "Image resolution is <strong>{width}x{height}</strong> pixels. Camera settings indicate a <strong>{contrast}</strong> contrast level, <strong>{sharpness}</strong> sharpness level, and <strong>{colorSpace}</strong> color space.",
		"timeline_capture": "Taken on: <strong>{dateStr}</strong><br/>",
		"timeline_format": "Original Time Format: <code>{rawStr}</code>",
		"timeline_gmt": "Coordinated Universal Time (GMT/UTC): <code>{gmtStr}</code>",
		"timeline_mod_note": "Note: A subsequent file modification time was detected ({modStr}). This can occur due to file transfer activity between devices, <strong>but it may also indicate that the file was edited or saved again after the original capture.</strong>",
		"timeline_integrity": "The timeline of photo capture appears natural and consistent.",
		"no_chrono": "No capture date or time could be found in this file.",
		"geospatial": "Location analysis shows this photo was taken near <strong>{locationName}</strong> (Coordinates: <strong>{lat}, {lng}</strong>). The location data appears natural and genuine.",
		"remote_location": "an unindexed or remote location",
		"no_geo": "No location data (GPS). This is common if the device's GPS was disabled during capture, <strong>but it can also result from intentional removal of location data before sharing.</strong>",
		"combined_hw_consistent": "All photos in this group were taken with the same camera model: <strong>{device}</strong>. This suggests they were taken by the same person or with a single camera.",
		"combined_hw_discrepancy": "Multiple different cameras detected: <strong>{deviceList}</strong>. This pattern is common when photos are gathered from different people or cameras.",
		"combined_timeline": "All photos were taken within a span of <strong>{diffHours} hours</strong>, starting from {start} to {end}. The timeline is consistent and contains no chronological overlap.",
		"combined_geo_concentrated": "All photos were taken in a very small area (within a 50-meter radius). This suggests the photographer stood in one spot while taking them.",
		"combined_geo_localized": "Location spread indicates a <strong>local area</strong> of about {dist} meters, which is typical for walking distances.",
		"combined_geo_trail": "Location spread shows the photographer traveled about <strong>{dist} km</strong> while taking these photos, likely using a vehicle.",
		"velocity_warning": "Travel Alert: The distance between locations indicates a very high speed of ({speed} km/h). This can occur naturally if photos were taken out of chronological order, if there was a temporary GPS signal delay, or if photos were combined from multiple sources, <strong>but it may also indicate manual modification of the time or location data after capture.</strong>",
		"sanitization_alert": "Core Metadata Not Found: This photo lacks both device and location data. While this is very common automatically when sending photos via messaging apps (like WhatsApp/Telegram) for efficiency and privacy, <strong>it can also be the result of intentional metadata sanitization by the user.</strong>",
		"null_island_warn": "Zero Coordinates (0,0): The location points to the coordinates (0,0). This commonly happens when the camera's GPS sensor has not fully locked a satellite signal before shooting, <strong>but it can also indicate that the location data has been intentionally cleared or removed.</strong>",
		"precision_warn": "Simplified Coordinate Format: The GPS coordinates are represented by simple rounded numbers without the typical random decimal precision recorded by native GPS sensors. While this can happen due to data simplification by third-party apps or manual entry in a gallery, <strong>it may also indicate the intentional use of location-mocking tools.</strong>",
		"combined_serial_match": "Physical Camera Verified: All photos in this batch were taken using the exact same physical camera unit (Serial Number: <strong>{serial}</strong>).",
		"combined_hw_sparse_single": "Only <strong>{count}</strong> of <strong>{total}</strong> photos contain camera info (<strong>{device}</strong>). The rest do not.",
		"combined_hw_sparse_consistent": "<strong>{count}</strong> of <strong>{total}</strong> photos share the same camera: <strong>{device}</strong>. The rest lack camera information.",
		"combined_hw_sparse_discrepancy": "Different camera models detected among photos containing data: <strong>{deviceList}</strong>. The remaining <strong>{missing}</strong> photos lack camera metadata.",
		"combined_timeline_sparse": "Time analysis is limited because only <strong>1</strong> of <strong>{total}</strong> photos has a capture timestamp.",
		"combined_timeline_sparse_note": " Timeline built using the <strong>{count}</strong> photos containing time data.",
		"combined_geo_sparse": "Location analysis is limited because only <strong>1</strong> of <strong>{total}</strong> photos has GPS coordinates.",
		"combined_geo_sparse_note": " Distance calculation based on the <strong>{count}</strong> photos containing location data.",
		"combined_integrity_warning": "Group Consistency Note: The photos in this group have varying levels of metadata completeness.",
		"combined_integrity_stripped_all": "A total of <strong>{count}</strong> out of <strong>{total}</strong> photos lack camera, time, and location data. This commonly happens automatically to photos downloaded from the internet or social media, <strong>but it may also be caused by intentional data clearing before the files were collected.</strong>",
		"combined_integrity_stripped_part": "A total of <strong>{count}</strong> out of <strong>{total}</strong> photos are missing certain data categories (like GPS or camera info). This can be caused by differing device permission settings during capture, <strong>but it also raises the possibility of selective data removal.</strong>",
		"combined_integrity_mix": "Mixed Completeness Status: Out of <strong>{total}</strong> photos, <strong>{fully}</strong> are without metadata details, <strong>{partially}</strong> are missing some details, and only <strong>{clean}</strong> retain complete information.",
		"combined_integrity_clean": "Maximum Original Data: All <strong>{total}</strong> photos retain complete metadata (Camera, Time, and Location info).",
		"no_data_narrative": "Analysis unavailable because this photo lacks the required metadata for this category.",
		"no_metadata_tags": "No standard data tags were found in this category.",
		"filter_all": "All Photos",
		"filter_complete": "Complete Data",
		"filter_stripped": "Without Details",
		"empty_geospatial": "Cannot map location because this photo does not have embedded GPS coordinates.",
		"empty_hardware": "Camera brand and model cannot be determined because the device manufacturer data (Make/Model tags) was deleted.",
		"empty_exposure": "Camera exposure details (Aperture, ISO, Shutter speed) were not found on this photo.",
		"empty_optics": "Lens zoom information cannot be determined because this photo does not have focal length data.",
		"empty_quality": "Image quality is analyzed using general estimates because the main pixel dimension data is missing.",
		"empty_timeline": "Time analysis failed because the original capture date and time were not saved.",
		"empty_all": "Metadata Fully Cleaned: No camera, time, or location info was found in this photo.",
		"reconstruct_btn": "Show Detailed Timeline",
		"integrity_reconstruct_btn": "Show Data Completeness Details",
		"hw_reconstruct_btn": "Compare Camera Details",
		"reconstruct_start": "Start of Capture:",
		"reconstruct_end": "End of Capture:",
		"reconstruct_total": "Total Sequence Duration:",
		"reconstruct_jumps": "Time Gap Between Photos:",
		"reconstruct_missing": "Photos Lacking Time Data ({count}):",
		"geo_reconstruct_btn": "Show Route Details",
		"geo_max_spread": "Furthest Distance Between Points:",
		"geo_reconstruct_range": "Total Travel Distance:",
		"geo_reconstruct_note": "*Estimated distance based on the most probable road routes between the photos' locations.",
		"geo_reconstruct_jumps": "Distance Between Locations:",
		"time_day": "Days",
		"time_hour": "Hours",
		"time_minute": "Minutes",
		"time_second": "Seconds",
		"chrono_baseline_single": "All photos in this batch were captured using the same camera device: {device}.",
		"chrono_baseline_multiple": "Photos in this batch were captured across multiple devices: {devices}.",
		"chrono_baseline_unknown": "Camera device information was not recorded for the photos in this batch.",
		"chrono_initial_location": "The sequence begins with {fileName}, captured on {date} at {location} (coordinates {coordinates}){lens}.",
		"chrono_initial_gps": "The sequence begins with {fileName}, captured on {date} at coordinates {coordinates}{lens}.",
		"chrono_initial_no_gps": "The sequence begins with {fileName}, captured on {date} with no location data recorded{lens}.",
		"chrono_initial_lens": " using lens {lens}",
		"chrono_initial_focal": " at focal length {focal}",
		"chrono_step_location": "{fileName} was captured on {date} ({elapsedTime}), {distance} away from {prevFileName} at {location}.",
		"chrono_step_gps": "{fileName} was captured on {date} ({elapsedTime}), {distance} away from {prevFileName} at coordinates {coordinates}.",
		"chrono_step_location_no_prev_gps": "{fileName} was captured on {date} ({elapsedTime}) at {location}.",
		"chrono_step_gps_no_prev_gps": "{fileName} was captured on {date} ({elapsedTime}) at coordinates {coordinates}.",
		"chrono_step_no_gps": "{fileName} was captured on {date} ({elapsedTime}). Location data was not recorded for this capture.",
		"chrono_device_changed": " Camera device changed from {prevDevice} to {currDevice}.",
		"chrono_lens_changed": " Camera lens changed from {prevLens} to {currLens}.",
		"chrono_focal_changed": " Focal length changed from {prevFocal} to {currFocal}.",
		"time_seconds_later": "{seconds} seconds later",
		"time_minutes_later": "{minutes} minutes later",
		"time_hours_later": "{hours} hours later",
		"time_days_later": "{days} days later"
	},
	reports: {
		"title": "EXIFSENSE METADATA ANALYSIS REPORT",
		"session": "Session",
		"generated": "Generated",
		"asset_count": "Asset Count",
		"combined_intel": "COMBINED METADATA INSIGHTS",
		"asset_header": "ASSET {n}",
		"tech_details": "Technical Source Details",
		"forensic_analysis": "Metadata Analysis Story",
		"raw_metadata": "Raw Metadata Properties",
		"property": "Property",
		"value": "Value",
		"category": "Category",
		"unknown": "Unknown",
		"forensic_id": "Session Identifier"
	}
};
// src/locales/id.json
var id_default = {
	ui: {
		"title": "ExifSense | Analisis Foto & Privasi",
		"logo_sense": "SENSE",
		"yes": "Ya",
		"no": "Tidak",
		"export_report": "Ekspor Laporan",
		"pdf_doc": "Dokumen PDF",
		"md_file": "File Markdown",
		"json_file": "File Data JSON",
		"csv_dataset": "Dataset CSV",
		"copy_clipboard": "Salin ke Clipboard",
		"copied_to_clipboard": "Berhasil disalin ke clipboard!",
		"swipe_hint": "Geser untuk kategori lain",
		"analyze_new": "Analisa Baru",
		"hero_badge": "Metadata Digital untuk Semua",
		"hero_title_part1": "Ungkap Data di Balik",
		"hero_title_span": "Setiap Gambar",
		"hero_desc": "Tidak perlu jadi ahli untuk memahami informasi tersembunyi dalam foto Anda. ExifSense memudahkan siapa saja untuk membaca lokasi, perangkat, dan riwayat gambar secara aman dan privat.",
		"begin_investigation": "Mulai Eksplorasi",
		"review_history": "Tinjau Riwayat",
		"tab_new": "Analisis Baru",
		"tab_history": "Riwayat",
		"mode_single": "Aset Tunggal",
		"mode_batch": "Analisis Batch",
		"mode_remove": "Hapus Metadata",
		"mode_single_desc": "Analisis satu gambar dengan pemeriksaan forensik mendetail atas metadata EXIF, lokasi peta, integritas, dan kualitas.",
		"mode_batch_desc": "Analisis banyak gambar sekaligus dengan perbandingan berdampingan, tampilan peta gabungan, dan laporan intelijen forensik.",
		"mode_remove_desc": "Hapus metadata dari foto untuk melindungi privasi. Mendukung pemrosesan batch — pilih banyak file sekaligus untuk dibersihkan secara berurutan.",
		"sanitize_asset": "Bersihkan Metadata",
		"remove_all": "Hapus Semua",
		"remove_all_desc": "Sanitasi total (Direkomendasikan)",
		"remove_specific": "Hapus Spesifik",
		"remove_specific_desc": "Pilih kategori data yang ingin dihapus",
		"download_cleaned": "Unduh Foto Bersih",
		"download_all_sanitized": "Unduh Semua yang Dibersihkan",
		"customize_options": "Sesuaikan Opsi",
		"customize_file_options": "Sesuaikan Opsi untuk Berkas",
		"reset_to_global": "Kembalikan ke Global",
		"apply": "Terapkan",
		"batch": "Batch",
		"processing": "Memproses...",
		"err_no_entries": "Tidak ada berkas yang dapat diproses.",
		"batch_confirm_title": "Antrean Batch",
		"batch_confirm_msg": "Anda memiliki {count} berkas dalam antrean. Apakah Anda ingin langsung memproses analisis sekarang?",
		"add_more": "Tambah Berkas",
		"process_now": "Proses Sekarang",
		"staged_files_title": "Antrean Unggahan",
		"clear_staging": "Kosongkan Antrean",
		"process_staged_btn": "Proses Semua Berkas",
		"removal_modal_title": "Opsi Pembersihan Metadata",
		"removal_modal_desc": "Pilih informasi yang ingin Anda hapus dari gambar ini.",
		"cat_gps_removal": "Informasi Lokasi (GPS)",
		"cat_device_removal": "Informasi Perangkat",
		"cat_camera_removal": "Informasi Pengaturan Kamera",
		"dropzone_prompt": "Letakkan gambar di sini atau klik untuk mencari",
		"dropzone_hint": "JPG, PNG, TIFF, HEIC (Pemrosesan Lokal)",
		"advisory_title": "Saran Teknis Metadata",
		"advisory_mobile_warn": "Pengguna Seluler: Mengambil foto langsung melalui browser dapat menyebabkan metadata geospasial hilang karena batasan privasi browser.",
		"advisory_recommend": "Untuk mempertahankan informasi detail foto secara maksimal, kami menyarankan menggunakan aplikasi kamera bawaan perangkat Anda terlebih dahulu, lalu pilih file dari galeri melalui opsi \"File\".",
		"filter_all": "Semua",
		"filter_single": "Tunggal",
		"filter_batch": "Batch",
		"search_placeholder": "Cari riwayat...",
		"clear_history": "Hapus Semua Riwayat",
		"feature_secure_title": "Aman secara Desain",
		"feature_secure_desc": "100% pemrosesan di browser lokal. Tidak ada aset gambar atau tag EXIF yang dikirimkan ke server, menjaga kerahasiaan data Anda.",
		"feature_spoof_title": "Perlindungan Spoofing",
		"feature_spoof_desc": "Memvalidasi aset pada tingkat biner menggunakan tanda tangan Magic Bytes. Mendeteksi ekstensi yang disamarkan dan menolak file berbahaya.",
		"feature_integrity_title": "Analisis Integritas",
		"feature_integrity_desc": "Menghitung hash SHA-256/SHA-1 secara otomatis dan menganalisis metadata untuk mendeteksi anomali kronologis, modifikasi, dan riwayat edit.",
		"feature_image_analysis_title": "Analisis Gambar Otomatis",
		"feature_image_analysis_desc": "Unggah foto apa pun dan sistem secara otomatis mengekstrak serta menyajikan semua metadata tersembunyi ke dalam dashboard yang bersih dan mudah dibaca. Lihat detail perangkat, lokasi, stempel waktu, pengaturan kamera, dan lainnya — semuanya disajikan dengan jelas sehingga siapa pun bisa memahami cerita di balik gambar mereka.",
		"feature_sanitize_title": "Pembersihan Metadata (Privasi)",
		"feature_sanitize_desc": "Hapus koordinat GPS, informasi kamera, dan data pribadi lainnya dari foto Anda dengan mudah sebelum dibagikan. Mendukung pemrosesan batch — bersihkan banyak file berurutan dengan opsi kustomisasi per-file.",
		"extracting_metadata": "Mengekstrak Metadata...",
		"analyzing_text": "Menganalisis Aset...",
		"geospatial_data": "Data Geospasial",
		"show_route": "Tampilkan Rute",
		"combined_intel": "Analisis Gabungan",
		"cross_asset": "Analisis Lintas-Aset",
		"select_asset": "Pilih Aset untuk Diperiksa",
		"asset_count": "{n} Aset",
		"individual_analysis": "Analisis Aset Individu",
		"dynamic_asset_analysis": "Analisis {name}",
		"forensic_grade": "Detail Lengkap",
		"source_file": "File Sumber",
		"confirm_title": "Konfirmasi Tindakan",
		"confirm_message": "Apakah Anda yakin ingin melanjutkan?",
		"cancel": "Batal",
		"confirm": "Konfirmasi",
		"history_empty": "Riwayat Anda kosong. Mulai analisis baru untuk melihat item di sini.",
		"cat_hardware": "Perangkat Keras",
		"cat_exposure": "Pengaturan Eksposur",
		"cat_optics": "Optik & Lensa",
		"cat_quality": "Kualitas Gambar",
		"cat_timeline": "Kronologi & Waktu",
		"cat_geospatial": "Geospasial",
		"cat_standards": "Standar & Info",
		"cat_misc": "Lain-lain",
		"file_name": "Nama",
		"file_type": "Tipe",
		"file_size": "Ukuran",
		"file_date": "Sistem File (Terakhir Dimodifikasi)",
		"analysis_hardware": "Analisis Perangkat Keras",
		"analysis_exposure": "Analisis Eksposur",
		"analysis_optics": "Analisis Optik",
		"analysis_quality": "Analisis Kualitas",
		"analysis_timeline": "Analisis Kronologi",
		"analysis_geospatial": "Analisis Geospasial",
		"analysis_integrity": "Analisis Integritas",
		"view_details": "Lihat Detail {cat}",
		"no_exif_title": "Tidak Ada Data EXIF Ditemukan",
		"no_exif_desc": "Gambar ini telah dihapus metadatanya atau memang tidak mengandung metadata sejak awal.",
		"gps_coords": "LAT: {lat} | LNG: {lng}",
		"no_gps": "Tidak ada tanda GPS yang ditemukan pada aset ini.",
		"history_no_matches": "Tidak ada hasil ditemukan untuk \"{query}\"",
		"history_no_analyses": "Tidak ada riwayat analisis ditemukan",
		"history_more": "{name} + {n} lainnya",
		"history_delete_title": "Hapus catatan",
		"history_delete_confirm_title": "Hapus Catatan Analisis",
		"history_delete_confirm_msg": "Apakah Anda yakin ingin menghapus permanen catatan untuk \"{name}\"? Tindakan ini tidak dapat dibatalkan.",
		"history_delete_confirm_btn": "Hapus Catatan",
		"history_clear_confirm_title": "Hapus Semua Rekaman",
		"history_clear_confirm_msg": "Ini akan menghapus semua sesi analisis dari penyimpanan browser Anda secara permanen. Tindakan ini tidak dapat dibatalkan.",
		"history_clear_confirm_btn": "Bersihkan Semua Rekaman",
		"history_unknown_device": "Perangkat Tidak Dikenal",
		"history_sanitized_badge": "Disanitasi",
		"sanitized_session_title": "Bersih: {name}",
		"sanitized_device_short": "Perangkat",
		"sanitized_camera_short": "Kamera",
		"sanitized_date_short": "Tanggal",
		"reupload_required_title": "File Asli Diperlukan",
		"reupload_required_msg": "Pembersihan metadata memerlukan data file asli. Karena Anda mengakses ini dari riwayat, harap unggah kembali file asli di tab Analisis Baru menggunakan mode \"Hapus Metadata\".",
		"go_to_upload": "Reset & Unggah",
		"sanitization_complete_title": "Sanitasi Selesai",
		"sanitization_complete_msg": "Gambar Anda telah dibersihkan dan pengunduhan telah dimulai.",
		"done": "Selesai",
		"err_batch_limit": "Batas batch terlampaui. Harap unggah maksimal {n} file sekaligus.",
		"err_invalid_files": "Harap pilih file gambar yang valid (maks 100MB per file).",
		"err_sanitize_failed": "Pembersihan metadata gagal. Silakan coba lagi.",
		"err_invalid_signature": "Berkas \"{name}\" mengandung tanda format yang tidak dikenal atau header yang rusak.",
		"warn_extension_mismatch": "Peringatan Format: Berkas \"{name}\" menunjukkan ketidaksesuaian ekstensi. Dipulihkan ke format asli: {detected}.",
		"hash_copied": "Hash disalin ke papan klip!",
		"integrity_title": "Verifikasi Integritas Digital",
		"tab_verify": "Verifikasi Manifest",
		"verify_dropzone_prompt": "Lepaskan file manifest JSON yang ditandatangani di sini atau klik untuk menelusuri",
		"verify_dropzone_hint": "Hanya File Manifest JSON (.json)",
		"identity_title": "Tanda Tangan Identitas Digital",
		"stamp_desc": "ID kriptografi unik ini digunakan untuk menandatangani semua manifest metadata yang diekspor dalam sesi ini.",
		"regenerate_identity": "Buat Ulang Identitas",
		"verify_invalid_signature": "Verifikasi tanda tangan gagal! File manifest telah dirusak atau rusak.",
		"verify_success": "Tanda tangan berhasil diverifikasi! Manifest asli dan tidak dirusak.",
		"verify_signed_by": "Ditandatangani oleh ID Pengguna: {id} pada {date}",
		"evidence_verification": "Verifikasi Integritas File Foto",
		"evidence_verify_prompt": "Lepaskan file gambar asli di sini untuk memeriksa integritasnya terhadap manifest ini.",
		"evidence_verify_hint": "Seret dan lepaskan file untuk menghitung dan mencocokkan hash.",
		"manifest_asset_match": "Aset terverifikasi: {name} tidak diubah.",
		"manifest_asset_mismatch": "Aset dirusak: konten {name} telah dimodifikasi!",
		"manifest_asset_missing": "Aset tidak ada dalam drop: {name} ada di manifest tetapi belum diverifikasi.",
		"chain_custody": "Verifikasi & Penyegelan Data",
		"export_signed_manifest": "Manifest Data Tertanda",
		"export_section_integrity": "Penyegelan Data & Integritas",
		"export_section_reports": "Ekspor Laporan",
		"key_backup_success": "Cadangan Kunci Identitas berhasil diunduh.",
		"key_restore_success": "Identitas pengguna berhasil dipulihkan!",
		"key_restore_error": "Gagal memulihkan kunci identitas. File tidak valid.",
		"confirm_regenerate": "Apakah Anda yakin ingin membuat ulang identitas Anda? Kunci saat ini akan diganti.",
		"confirm_regenerate_title": "Buat Ulang Identitas",
		"regenerate_btn": "Buat Ulang",
		"key_regenerate_success": "Identitas kriptografi baru berhasil dibuat!",
		"verify_invalid_manifest": "Gagal membaca file manifest. Pastikan file berupa JSON yang valid dan berisi tanda tangan.",
		"evidence_matching_updated": "File foto berhasil diverifikasi terhadap manifest.",
		"passphrase_title_backup": "Atur Kata Sandi",
		"passphrase_desc_backup": "Silakan masukkan kata sandi untuk mengenkripsi cadangan kunci privat Anda.",
		"passphrase_title_restore": "Masukkan Kata Sandi",
		"passphrase_desc_restore": "Silakan masukkan kata sandi untuk mendekripsi cadangan kunci privat Anda.",
		"passphrase_placeholder": "Masukkan kata sandi...",
		"passphrase_error_empty": "Kata sandi tidak boleh kosong.",
		"passphrase_error_invalid": "Kata sandi salah. Silakan coba lagi.",
		"sanitize_presets_title": "Preset Cepat",
		"sanitize_presets_desc": "Pilih preset untuk menyetel opsi pembersihan secara instan sesuai kebutuhan Anda:",
		"preset_max_privacy": "Maksimal Privasi",
		"preset_photo_share": "Ramah Fotografer",
		"preset_location_only": "Hapus Lokasi Saja",
		"selective_controls_title": "Kontrol Selektif Metadata",
		"sanitize_toggle_date": "Hapus Tanggal & Waktu Pemotretan",
		"location_hidden": "Info Lokasi Dihapus",
		"no_location_found": "Tidak ditemukan koordinat lokasi",
		"no_device_found": "Tidak ditemukan info produsen/model perangkat",
		"no_exposure_found": "Tidak ditemukan pengaturan cahaya (ISO/aperture/rana)",
		"no_date_found": "Tidak ditemukan stempel waktu",
		"metadata_preview": "Pratinjau Metadata (Real-Time)",
		"status_removed": "Akan Dihapus",
		"status_kept": "Dipertahankan",
		"privacy_analysis": "Analisis Privasi Gambar",
		"privacy_score_safe": "Sangat Aman",
		"privacy_score_risk": "Mengandung Data Sensitif",
		"privacy_desc_safe": "Semua informasi sensitif telah disaring atau bersih. Foto ini aman untuk dibagikan secara bebas.",
		"privacy_desc_risk": "Foto ini masih menyimpan informasi yang dapat mengungkap identitas atau lokasi Anda jika dibagikan.",
		"privacy_item_gps_risk": "Lokasi GPS Persis: Koordinat ({coords}) tersimpan. Memudahkan orang lain melacak lokasi fisik Anda.",
		"privacy_item_gps_safe": "Lokasi GPS akan dihapus (aman).",
		"privacy_item_gps_none": "Tidak ada koordinat lokasi GPS dalam foto ini.",
		"privacy_item_date_risk": "Waktu Pemotretan Asli: Waktu ({time}) tersimpan. Membocorkan kapan tepatnya Anda mengambil foto ini.",
		"privacy_item_date_safe": "Stempel waktu pemotretan akan dihapus (aman).",
		"privacy_item_date_none": "Tidak ada stempel waktu pemotretan dalam foto ini.",
		"privacy_item_device_risk": "Merek & Model Perangkat: Model ({device}) tersimpan. Membocorkan jenis HP/kamera Anda.",
		"privacy_item_device_safe": "Info produsen & model perangkat akan dihapus (aman).",
		"privacy_item_device_none": "Tidak ada informasi merek/model perangkat.",
		"privacy_item_camera_risk": "Setelan Kamera & Lensa: Detail ({settings}) tersimpan. Membocorkan parameter teknis pemotretan.",
		"privacy_item_camera_safe": "Setelan eksposur & informasi lensa akan dihapus (aman).",
		"privacy_item_camera_none": "Tidak ada setelan lensa atau cahaya kamera.",
		"guide_btn": "Panduan",
		"guide_title": "Cara Menggunakan ExifSense",
		"guide_tab_overview": "Ikhtisar",
		"guide_tab_navigation": "Navigasi",
		"guide_tab_features": "Fitur",
		"guide_overview_intro": "ExifSense adalah alat analisis metadata dan privasi foto yang berjalan sepenuhnya di browser Anda — tanpa server, tanpa unggahan, data tidak pernah meninggalkan perangkat Anda. ExifSense membaca metadata tersembunyi dari foto dan mengubahnya menjadi wawasan yang mudah dipahami. Baik Anda ingin mempelajari setelan kamera, melacak rute perjalanan, atau membersihkan lokasi sensitif sebelum dibagikan, ExifSense menjaga semuanya tetap privat.",
		"guide_feat_secure_title": "Aman secara Desain",
		"guide_feat_secure_desc": "100% pemrosesan lokal — gambar Anda tidak pernah meninggalkan perangkat. Tanpa unggahan server, tanpa kebocoran data.",
		"guide_feat_integrity_title": "Analisis Integritas",
		"guide_feat_integrity_desc": "Hash SHA-256 / SHA-1 dengan deteksi anomali untuk memverifikasi keaslian gambar dan mendeteksi manipulasi.",
		"guide_feat_spoof_title": "Perlindungan Spoofing",
		"guide_feat_spoof_desc": "Memvalidasi tanda tangan file pada tingkat biner menggunakan Magic Bytes, menolak file yang disamarkan atau berbahaya.",
		"guide_feat_sanitize_overview_title": "Pembersihan Metadata",
		"guide_feat_sanitize_overview_desc": "Hapus koordinat GPS, detail kamera, dan informasi pribadi dengan kontrol selektif sebelum dibagikan.",
		"guide_nav_header_title": "Bilah Navigasi",
		"guide_nav_header_desc": "Bilah navigasi memberi Anda akses ke tombol Panduan, pengaturan bahasa, dan kontrol kontekstual seperti Ekspor dan Sanitasi yang muncul setelah analisis.",
		"guide_nav_upload_title": "Zona Unggah",
		"guide_nav_upload_desc": "Tiga mode: Aset Tunggal untuk satu foto, Analisis Batch untuk banyak file, dan Hapus Metadata untuk sanitasi. Ganti mode via tab atau tombol panah di ponsel.",
		"guide_nav_dashboard_title": "Dasbor",
		"guide_nav_dashboard_desc": "Setelah analisis, dasbor menampilkan pratinjau gambar, peta GPS interaktif, wawasan penjelasan naratif, dan tabel metadata terkategori. Analisis batch menyertakan panel perbandingan antar-foto.",
		"guide_nav_history_title": "Panel Riwayat",
		"guide_nav_history_desc": "Setiap sesi disimpan di penyimpanan lokal browser. Filter berdasarkan tipe (Tunggal / Batch), cari berdasarkan nama file, dan muat ulang analisis sebelumnya. Sesi yang disanitasi ditandai dengan bingkai oranye.",
		"guide_feat_analyze_title": "Analisis Foto",
		"guide_feat_analyze_desc": "Pilih mode Aset Tunggal, lalu seret foto atau klik untuk memilih. ExifSense mengekstrak semua metadata, menghasilkan penjelasan naratif, memplot lokasi GPS di peta, dan menghitung hash SHA.",
		"guide_feat_batch_title": "Analisis Batch",
		"guide_feat_batch_desc": "Beralih ke mode Analisis Batch dan tambahkan beberapa file. Antrekan sebelum diproses. Setelah analisis, gunakan pemilih aset untuk beralih antar foto dan melihat wawasan gabungan.",
		"guide_feat_sanitize_title": "Bersihkan Metadata",
		"guide_feat_sanitize_desc": "Pilih mode Hapus Metadata untuk masuk ke studio sanitasi. Gunakan preset cepat atau aktifkan kategori individual. Mendukung pemrosesan batch — bersihkan banyak file berurutan dengan satu klik. Pratinjau tag mana yang akan dihapus sebelum mengunduh file bersih.",
		"guide_btn_start": "Mulai Jelajahi",
		"guide_btn_history": "Lihat Riwayat",
		"hero_subtitle": "Verifikasi citra berbasis peramban lokal, heuristik manipulasi, rekonstruksi linimasa, dan pembersihan privasi bedah.",
		"dropzone_title_single": "Tarik & Letakkan Gambar untuk Inspeksi Forensik",
		"dropzone_subtitle_single": "Periksa EXIF, deteksi manipulasi, hitung sidik hash",
		"dropzone_title_batch": "Tarik & Letakkan Foto untuk Analisis Kolektif",
		"dropzone_subtitle_batch": "Bandingkan tanda tangan perangkat keras & sebaran linimasa (hingga 50)",
		"dropzone_title_remove": "Tarik & Letakkan Gambar untuk Sanitasi Instan",
		"dropzone_subtitle_remove": "Hapus metadata GPS, perangkat, dan linimasa secara bedah",
		"clear_all": "Bersihkan Semua",
		"remove": "Hapus",
		"process_assets_btn": "Proses Aset",
		"open_sanitizer_studio": "Buka Studio Sanitasi",
		"evidence_preview": "Ringkasan Bukti",
		"investigation_assets": "Aset Investigasi",
		"collective_intelligence": "Kecerdasan Kolektif",
		"integrity_matrix_title": "Matriks Verifikasi Integritas",
		"assets": "Aset",
		"no_narrative_available": "Tidak ada narasi metadata yang tersedia.",
		"no_metadata_found": "Tidak ada properti metadata yang tercatat untuk domain ini.",
		"geospatial_map": "Pemetaan Perjalanan Geospasial",
		"no_gps_recorded": "Tidak ada koordinat GPS yang ditemukan dalam metadata gambar.",
		"geotagged_assets": "Bergeotag",
		"quick_presets": "Preset Cepat",
		"strip_categories": "Kategori Metadata yang Dihapus",
		"privacy_protected": "Terlindungi: Seluruh Metadata Sensitif Dipilih untuk Dihapus",
		"privacy_risk_detected": "Risiko Privasi: Metadata Sensitif Masih Tersisa",
		"safe_to_publish_desc": "Tidak ada nomor seri perangkat, koordinat, atau stempel waktu yang tersisa.",
		"privacy_risk_desc": "Beberapa tag privat masih aktif. Pilih preset atau ubah opsi individual di bawah.",
		"per_file_override_title": "Kustomisasi Sanitasi Berkas",
		"no_sanitizer_target": "Tidak ada gambar yang dimuat untuk sanitasi. Tarik foto untuk memulai.",
		"return_to_home": "Kembali ke Beranda",
		"investigation_history": "Riwayat Investigasi",
		"history_subtitle": "Tinjau, pulihkan, atau ekspor sesi forensik yang dianalisis sebelumnya.",
		"clear_all_history": "Hapus Riwayat",
		"search_history_placeholder": "Cari sesi berdasarkan nama file, ID forensik, kamera...",
		"no_history_records": "Tidak Ada Rekaman Sesi Riwayat",
		"session_restored": "Sesi riwayat berhasil dipulihkan ke ruang kerja!",
		"guide_subtitle": "Pelajari cara melakukan forensik citra dan pembersihan privasi di peramban.",
		"return_to_workspace": "Kembali ke Ruang Kerja",
		"session_reset_complete": "Sesi investigasi telah direset",
		"analysis_complete": "Analisis forensik selesai",
		"batch_analysis_complete": "Analisis forensik batch selesai",
		"sanitizer_ready": "Foto siap untuk disanitasi",
		"property": "Properti",
		"value": "Nilai",
		"chronological_story_title": "Kisah Kronologis",
		"chronological_story_subtitle": "Rekonstruksi linimasa berurutan di seluruh rangkaian",
		"copy_story": "Salin Kisah",
		"copy_story_markdown": "Salin Markdown",
		"copy_story_plain": "Salin Teks Biasa",
		"story_copied": "Tersalin ke papan klip",
		"inspect_asset": "Periksa Foto"
	},
	narratives: {
		"integrity_clean": "Foto ini mempertahankan detail tanggal dan lokasi aslinya. Tidak ditemukan indikator umum penggunaan alat pengeditan eksternal pada metadata dasar.",
		"integrity_clean_no_gps": "Informasi perangkat dan linimasa utuh. Tidak ada data lokasi tersimpan — ini normal jika GPS dimatikan saat mengambil foto.",
		"integrity_clean_no_datetime": "Data perangkat dan lokasi utuh. Tidak ada stempel waktu pemotretan — ini bisa terjadi pada tangkapan layar atau alat ekspor tertentu.",
		"integrity_clean_no_device": "Data linimasa dan lokasi utuh. Tidak ada informasi perangkat tersimpan — umum untuk tangkapan layar atau gambar dari media sosial.",
		"integrity_edit_software": "Perangkat Lunak Pengolah: Metadata menunjukkan foto ini disimpan atau diproses menggunakan <strong>{software}</strong>. Beberapa detail kamera asli mungkin telah diubah.",
		"integrity_future_date": "Waktu Pemotretan Tidak Biasa: Tanggal pemotretan terrekam (<strong>{date}</strong>) berada di masa depan dibanding waktu sistem saat ini. Ini biasanya disebabkan oleh jam kamera yang belum diatur.",
		"integrity_capture_after_file": "Perbedaan Waktu File: Tanggal pemotretan foto (<strong>{date}</strong>) lebih baru daripada tanggal modifikasi file (<strong>{fileDate}</strong>).",
		"integrity_missing_original": "Waktu Pemotretan Tidak Ditemukan: Waktu pemotretan asli tidak ditemukan, tetapi ada jejak pengolahan dari <strong>{indicator}</strong>.",
		"integrity_dimension_mismatch": "Ketidaksesuaian Dimensi: Metadata EXIF mencatat dimensi gambar <strong>{exifWidth}x{exifHeight}</strong>, tetapi ukuran piksel aktual adalah <strong>{actualWidth}x{actualHeight}</strong>.",
		"integrity_fully_stripped": "Metadata Tidak Tersedia: File ini tidak memiliki informasi EXIF. Ini kondisi umum jika foto dikirim via aplikasi pesan (WhatsApp) atau sosial media yang menghapus metadata secara otomatis.",
		"integrity_missing_gps": "Lokasi GPS: Tidak tersedia. File tidak mengandung koordinat GPS.",
		"integrity_missing_datetime": "Waktu Pemotretan: Tidak tersedia. Tidak ada stempel waktu pada file.",
		"integrity_missing_device": "Informasi Perangkat: Tidak tersedia. Tidak ada data merek, model, atau setelan kamera.",
		"hardware": "Foto ini diambil menggunakan kamera <strong>{make} {model}</strong>{lens}.",
		"hardware_software": "Perangkat menggunakan sistem <strong>{software}</strong> saat mengambil foto ini.",
		"hardware_analysis": "Analisis menunjukkan profil kamera standar dan wajar untuk tipe perangkat ini.",
		"hardware_mod": "Foto ini diambil dengan kamera <strong>{make} {model}</strong>{lens}, lalu diproses atau disimpan ulang via <strong>{software}</strong>.",
		"with_lens": " dengan lensa {lens}",
		"exposure": "Diambil dengan aperture <strong>{aperture}</strong>, kecepatan rana <strong>{shutter}</strong>, dan sensitivitas sensor (ISO) <strong>{iso}</strong>{program}.",
		"exp_low_light": "Sensitivitas ISO tinggi menunjukkan foto ini diambil di tempat gelap atau dalam ruangan.",
		"exp_bright": "ISO rendah dan kecepatan rana cepat menunjukkan lingkungan terang, kemungkinan di luar ruangan siang hari.",
		"exp_shallow_depth": "Aperture lebar menghasilkan latar belakang buram (efek bokeh) untuk menonjolkan subjek utama.",
		"exp_standard": "Setelan kamera menunjukkan pencahayaan standar dan seimbang.",
		"unknown_aperture": "aperture tidak diketahui",
		"unknown_shutter": "kecepatan rana tidak ditentukan",
		"unspecified_iso": "ISO tidak ditentukan",
		"using_program": " menggunakan mode {program}",
		"optics": "Lensa diatur pada panjang fokus <strong>{focal}</strong>{focal35}{zoom}. Ini menunjukkan tingkat zoom yang digunakan saat pemotretan.",
		"unknown_focal": "panjang fokus tidak diketahui",
		"equivalent_35mm": " (setara {mm}mm pada kamera film 35mm standar)",
		"digital_zoom": "Zoom digital sebesar {zoom}x digunakan",
		"quality": "Resolusi gambar adalah <strong>{width}x{height}</strong> piksel. Setelan kamera menunjukkan tingkat kontras <strong>{contrast}</strong>, ketajaman <strong>{sharpness}</strong>, dan ruang warna <strong>{colorSpace}</strong>.",
		"timeline_capture": "Diambil pada: <strong>{dateStr}</strong><br/>",
		"timeline_format": "Format Waktu Asli: <code>{rawStr}</code>",
		"timeline_gmt": "Waktu Universal Terkoordinasi (GMT/UTC): <code>{gmtStr}</code>",
		"timeline_mod_note": "Catatan: Terdeteksi waktu modifikasi file selanjutnya ({modStr}).",
		"timeline_integrity": "Linimasa pemotretan foto tampak alami dan konsisten.",
		"no_chrono": "Tanggal atau waktu pemotretan tidak ditemukan dalam file ini.",
		"geospatial": "Analisis lokasi menunjukkan foto ini diambil di dekat <strong>{locationName}</strong> (Koordinat: <strong>{lat}, {lng}</strong>).",
		"remote_location": "lokasi terpencil atau tidak terindeks",
		"no_geo": "Tidak ada data lokasi (GPS). Ini umum jika GPS perangkat dinonaktifkan saat pemotretan.",
		"combined_hw_consistent": "Semua foto dalam grup ini diambil dengan model kamera yang sama: <strong>{device}</strong>.",
		"combined_hw_discrepancy": "Terdeteksi beberapa kamera berbeda: <strong>{deviceList}</strong>.",
		"combined_timeline": "Semua foto diambil dalam rentang waktu <strong>{diffHours} jam</strong>, mulai dari {start} sampai {end}.",
		"combined_geo_concentrated": "Semua foto diambil di area yang sangat berdekatan (dalam radius 50 meter).",
		"combined_geo_localized": "Penyebaran lokasi menunjukkan area lokal sekitar {dist} meter (jarak jalan kaki).",
		"combined_geo_trail": "Penyebaran lokasi menunjukkan pemotret menempuh perjalanan sekitar <strong>{dist} km</strong> saat mengambil foto-foto ini.",
		"velocity_warning": "Peringatan Perjalanan: Jarak antar lokasi menunjukkan kecepatan sangat tinggi ({speed} km/jam).",
		"sanitization_alert": "Metadata Utama Tidak Ditemukan: Foto ini tidak memiliki data perangkat maupun lokasi.",
		"null_island_warn": "Koordinat Nol (0,0): Lokasi menunjuk ke koordinat (0,0). Ini terjadi jika sensor GPS belum mengunci sinyal.",
		"precision_warn": "Format Koordinat Disederhanakan: Koordinat GPS diwakili angka bulat sederhana.",
		"combined_serial_match": "Kamera Fisik Terverifikasi: Semua foto diambil menggunakan unit kamera fisik yang persis sama (Nomor Seri: <strong>{serial}</strong>).",
		"combined_hw_sparse_single": "Hanya <strong>{count}</strong> dari <strong>{total}</strong> foto yang memiliki info kamera (<strong>{device}</strong>).",
		"combined_hw_sparse_consistent": "<strong>{count}</strong> dari <strong>{total}</strong> foto menggunakan kamera yang sama: <strong>{device}</strong>.",
		"combined_hw_sparse_discrepancy": "Terdeteksi model kamera berbeda: <strong>{deviceList}</strong>.",
		"combined_timeline_sparse": "Analisis waktu terbatas karena hanya <strong>1</strong> dari <strong>{total}</strong> foto yang memiliki stempel waktu.",
		"combined_timeline_sparse_note": " Linimasa dibuat menggunakan <strong>{count}</strong> foto yang memiliki data waktu.",
		"combined_geo_sparse": "Analisis lokasi terbatas karena hanya <strong>1</strong> dari <strong>{total}</strong> foto yang memiliki koordinat GPS.",
		"combined_geo_sparse_note": " Perhitungan jarak berdasarkan <strong>{count}</strong> foto yang memiliki data lokasi.",
		"combined_integrity_warning": "Catatan Kelengkapan Kelompok: Foto dalam kelompok ini memiliki tingkat kelengkapan metadata yang bervariasi.",
		"combined_integrity_stripped_all": "Sebanyak <strong>{count}</strong> dari <strong>{total}</strong> foto tidak memiliki data kamera, waktu, dan lokasi.",
		"combined_integrity_stripped_part": "Sebanyak <strong>{count}</strong> dari <strong>{total}</strong> foto tidak memiliki kategori data tertentu.",
		"combined_integrity_mix": "Status Kelengkapan Campuran: Dari <strong>{total}</strong> foto, <strong>{fully}</strong> tanpa detail, <strong>{partially}</strong> kurang sebagian, dan <strong>{clean}</strong> memiliki informasi lengkap.",
		"combined_integrity_clean": "Data Asli Lengkap: Semua <strong>{total}</strong> foto memiliki metadata lengkap.",
		"no_data_narrative": "Analisis tidak tersedia karena foto ini tidak memiliki metadata yang diperlukan.",
		"no_metadata_tags": "Tidak ada tag data standar yang ditemukan.",
		"filter_all": "Semua Foto",
		"filter_complete": "Data Lengkap",
		"filter_stripped": "Tanpa Detail",
		"empty_geospatial": "Tidak dapat memetakan lokasi karena foto ini tidak memiliki koordinat GPS.",
		"empty_hardware": "Merek dan model kamera tidak dapat ditentukan karena data produsen dihapus.",
		"empty_exposure": "Detail eksposur kamera (Aperture, ISO, Kecepatan rana) tidak ditemukan.",
		"empty_optics": "Informasi zoom lensa tidak dapat ditentukan karena foto tidak memiliki data panjang fokus.",
		"empty_quality": "Kualitas gambar dianalisis menggunakan estimasi umum karena data dimensi utama tidak ada.",
		"empty_timeline": "Analisis waktu gagal karena tanggal dan waktu asli tidak tersimpan.",
		"empty_all": "Metadata Bersih Total: Tidak ada info kamera, waktu, atau lokasi dalam foto ini.",
		"reconstruct_btn": "Tampilkan Linimasa Detail",
		"integrity_reconstruct_btn": "Tampilkan Detail Kelengkapan Data",
		"hw_reconstruct_btn": "Bandingkan Detail Kamera",
		"reconstruct_start": "Mulai Pemotretan:",
		"reconstruct_end": "Selesai Pemotretan:",
		"reconstruct_total": "Total Durasi Urutan:",
		"reconstruct_jumps": "Jeda Waktu Antar Foto:",
		"reconstruct_missing": "Foto Tanpa Data Waktu ({count}):",
		"geo_reconstruct_btn": "Tampilkan Detail Rute",
		"geo_max_spread": "Jarak Terjauh Antar Lokasi:",
		"geo_reconstruct_range": "Total Jarak Perjalanan:",
		"geo_reconstruct_note": "*Estimasi jarak berdasarkan rute jalan yang paling mungkin antara titik lokasi foto.",
		"geo_reconstruct_jumps": "Jarak Antar Lokasi:",
		"time_day": "Hari",
		"time_hour": "Jam",
		"time_minute": "Menit",
		"time_second": "Detik",
		"chrono_baseline_single": "Semua foto dalam rangkaian ini diambil menggunakan perangkat kamera yang sama: {device}.",
		"chrono_baseline_multiple": "Foto-foto dalam rangkaian ini diambil menggunakan beberapa perangkat berbeda: {devices}.",
		"chrono_baseline_unknown": "Informasi perangkat kamera tidak tercatat untuk foto-foto dalam rangkaian ini.",
		"chrono_initial_location": "Urutan dimulai dengan {fileName}, diambil pada {date} di {location} (koordinat {coordinates}){lens}.",
		"chrono_initial_gps": "Urutan dimulai dengan {fileName}, diambil pada {date} di koordinat {coordinates}{lens}.",
		"chrono_initial_no_gps": "Urutan dimulai dengan {fileName}, diambil pada {date} tanpa data lokasi yang tercatat{lens}.",
		"chrono_initial_lens": " menggunakan lensa {lens}",
		"chrono_initial_focal": " pada panjang fokus {focal}",
		"chrono_step_location": "{fileName} diambil pada {date} ({elapsedTime}), sejauh {distance} dari {prevFileName} di {location}.",
		"chrono_step_gps": "{fileName} diambil pada {date} ({elapsedTime}), sejauh {distance} dari {prevFileName} di koordinat {coordinates}.",
		"chrono_step_location_no_prev_gps": "{fileName} diambil pada {date} ({elapsedTime}) di {location}.",
		"chrono_step_gps_no_prev_gps": "{fileName} diambil pada {date} ({elapsedTime}) di koordinat {coordinates}.",
		"chrono_step_no_gps": "{fileName} diambil pada {date} ({elapsedTime}). Data lokasi tidak tercatat untuk pengambilan foto ini.",
		"chrono_device_changed": " Perangkat kamera berganti dari {prevDevice} ke {currDevice}.",
		"chrono_lens_changed": " Lensa kamera berganti dari {prevLens} ke {currLens}.",
		"chrono_focal_changed": " Panjang fokus berganti dari {prevFocal} ke {currFocal}.",
		"time_seconds_later": "{seconds} detik kemudian",
		"time_minutes_later": "{minutes} menit kemudian",
		"time_hours_later": "{hours} jam kemudian",
		"time_days_later": "{days} hari kemudian"
	},
	reports: {
		"title": "LAPORAN ANALISIS METADATA EXIFSENSE",
		"session": "Sesi",
		"generated": "Dibuat",
		"asset_count": "Jumlah Aset",
		"combined_intel": "WAWASAN METADATA TERPADU",
		"asset_header": "ASET {n}",
		"tech_details": "Detail Sumber Teknis",
		"forensic_analysis": "Narasi Analisis Metadata",
		"raw_metadata": "Properti Metadata Mentah",
		"property": "Properti",
		"value": "Nilai",
		"category": "Kategori",
		"unknown": "Tidak Diketahui",
		"forensic_id": "Identifier Sesi"
	}
};
// src/locales/ar.json
var ar_default = {
	ui: {
		"title": "ExifSense | تحليل الصور والخصوصية",
		"logo_sense": "سينس",
		"yes": "نعم",
		"no": "لا",
		"export_report": "تصدير التقرير",
		"pdf_doc": "مستند PDF",
		"md_file": "ملف ماركداون",
		"json_file": "ملف بيانات JSON",
		"csv_dataset": "مجموعة بيانات CSV",
		"copy_clipboard": "نسخ إلى الحافظة",
		"copied_to_clipboard": "تم النسخ إلى الحافظة!",
		"swipe_hint": "اسحب للتبديل بين الفئات",
		"analyze_new": "تحليل جديد",
		"hero_badge": "البيانات الوصفية الرقمية للجميع",
		"hero_title_part1": "اكشف البيانات الكامنة خلف",
		"hero_title_span": "كل صورة",
		"hero_desc": "لست بحاجة لتكون خبيراً لفهم المعلومات المخفية في صورك. يسهل إكسيف سينس على الجميع قراءة الموقع، والجهاز، وسجل الصور - بأمان وخصوصية مطلقة.",
		"begin_investigation": "ابدأ الاستكشاف",
		"review_history": "مراجعة السجل",
		"tab_new": "تحليل جديد",
		"tab_history": "السجل",
		"mode_single": "ملف واحد",
		"mode_batch": "تحليل جماعي",
		"mode_remove": "إزالة البيانات الوصفية",
		"mode_single_desc": "تحليل صورة واحدة مع تفصيل جنائي شامل لبيانات EXIF والموقع على الخريطة والسلامة والجودة.",
		"mode_batch_desc": "تحليل عدة صور في وقت واحد مع مقارنة جنبًا إلى جنب وعرض خريطة مجمّع وتقارير استخباراتية جنائية.",
		"mode_remove_desc": "قم بإزالة البيانات الوصفية من صورك لحماية الخصوصية. يدعم المعالجة المجمّعة — حدد عدة ملفات مرة واحدة لتنظيفها بالتسلسل.",
		"sanitize_asset": "تنظيف البيانات",
		"remove_all": "إزالة الكل",
		"remove_all_desc": "تنظيف كامل (موصى به)",
		"remove_specific": "إزالة فئات محددة",
		"remove_specific_desc": "اختر الفئات المراد إزالتها",
		"download_cleaned": "تحميل صورة نظيفة",
		"download_all_sanitized": "تنزيل الكل بعد التنظيف",
		"customize_options": "تخصيص الخيارات",
		"customize_file_options": "تخصيص الخيارات للملف",
		"reset_to_global": "إعادة إلى الإعدادات العامة",
		"apply": "تطبيق",
		"batch": "دفعة",
		"processing": "جارٍ المعالجة...",
		"err_no_entries": "لا يمكن معالجة أي ملف.",
		"batch_confirm_title": "الدفعة المرحلية",
		"batch_confirm_msg": "لديك حاليًا {count} ملف(ات) في الانتظار. هل ترغب في المتابعة في التحليل الآن؟",
		"add_more": "إضافة المزيد",
		"process_now": "ابدأ المعالجة",
		"staged_files_title": "طابور الملفات",
		"clear_staging": "مسح الطابور",
		"process_staged_btn": "معالجة جميع الملفات",
		"removal_modal_title": "خيارات إزالة البيانات الوصفية",
		"removal_modal_desc": "حدد المعلومات التي ترغب في تجريدها من هذا الملف.",
		"cat_gps_removal": "معلومات الموقع الجغرافي (GPS)",
		"cat_device_removal": "معلومات الجهاز والمصنع",
		"cat_camera_removal": "معلومات إعدادات الكاميرا",
		"dropzone_prompt": "اسحب صورك هنا أو انقر للتصفح",
		"dropzone_hint": "JPG, PNG, TIFF, HEIC (معالجة محلية)",
		"advisory_title": "توصية تقنية للبيانات",
		"advisory_mobile_warn": "مستخدمو الهواتف المحمولة: التقاط الصور مباشرة عبر المتصفح قد يؤدي إلى فقدان البيانات الوصفية الجغرافية بسبب قيود الخصوصية الافتراضية.",
		"advisory_recommend": "للحفاظ على أقصى قدر من تفاصيل البيانات الوصفية، نوصي باستخدام تطبيق الكاميرا الأصلي لجهازك أولاً، ثم تحديد الملف من المعرض عبر خيار \"الملفات\".",
		"filter_all": "الكل",
		"filter_single": "فردي",
		"filter_batch": "جماعي",
		"search_placeholder": "البحث في السجل...",
		"clear_history": "مسح السجل بالكامل",
		"feature_secure_title": "آمن حسب التصميم",
		"feature_secure_desc": "معالجة محلية 100% في المتصفح. لا يتم إرسال ملفات الصور أو علامات EXIF إلى أي خادم نهائياً، مما يحافظ على سرية البيانات.",
		"feature_spoof_title": "الحماية من التزييف",
		"feature_spoof_desc": "يتحقق من سلامة الملفات على مستوى البنية الثنائية (Magic Bytes). يكتشف الامتدادات المزيفة ويرفض الملفات الخبيثة.",
		"feature_integrity_title": "تحليل سلامة البيانات",
		"feature_integrity_desc": "يحسب قيم الهاش SHA-256 و SHA-1 تلقائياً، ويحلل العلامات الوصفية لكشف أي تشوهات زمنية أو تلاعب بالصور.",
		"feature_image_analysis_title": "تحليل الصور التلقائي",
		"feature_image_analysis_desc": "حمّل أي صورة ويقوم النظام تلقائياً باستخراج جميع البيانات الوصفية المخفية وعرضها في لوحة معلومات نظيفة وسهلة القراءة. شاهد تفاصيل الجهاز والموقع والطوابع الزمنية وإعدادات الكاميرا والمزيد — كل شيء معروض بوضوح ليتمكن أي شخص من فهم القصة وراء صورهم.",
		"feature_sanitize_title": "تنظيف البيانات الوصفية",
		"feature_sanitize_desc": "قم بإزالة إحداثيات GPS وتفاصيل الكاميرا والمعلومات الشخصية بسهولة من صورك قبل مشاركتها. يدعم التنظيف المجمّع — معالجة عدة ملفات بالتسلسل مع خيارات تخصيص لكل ملف.",
		"extracting_metadata": "جاري استخراج البيانات...",
		"analyzing_text": "جاري تحليل الملفات...",
		"geospatial_data": "البيانات الجغرافية المكانية",
		"show_route": "إظهار المسار",
		"combined_intel": "التحليل المشترك",
		"cross_asset": "تحليل متعدد الأصول",
		"select_asset": "اختر ملفاً لفحصه",
		"asset_count": "{n} ملفات",
		"individual_analysis": "تحليل الملف الفردي",
		"dynamic_asset_analysis": "تحليل {name}",
		"forensic_grade": "تفاصيل كاملة",
		"source_file": "الملف المصدر",
		"confirm_title": "تأكيد الإجراء",
		"confirm_message": "هل أنت متأكد من رغبتك في الاستمرار؟",
		"cancel": "إلغاء",
		"confirm": "تأكيد",
		"history_empty": "سجلك فارغ حالياً. ابدأ تحليلاً جديداً لرؤية الجلسات هنا.",
		"cat_hardware": "عتاد الجهاز",
		"cat_exposure": "إعدادات التعريض",
		"cat_optics": "البصريات والعدسة",
		"cat_quality": "جودة الصورة",
		"cat_timeline": "الجدول الزمني",
		"cat_geospatial": "الموقع الجغرافي",
		"cat_standards": "المعايير والتوثيق",
		"cat_misc": "بيانات متنوعة",
		"file_name": "الاسم",
		"file_type": "النوع",
		"file_size": "الحجم",
		"file_date": "تاريخ الملف (آخر تعديل)",
		"analysis_hardware": "تحليل العتاد",
		"analysis_exposure": "تحليل التعريض",
		"analysis_optics": "تحليل البصريات",
		"analysis_quality": "تحليل الجودة",
		"analysis_timeline": "تحليل الجدول الزمني",
		"analysis_geospatial": "تحليل الموقع الجغرافي",
		"analysis_integrity": "تحليل السلامة الرقمية",
		"view_details": "عرض تفاصيل {cat}",
		"no_exif_title": "لم يتم العثور على بيانات EXIF",
		"no_exif_desc": "تم تجريد هذا الملف من البيانات الوصفية أو أنه لا يحتوي عليها في الأصل.",
		"gps_coords": "عرض: {lat} | طول: {lng}",
		"no_gps": "لم يتم العثور على توقيعات GPS صالحة في هذا الأصل.",
		"history_no_matches": "لم يتم العثور على نتائج مطابقة لـ \"{query}\"",
		"history_no_analyses": "لا توجد تحليلات سابقة مخزنة",
		"history_more": "{name} + {n} آخرين",
		"history_delete_title": "حذف السجل",
		"history_delete_confirm_title": "حذف سجل التحليل",
		"history_delete_confirm_msg": "هل أنت متأكد من رغبتك في حذف السجل الخاص بـ \"{name}\" بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.",
		"history_delete_confirm_btn": "تدمير السجل",
		"history_clear_confirm_title": "تطهير كافة البيانات",
		"history_clear_confirm_msg": "سيؤدي هذا إلى إزالة جميع جلسات التحليل نهائيًا من مساحة تخزين المتصفح الخاص بك. لا يمكن التراجع عن هذا الإجراء.",
		"history_clear_confirm_btn": "تطهير الذاكرة بالكامل",
		"history_unknown_device": "جهاز مجهول",
		"history_sanitized_badge": "تم التعقيم",
		"sanitized_session_title": "تم التنظيف: {name}",
		"sanitized_device_short": "الجهاز",
		"sanitized_camera_short": "الكاميرا",
		"sanitized_date_short": "التاريخ",
		"reupload_required_title": "يتطلب توفير الملف الأصلي",
		"reupload_required_msg": "إزالة البيانات الوصفية تتطلب قراءة الملف الخام. يرجى إعادة رفعه عبر تبويب التحليل الجماعي.",
		"go_to_upload": "إعادة تعيين ورفع",
		"sanitization_complete_title": "اكتمل التطهير بنجاح",
		"sanitization_complete_msg": "تم تنظيف صورتك وتأمينها بالكامل، سيبدأ التنزيل تلقائياً.",
		"done": "تم",
		"err_batch_limit": "تم تجاوز الحد المسموح. يرجى معالجة {n} ملفات كحد أقصى في الدفعة.",
		"err_invalid_files": "يرجى استخدام صور مدعومة بحجم أقل من 100 ميجابايت.",
		"err_sanitize_failed": "فشل تنظيف البيانات الوصفية. يرجى المحاولة مرة أخرى.",
		"err_invalid_signature": "يحتوي الملف \"{name}\" على توقيع تنسيق غير معروف أو رأس تالف.",
		"warn_extension_mismatch": "تنبيه التنسيق: يظهر الملف \"{name}\" عدم تطابق في الامتداد. تم استعادته إلى الامتداد الأصلي.",
		"hash_copied": "تم نسخ الهاش إلى الحافظة!",
		"sanitize_presets_title": "الإعدادات المسبقة السريعة",
		"sanitize_presets_desc": "اختر إعداداً مسبقاً لضبط خيارات التطهير فوراً وفقاً لاحتياجاتك:",
		"preset_max_privacy": "أقصى خصوصية",
		"preset_photo_share": "مشاركة المصورين",
		"preset_location_only": "حذف الموقع فقط",
		"selective_controls_title": "عناصر التحكم الانتقائية في البيانات",
		"sanitize_toggle_date": "إزالة تاريخ ووقت التقاط الصورة",
		"location_hidden": "تمت إزالة معلومات الموقع",
		"no_location_found": "لم يتم العثور على إحداثيات الموقع",
		"no_device_found": "لم يتم العثور على طراز الجهاز أو الشركة المصنعة",
		"no_exposure_found": "لم يتم العثور على إعدادات تعريض الكاميرا (ISO/الفتحة/الغالق)",
		"no_date_found": "لم يتم العثور على ختم الوقت",
		"metadata_preview": "معاينة البيانات الوصفية (في الوقت الفعلي)",
		"status_removed": "سيتم حذفه",
		"status_kept": "محفوظ",
		"privacy_analysis": "تحليل خصوصية الصورة",
		"privacy_score_safe": "آمن للغاية",
		"privacy_score_risk": "يحتوي على بيانات حساسة",
		"privacy_desc_safe": "تمت تصفية جميع المعلومات الحساسة أو مسحها. هذه الصورة آمنة للمشاركة بحرية.",
		"privacy_desc_risk": "لا تزال هذه الصورة تحتفظ بمعلومات يمكن أن تكشف عن هويتك أو موقعك إذا تمت مشاركتها.",
		"privacy_item_gps_risk": "موقع GPS الدقيق: تم العثور على الإحداثيات ({coords}). يسهل على الآخرين تتبع موقعك الجغرافي.",
		"privacy_item_gps_safe": "سيتم حذف موقع GPS (آمن).",
		"privacy_item_gps_none": "لا توجد إحداثيات موقع GPS في هذه الصورة.",
		"privacy_item_date_risk": "وقت الالتقاط الأصلي: تم العثور على الطابع الزمني ({time}). يكشف متى تم التقاط الصورة بالضبط.",
		"privacy_item_date_safe": "سيتم حذف الطابع الزمني للالتقاط (آمن).",
		"privacy_item_date_none": "لا يوجد طابع زمني للالتقاط في هذه الصورة.",
		"privacy_item_device_risk": "طراز الجهاز والشركة المصنعة: تم العثور على طراز ({device}). يكشف عن نوع هاتفك أو الكاميرا الشخصية.",
		"privacy_item_device_safe": "سيتم حذف معلومات الشركة المصنعة وطراز الجهاز (آمن).",
		"privacy_item_device_none": "لا توجد معلومات عن الشركة المصنعة أو طراز الجهاز.",
		"privacy_item_camera_risk": "إعدادات الكاميرا والعدسة: تم العثور على التفاصيل ({settings}). يكشف المعلمات الفنية لالتقاط الصورة.",
		"privacy_item_camera_safe": "سيتم حذف إعدادات تعريض الكاميرا ومعلومات العدسة (آمن).",
		"privacy_item_camera_none": "لا توجد إعدادات عدسة أو تعريض كاميرا.",
		"guide_btn": "الدليل",
		"guide_title": "كيفية استخدام ExifSense",
		"guide_tab_overview": "نظرة عامة",
		"guide_tab_navigation": "التنقل",
		"guide_tab_features": "الميزات",
		"guide_overview_intro": "ExifSense هي أداة لتحليل البيانات الوصفية وخصوصية الصور تعمل بالكامل في متصفحك — بدون خوادم، بدون رفع ملفات، البيانات لا تغادر جهازك أبداً. تقرأ البيانات الوصفية المخفية من الصور وتحولها إلى رؤى واضحة وسهلة الفهم.",
		"guide_feat_secure_title": "آمن حسب التصميم",
		"guide_feat_secure_desc": "معالجة محلية 100% — صورك لا تغادر جهازك أبداً. لا رفع خوادم، لا تسرب بيانات.",
		"guide_feat_integrity_title": "تحليل السلامة",
		"guide_feat_integrity_desc": "هاش SHA-256 / SHA-1 مع كشف الشذوذ للتحقق من صحة الصورة واكتشاف التلاعب.",
		"guide_feat_spoof_title": "الحماية من التزييف",
		"guide_feat_spoof_desc": "يتحقق من توقيعات الملفات على المستوى الثنائي باستخدام Magic Bytes، رافضاً الملفات المزيفة أو الضارة.",
		"guide_feat_sanitize_overview_title": "تنظيف البيانات الوصفية",
		"guide_feat_sanitize_overview_desc": "قم بإزالة إحداثيات GPS وتفاصيل الكاميرا والمعلومات الشخصية بعناصر تحكم انتقائية قبل المشاركة.",
		"guide_nav_header_title": "شريط التنقل",
		"guide_nav_header_desc": "يوفر شريط التنقل إمكانية الوصول إلى زر الدليل وإعدادات اللغة وعناصر التحكم السياقية مثل التصدير والتنظيف التي تظهر بعد التحليل.",
		"guide_nav_upload_title": "منطقة الرفع",
		"guide_nav_upload_desc": "ثلاثة أوضاع: ملف واحد لصورة واحدة، تحليل جماعي لملفات متعددة، وإزالة البيانات الوصفية للتنظيف. بدّل بين الأوضاع عبر علامات التبويب أو أزرار الأسهم على الجوال.",
		"guide_nav_dashboard_title": "لوحة المعلومات",
		"guide_nav_dashboard_desc": "بعد التحليل، تعرض لوحة المعلومات معاينة الصورة وخريطة GPS تفاعلية وسرد الرؤى وجداول البيانات الوصفية المصنفة.",
		"guide_nav_history_title": "لوحة السجل",
		"guide_nav_history_desc": "يتم تخزين كل جلسة في التخزين المحلي للمتصفح. صفّي حسب النوع (فردي / جماعي)، ابحث باسم الملف، وحمّل التحليلات السابقة.",
		"guide_feat_analyze_title": "تحليل صورة",
		"guide_feat_analyze_desc": "اختر وضع ملف واحد، ثم اسحب الصورة أو انقر للتصفح. يستخرج ExifSense جميع البيانات الوصفية وينشئ رؤى واضحة ويرسم GPS على الخريطة.",
		"guide_feat_batch_title": "تحليل جماعي",
		"guide_feat_batch_desc": "بدّل إلى وضع التحليل الجماعي وأضف ملفات متعددة. ضعها في طابور قبل المعالجة. بعد التحليل، استخدم منتقي الأصول للتبديل بين الصور.",
		"guide_feat_sanitize_title": "تنظيف البيانات الوصفية",
		"guide_feat_sanitize_desc": "اختر وضع إزالة البيانات الوصفية لدخول استوديو التنظيف. استخدم الإعدادات المسبقة السريعة أو فعّل الفئات بشكل فردي. يدعم المعالجة المجمّعة — نظّف عدة ملفات بالتسلسل بنقرة واحدة. اعرض معاينة العلامات التي ستتم إزالتها قبل تنزيل الملف النظيف.",
		"guide_btn_start": "ابدأ الاستكشاف",
		"guide_btn_history": "مراجعة السجل",
		"hero_subtitle": "التحقق من الصور محلياً، واكتشاف التلاعب، وإعادة بناء الخط الزمني، وتطهير الخصوصية.",
		"dropzone_title_single": "أفلت الصورة للفحص الجنائي",
		"dropzone_subtitle_single": "فحص بيانات EXIF، واكتشاف التلاعب، وحساب التجزئة",
		"dropzone_title_batch": "أفلت الصور للتحليل الجماعي",
		"dropzone_subtitle_batch": "مقارنة توقيعات الأجهزة وانتشار الخط الزمني (حتى 50)",
		"dropzone_title_remove": "أفلت الصورة للتطهير الفوري",
		"dropzone_subtitle_remove": "إزالة بيانات الموقع والجهاز والخط الزمني جراحياً",
		"clear_all": "مسح الكل",
		"remove": "إزالة",
		"process_assets_btn": "معالجة الملفات",
		"open_sanitizer_studio": "فتح استوديو التطهير",
		"evidence_preview": "نظرة عامة على الأدلة",
		"investigation_assets": "ملفات التحقيق",
		"collective_intelligence": "الذكاء الجماعي",
		"integrity_matrix_title": "مصفوفة التحقق من السلامة",
		"assets": "ملفات",
		"no_narrative_available": "لا يوجد سرد متاح لبيانات التعريف.",
		"no_metadata_found": "لم يتم تسجيل خصائص بيانات تعريف لهذا المجال.",
		"geospatial_map": "الخرائط الجغرافية المكانية",
		"no_gps_recorded": "لم يتم العثور على إحداثيات GPS في بيانات الصورة.",
		"geotagged_assets": "تحتوي على موقع",
		"quick_presets": "إعدادات سريعة",
		"strip_categories": "فئات بيانات التعريف المراد إزالتها",
		"privacy_protected": "محمي: تم تحديد كافة البيانات الحساسة للإزالة",
		"privacy_risk_detected": "خطر على الخصوصية: بقيت بيانات حساسة دون تطهير",
		"safe_to_publish_desc": "لن تتبقى أي أرقام تسلسلية أو إحداثيات أو أختام زمنية في النتيجة.",
		"privacy_risk_desc": "بعض البيانات الخاصة لا تزال مفعّلة. اختر إعداداً سريعاً أو بدّل الخيارات أدناه.",
		"per_file_override_title": "تخصيص تطهير الملف",
		"no_sanitizer_target": "لم يتم تحميل أي صور للتطهير. أفلت صورة للبدء.",
		"return_to_home": "العودة للرئيسية",
		"investigation_history": "سجل التحقيقات",
		"history_subtitle": "مراجعة أو استعادة أو تصدير جلسات التحقيق السابقة.",
		"clear_all_history": "مسح السجل",
		"search_history_placeholder": "البحث بالاسم، المعرّف الجنائي، الكاميرا...",
		"no_history_records": "لا توجد جلسات سابقة مسجلة",
		"session_restored": "تم استعادة الجلسة إلى مساحة العمل!",
		"guide_subtitle": "تعلم كيفية فحص الصور وحماية الخصوصية بالكامل داخل المتصفح.",
		"return_to_workspace": "العودة إلى مساحة العمل",
		"session_reset_complete": "تمت إعادة ضبط جلسة التحقيق",
		"analysis_complete": "اكتمل التحليل الجنائي",
		"batch_analysis_complete": "اكتمل التحليل الجنائي الجماعي",
		"sanitizer_ready": "الصور جاهزة للتطهير",
		"property": "الخاصية",
		"value": "القيمة الموثقة",
		"chronological_story_title": "القصة الزمنية",
		"chronological_story_subtitle": "إعادة بناء التسلسل الزمني عبر المجموعة",
		"copy_story": "نسخ القصة",
		"copy_story_markdown": "نسخ كـ Markdown",
		"copy_story_plain": "نسخ كنص عادي",
		"story_copied": "تم النسخ إلى الحافظة",
		"inspect_asset": "فحص الصورة"
	},
	narratives: {
		"integrity_clean": "تحتفظ هذه الصورة بتفاصيل تاريخها وموقعها الأصليين. ولم يتم العثور على أي مؤشرات شائعة لاستخدام برامج تعديل خارجية.",
		"integrity_clean_no_gps": "بيانات الجهاز والتوقيت سليمة. لم يتم تسجيل أي بيانات موقع — وهذا طبيعي إذا كان GPS متوقفاً عند التقاط الصورة.",
		"integrity_clean_no_datetime": "بيانات الجهاز والموقع سليمة. لم يتم تسجيل طابع زمني للالتقاط — يحدث هذا غالباً مع لقطات الشاشة أو أدوات التصدير.",
		"integrity_clean_no_device": "بيانات التوقيت والموقع سليمة. لم يتم تسجيل أي معلومات عن الجهاز — شائع في لقطات الشاشة أو الصور المنشورة عبر وسائل التواصل الاجتماعي.",
		"integrity_edit_software": "تم تسجيل برنامج معالجة: تشير البيانات الوصفية لهذه الصورة إلى أنه تم حفظها أو معالجتها باستخدام تطبيق <strong>{software}</strong>. قد تكون بعض تفاصيل الكاميرا الأصلية قد تغيرت.",
		"integrity_future_date": "وقت التقاط غير طبيعي: تاريخ التقاط الصورة (<strong>{date}</strong>) يقع في المستقبل مقارنة بالوقت الحالي. يحدث هذا عادةً بسبب خطأ في ضبط ساعة الكاميرا، <strong>ولكنه يفتح أيضاً احتمال التلاعب المتعمد ببيانات التاريخ.</strong>",
		"integrity_capture_after_file": "فارق توقيت الملف: تاريخ التقاط الصورة (<strong>{date}</strong>) أحدث من تاريخ تعديل الملف الرقمي (<strong>{fileDate}</strong>). يمكن أن يحدث هذا بسبب فروق المنطقة الزمنية أو نقل الملفات بين أجهزة ذات ساعات غير متزامنة، <strong>ولكنه قد يحدث أيضاً إذا تم تعديل تاريخ التقاط الكاميرا للوراء عمداً.</strong>",
		"integrity_missing_original": "لم يتم العثور على وقت الالتقاط: وقت الالتقاط الأصلي غير متوفر، ولكن توجد آثار معالجة من <strong>{indicator}</strong>. يحدث هذا عادةً بشكل تلقائي عند تصدير الصورة بواسطة هذا التطبيق، <strong>ولكنه قد يشير أيضاً إلى إزالة البيانات الوصفية عمداً لإخفاء التوقيت الأصلي.</strong>",
		"integrity_dimension_mismatch": "عدم تطابق الأبعاد: تشير البيانات الوصفية EXIF إلى أن أبعاد الصورة هي <strong>{exifWidth}x{exifHeight}</strong>، ولكن الحجم الفعلي للبكسل للملف هو <strong>{actualWidth}x{actualHeight}</strong>. يشير هذا التعارض إلى أنه تم اقتصاص الصورة أو تغيير حجمها دون تحديث البيانات الوصفية EXIF، وهو أمر شائع في التلاعب اليدوي بالصور.",
		"integrity_fully_stripped": "البيانات الوصفية غير متوفرة: لا تحتوي هذه الملف على أي معلومات EXIF. هذا أمر شائع ويمكن أن يحدث لأسباب متعددة — مثل إرسال الصور عبر واتساب أو وسائل التواصل الاجتماعي التي تحذف البيانات تلقائياً؛ أو لقطات الشاشة؛ أو عندما يقوم شخص ما بإزالتها عمداً لحماية خصوصيته. لا توجد معلومات تقنية يمكن تحليلها من هذا الملف.",
		"integrity_missing_gps": "الموقع GPS: غير متوفر. لا يحتوي الملف على إحداثيات GPS.",
		"integrity_missing_datetime": "وقت الالتقاط: غير متوفر. لم يتم العثور على طابع زمني في الملف.",
		"integrity_missing_device": "معلومات الجهاز: غير متوفرة. لم يتم العثور على بيانات الشركة المصنعة أو الطراز أو إعدادات الكاميرا.",
		"hardware": "تم التقاط هذه الصورة باستخدام كاميرا <strong>{make} {model}</strong>{lens}.",
		"hardware_software": "كان الجهاز يعمل بنظام/تطبيق <strong>{software}</strong> عند التقاط هذه الصورة.",
		"hardware_analysis": "تشير المراجعة الفنية إلى إعدادات كاميرا قياسية وطبيعية لهذا النوع من الأجهزة.",
		"hardware_mod": "تم التقاط هذه الصورة باستخدام كاميرا <strong>{make} {model}</strong>{lens}، ثم تمت معالجتها أو حفظها مجدداً عبر تطبيق <strong>{software}</strong>.",
		"with_lens": " مع عدسة {lens}",
		"exposure": "تم التقاط الصورة بفتحة عدسة <strong>{aperture}</strong>، وسرعة غالق <strong>{shutter}</strong>، وحساسية مستشعر <strong>{iso}</strong>{program}.",
		"exp_low_light": "تشير حساسية المستشعر العالية (ISO) إلى أن الصورة تم التقاطها في مكان مظلم أو داخل بيئة مغلقة.",
		"exp_bright": "تشير حساسية ISO المنخفضة وسرعة الغالق السريعة إلى بيئة تصوير مضيئة، على الأغلب في الخارج تحت ضوء النهار.",
		"exp_shallow_depth": "فتحة العدسة الواسعة تعطي خلفية ضبابية (تأثير العزل البصري)، مما يبرز الهدف الرئيسي بوضوح.",
		"exp_standard": "تشير إعدادات الكاميرا إلى ظروف إضاءة قياسية ومتوازنة.",
		"unknown_aperture": "فتحة عدسة غير معروفة",
		"unknown_shutter": "سرعة غالق غير محددة",
		"unspecified_iso": "ISO غير حدد",
		"using_program": " باستخدام نمط {program}",
		"optics": "تم ضبط العدسة عند بعد بؤري <strong>{focal}</strong>{focal35}{zoom}. يوضح هذا مستوى التقريب (الزووم) المستخدم أثناء التصوير.",
		"unknown_focal": "بعد بؤري غير معروف",
		"equivalent_35mm": " (ما يعادل {mm} ملم في كاميرا الأفلام التقليدية 35 ملم)",
		"digital_zoom": "تم استخدام تقريب رقمي بنسبة {zoom}x",
		"quality": "دقة الصورة هي <strong>{width}x{height}</strong> بكسل. تشير إعدادات الكاميرا إلى مستوى تباين <strong>{contrast}</strong>، ومستوى حدة <strong>{sharpness}</strong>، ونطاق ألوان <strong>{colorSpace}</strong>.",
		"timeline_capture": "تم الالتقاط في: <strong>{dateStr}</strong><br/>",
		"timeline_format": "تنسيق الوقت الأصلي: <code>{rawStr}</code>",
		"timeline_gmt": "التوقيت العالمي المنسق (GMT/UTC): <code>{gmtStr}</code>",
		"timeline_mod_note": "ملاحظة: تم الكشف عن فارق في تاريخ تعديل الملف ({modStr}). يمكن أن يحدث هذا بسبب نشاط نقل الملفات بين الأجهزة، <strong>ولكنه قد يشير أيضاً إلى أن الملف تم تعديله أو حفظه مجدداً بعد الالتقاط الأصلي.</strong>",
		"timeline_integrity": "سلامة الترتيب الزمني تبدو متماسكة وغير منقطعة.",
		"no_chrono": "لم تتوفر أية أختام زمنية موثوقة داخل الملف.",
		"geospatial": "يضع التحليل الجغرافي إحداثيات الجهاز عند <strong>{locationName}</strong>.",
		"remote_location": "موقع جغرافي ناءٍ أو غير مفهرس",
		"no_geo": "لا تتوفر بيانات الموقع (GPS). يعد هذا أمراً طبيعياً إذا كانت ميزة الموقع معطلة في الجهاز أثناء التصوير، <strong>ولكنه قد ينتج أيضاً عن إزالة بيانات الموقع عمداً قبل مشاركة الملف.</strong>",
		"combined_hw_consistent": "جميع الأصول تشترك في ملف العتاد: <strong>{device}</strong>.",
		"combined_hw_discrepancy": "تم رصد تباين في الأجهزة الموثقة: <strong>{deviceList}</strong>.",
		"combined_timeline": "يمتد مسار الأدلة عبر جدول زمني قدره <strong>{diffHours} ساعة</strong>. يبدأ من {start} وينتهي عند {end}.",
		"combined_geo_concentrated": "تتجمع النقاط في دائرة ضيقة (نصف قطرها أقل من 50 متراً).",
		"combined_geo_localized": "التوزع الجغرافي يثبت نشاطاً محلياً في نطاق {dist} متر.",
		"combined_geo_trail": "رسم التحقيق مسار عبور مكثف يغطي <strong>{dist} كيلومتر</strong>.",
		"velocity_warning": "تنبيه السفر: تشير المسافة بين المواقع إلى سرعة عالية جداً تبلغ ({speed} كم/ساعة). يمكن أن يحدث هذا بشكل طبيعي (بسبب فروق المنطقة الزمنية أو أخطاء إشارة GPS أو دمج صور من مصادر متعددة)، <strong>ولكنه قد يشير أيضاً إلى تعديل يدوي لبيانات الوقت أو الموقع بعد الالتقاط.</strong>",
		"sanitization_alert": "لم يتم العثور على المعلومات الأساسية: لا تحتوي هذه الصورة على بيانات الجهاز أو الموقع. يعد هذا أمراً شائعاً تلقائياً عند إرسال الصور عبر تطبيقات المراسلة (مثل واتساب/تليجرام) للحفاظ على الكفاءة والخصوصية، <strong>ولكنه قد يكون أيضاً نتيجة لتطهير البيانات الوصفية عمداً من قبل المستخدم.</strong>",
		"null_island_warn": "إحداثيات صفرية (0,0): يشير الموقع إلى الإحداثيات (0,0) في المحيط. يحدث هذا غالباً بشكل طبيعي إذا فشل مستشعر GPS في التقاط إشارة القمر الصناعي قبل التصوير، <strong>ولكنه قد يشير أيضاً إلى أن بيانات الموقع تم مسحها أو إفراغها عمداً.</strong>",
		"precision_warn": "تنسيق إحداثيات مبسط: يتم تمثيل إحداثيات GPS بأرقام تقريبية بسيطة دون الدقة العشرية المعتادة من مستشعرات GPS. يمكن أن يحدث هذا بسبب تبسيط البيانات من تطبيقات الطرف الثالث أو الإدخال اليدوي في المعرض، <strong>ولكنه يفتح أيضاً احتمال التلاعب بالموقع باستخدام أدوات محاكاة الموقع (GPS الوهمي).</strong>",
		"combined_serial_match": "تطابق الأرقام التسلسلية المادية للعتاد <strong>{serial}</strong>.",
		"combined_hw_sparse_single": "فقط <strong>{count}</strong> من <strong>{total}</strong> ملف يحمل توقيعات الأجهزة.",
		"combined_hw_sparse_consistent": "تشارك <strong>{count}</strong> ملفات في هوية الجهاز <strong>{device}</strong>.",
		"combined_hw_sparse_discrepancy": "تداخل بين أدلة الأجهزة المسجلة: <strong>{deviceList}</strong>.",
		"combined_timeline_sparse": "الربط الزمني مقيد لوجود أصل واحد صالح فقط.",
		"combined_timeline_sparse_note": " تم استنتاج المحاذاة باستخدام الملفات الداعمة.",
		"combined_geo_sparse": "التحقق المكاني ضئيل للغاية.",
		"combined_geo_sparse_note": " التقارب محسوب بالاستناد للملفات المرفوعة.",
		"combined_integrity_warning": "ملاحظة تناسق المجموعة: تحتوي الصور في هذه المجموعة على مستويات متفاوتة من اكتمال البيانات الوصفية.",
		"combined_integrity_stripped_all": "ما مجموعه <strong>{count}</strong> من أصل <strong>{total}</strong> صور تفتقر لبيانات الكاميرا والوقت والموقع. يقع هذا عادةً بشكل تلقائي للصور المحملة من الإنترنت أو وسائل التواصل الاجتماعي، <strong>ولكنه قد يكون ناتجاً أيضاً عن مسح البيانات عمداً قبل جمع الملفات.</strong>",
		"combined_integrity_stripped_part": "ما مجموعه <strong>{count}</strong> من أصل <strong>{total}</strong> صور تفتقد لبعض فئات البيانات (مثل GPS أو معلومات الكاميرا). يمكن أن يحدث هذا بسبب اختلاف إعدادات أذونات الجهاز أثناء التصوير، <strong>ولكنه يفتح أيضاً احتمال إزالة البيانات بشكل انتقائي.</strong>",
		"combined_integrity_mix": "حالة اكتمال مختلطة: من أصل <strong>{total}</strong> صور، هناك <strong>{fully}</strong> بدون تفاصيل بيانات وصفية، و <strong>{partially}</strong> تفتقد لبعض التفاصيل، و <strong>{clean}</strong> فقط تحتفظ بالمعلومات الكاملة.",
		"combined_integrity_clean": "ملف النزاهة القصوى: تحتفظ جميع الملفات الـ <strong>{total}</strong> ببصمات جنائية رقمية كاملة (بيانات الجهاز، والوقت، والإحداثيات الجغرافية). مؤشرات سلسلة العهدة محفوظة جيداً.",
		"no_data_narrative": "تعذر إجراء التحليل لعدم توفر بيانات التعريف (Metadata) الكافية لهذه الفئة.",
		"no_metadata_tags": "لم يتم العثور على أي وسوم بيانات تعريف قياسية في هذه الفئة.",
		"filter_all": "جميع الملفات",
		"filter_complete": "كامل",
		"filter_stripped": "بدون تفاصيل",
		"empty_geospatial": "تعذر إجراء التحليل المكاني. لا يحتوي هذا الملف على إحداثيات جغرافية مضمنة.",
		"empty_hardware": "لا يمكن تحديد هوية الجهاز. لم يتم العثور على بيانات المصنع أو الموديل.",
		"empty_exposure": "معاملات التقاط الضوء (الغالق، الأيزو، الفتحة) غير مسجلة.",
		"empty_optics": "لم يتم استرجاع بيانات العدسة البصرية والبعد البؤري المناظر.",
		"empty_quality": "يعتمد تقييم الجودة على تقديرات عامة بسبب غياب مصفوفة الأبعاد الكاملة.",
		"empty_timeline": "فشل تتبع التسلسل الزمني. لا توجد أختام وقت أصلية مخزنة داخل الملف.",
		"empty_all": "تجريد كامل للبيانات: لا يحمل هذا الملف أي توقيعات جنائية رقمية قابلة للاستعادة.",
		"reconstruct_btn": "انقر لإعادة بناء المخطط الزمني التفصيلي",
		"integrity_reconstruct_btn": "انقر للتحقق من سلامة البيانات التفصيلية",
		"hw_reconstruct_btn": "انقر للمقارنة التفصيلية للأجهزة",
		"reconstruct_start": "بداية التسلسل:",
		"reconstruct_end": "نهاية التسلسل:",
		"reconstruct_total": "إجمالي مدة التسلسل:",
		"reconstruct_jumps": "الانتقالات بين الملفات:",
		"reconstruct_missing": "الملفات الخالية من الأختام الزمنية ({count}):",
		"geo_reconstruct_btn": "انقر لإعادة بناء المسار الجغرافي التفصيلي",
		"geo_max_spread": "أقصى انتشار مكاني:",
		"geo_reconstruct_range": "إجمالي المسار المتسلسل:",
		"geo_reconstruct_note": "*تقريبي بناءً على المسار الأكثر احتمالاً وفقاً للإحداثيات والخرائط.",
		"geo_reconstruct_jumps": "حركات النزوح المكاني:",
		"time_day": "أيام",
		"time_hour": "ساعات",
		"time_minute": "دقائق",
		"time_second": "ثواني",
		"chrono_baseline_single": "تم التقاط جميع الصور في هذه المجموعة باستخدام نفس جهاز الكاميرا: {device}.",
		"chrono_baseline_multiple": "تم التقاط الصور في هذه المجموعة عبر أجهزة متعددة: {devices}.",
		"chrono_baseline_unknown": "لم يتم تسجيل معلومات جهاز الكاميرا للصور في هذه المجموعة.",
		"chrono_initial_location": "يبدأ التسلسل بـ {fileName}، التي تم التقاطها في {date} في {location} (الإحداثيات {coordinates}){lens}.",
		"chrono_initial_gps": "يبدأ التسلسل بـ {fileName}، التي تم التقاطها في {date} عند الإحداثيات {coordinates}{lens}.",
		"chrono_initial_no_gps": "يبدأ التسلسل بـ {fileName}، التي تم التقاطها في {date} دون تسجيل بيانات الموقع{lens}.",
		"chrono_initial_lens": " باستخدام عدسة {lens}",
		"chrono_initial_focal": " عند البعد البؤري {focal}",
		"chrono_step_location": "تم التقاط {fileName} في {date} ({elapsedTime})، على بعد {distance} من {prevFileName} في {location}.",
		"chrono_step_gps": "تم التقاط {fileName} في {date} ({elapsedTime})، على بعد {distance} من {prevFileName} عند الإحداثيات {coordinates}.",
		"chrono_step_location_no_prev_gps": "تم التقاط {fileName} في {date} ({elapsedTime}) في {location}.",
		"chrono_step_gps_no_prev_gps": "تم التقاط {fileName} في {date} ({elapsedTime}) عند الإحداثيات {coordinates}.",
		"chrono_step_no_gps": "تم التقاط {fileName} في {date} ({elapsedTime}). لم يتم تسجيل بيانات الموقع لهذا الالتقاط.",
		"chrono_device_changed": " تغير جهاز الكاميرا من {prevDevice} إلى {currDevice}.",
		"chrono_lens_changed": " تغيرت عدسة الكاميرا من {prevLens} إلى {currLens}.",
		"chrono_focal_changed": " تغير البعد البؤري من {prevFocal} إلى {currFocal}.",
		"time_seconds_later": "بعد {seconds} ثانية",
		"time_minutes_later": "بعد {minutes} دقيقة",
		"time_hours_later": "بعد {hours} ساعة",
		"time_days_later": "بعد {days} يوم"
	},
	reports: {
		"title": "تقرير التحليل والاستخبارات الجنائية الرقمية EXIFSENSE",
		"session": "الجلسة",
		"generated": "تاريخ الإصدار",
		"asset_count": "إجمالي الملفات",
		"combined_intel": "الاستخبارات الرقمية المشتركة",
		"asset_header": "الملف التحليلي {n}",
		"tech_details": "تفاصيل المصدر التقني",
		"forensic_analysis": "سرد الاستنتاج الجنائي",
		"raw_metadata": "قائمة الخصائص الوصفية الكاملة",
		"property": "الخاصية",
		"value": "القيمة الموثقة",
		"category": "التصنيف",
		"unknown": "غير معروف",
		"forensic_id": "المعرف الجنائي"
	}
};
// src/core/narratives/narratives.ts
const LOCALES$1 = {
	en: en_default,
	id: id_default,
	ar: ar_default
};
/**
* Translates a key with parameter substitution and strips HTML tags to produce pure plain text.
*/
function translate(key, params = {}, locale = "en", section = "narratives") {
	const activeLocale = locale in LOCALES$1 ? locale : "en";
	let template = (LOCALES$1[activeLocale]?.[section] || LOCALES$1.en[section] || {})[key] || LOCALES$1.en[section]?.[key] || key;
	for (const [k, v] of Object.entries(params)) template = template.replace(new RegExp(`\\{${k}\\}`, "g"), () => String(v ?? ""));
	return template.replace(/<br\s*\/?>/gi, "\n").replace(/<\/div>/gi, "\n").replace(/<[^>]*>/g, "").trim();
}
const EDIT_SOFTWARE = [
	"adobe",
	"photoshop",
	"lightroom",
	"gimp",
	"canva",
	"snapseed",
	"pixlr",
	"corel",
	"affinity",
	"picsart"
];
/**
* Generates plain-text hardware profile and software tampering narrative.
*/
function generateHardwareNarrative(props, locale = "en") {
	const make = String(props.Make || "an unknown manufacturer");
	const model = String(props.Model || "an unspecified device");
	const lensModel = props.LensModel ? String(props.LensModel) : "";
	const lens = lensModel ? ` ${translate("with_lens", { lens: lensModel }, locale)}` : "";
	const softwareName = props.Software ? String(props.Software) : "";
	if (softwareName && EDIT_SOFTWARE.some((s) => softwareName.toLowerCase().includes(s))) return translate("hardware_mod", {
		make,
		model,
		lens,
		software: softwareName
	}, locale);
	let narrative = translate("hardware", {
		make,
		model,
		lens
	}, locale);
	if (softwareName) narrative += ` ${translate("hardware_software", { software: softwareName }, locale)}`;
	narrative += ` ${translate("hardware_analysis", {}, locale)}`;
	return narrative.trim();
}
/**
* Generates plain-text digital integrity narrative for a single forensic asset.
*/
function generateIntegrityNarrative(asset, locale = "en") {
	if (asset.integrityAlerts && asset.integrityAlerts.length > 0) return asset.integrityAlerts.map((a) => a.defaultMessage).join(" | ");
	const hasGps = asset.exifData.latitude !== void 0 && asset.exifData.longitude !== void 0;
	const hasDate = Boolean(asset.exifData.DateTimeOriginal || asset.exifData.DateTimeDigitized || asset.exifData.DateTime);
	const hasDevice = Boolean(asset.exifData.Make || asset.exifData.Model);
	if (!hasGps && hasDate && hasDevice) return translate("integrity_clean_no_gps", {}, locale);
	if (!hasDate && hasGps && hasDevice) return translate("integrity_clean_no_datetime", {}, locale);
	if (!hasDevice && hasGps && hasDate) return translate("integrity_clean_no_device", {}, locale);
	return translate("integrity_clean", {}, locale);
}
/**
* Formats exposure time into human readable representation (e.g. 1/250s or 2s).
*/
function formatExposureTime(value) {
	if (value === void 0 || value === null) return "";
	const num = Number(value);
	if (isNaN(num) || num <= 0) return String(value);
	if (num < 1) return `1/${Math.round(1 / num)}s`;
	return `${num}s`;
}
/**
* Generates plain-text narrative summarizing exposure and ambient lighting conditions.
*/
function generateExposureNarrative(props, locale = "en") {
	const aperture = props.FNumber ? `f/${props.FNumber}` : props.ApertureValue ? `f/${props.ApertureValue}` : translate("unknown_aperture", {}, locale);
	const shutter = props.ExposureTime ? formatExposureTime(props.ExposureTime) : translate("unknown_shutter", {}, locale);
	const iso = props.ISO ? `ISO ${props.ISO}` : translate("unspecified_iso", {}, locale);
	const program = props.ExposureProgram ? translate("using_program", { program: props.ExposureProgram }, locale) : "";
	const fVal = parseFloat(String(props.FNumber || props.ApertureValue || "0"));
	const isoVal = parseInt(String(props.ISO || "0"), 10);
	const shutterVal = parseFloat(String(props.ExposureTime || "0"));
	let lightingKey = "exp_standard";
	if (fVal > 0 && fVal < 2.8) lightingKey = "exp_shallow_depth";
	else if (isoVal >= 800) lightingKey = "exp_low_light";
	else if (isoVal > 0 && isoVal <= 200 && shutterVal > 0 && shutterVal <= .002) lightingKey = "exp_bright";
	return `${translate("exposure", {
		aperture,
		shutter,
		iso,
		program
	}, locale)} ${translate(lightingKey, {}, locale)}`.trim();
}
/**
* Generates plain-text narrative summarizing optics, focal length, and digital zoom.
*/
function generateOpticsNarrative(props, locale = "en") {
	const focal = props.FocalLength ? `${props.FocalLength}mm` : translate("unknown_focal", {}, locale);
	const focal35 = props.FocalLengthIn35mmFormat ? translate("equivalent_35mm", { mm: props.FocalLengthIn35mmFormat }, locale) : "";
	const zoomRatio = Number(props.DigitalZoomRatio || 0);
	return translate("optics", {
		focal,
		focal35,
		zoom: zoomRatio > 1 ? `. ${translate("digital_zoom", { zoom: zoomRatio }, locale)}` : ""
	}, locale);
}
/**
* Generates plain-text narrative summarizing image resolution, contrast, sharpness, and color space.
*/
function generateQualityNarrative(props, locale = "en") {
	return translate("quality", {
		width: String(props.ImageWidth || props.PixelXDimension || "unknown"),
		height: String(props.ImageHeight || props.PixelYDimension || "unknown"),
		contrast: String(props.Contrast || "Standard"),
		sharpness: String(props.Sharpness || "Standard"),
		colorSpace: String(props.ColorSpace || "sRGB")
	}, locale);
}
/**
* Generates plain-text narrative summarizing chronology, UTC conversion, and modification divergence.
*/
function generateTimelineNarrative(props, locale = "en") {
	const rawCapture = props.DateTimeOriginal || props.CreateDate || props.DateTime;
	if (!rawCapture) return translate("no_chrono", {}, locale);
	const dateObj = parseExifDate(rawCapture);
	const rawStr = String(rawCapture);
	const dateStr = dateObj ? formatFullDate(dateObj) : rawStr;
	const gmtStr = dateObj ? dateObj.toUTCString() : rawStr;
	let narrative = translate("timeline_capture", { dateStr }, locale);
	narrative += `\n${translate("timeline_format", { rawStr }, locale)}`;
	narrative += `\n${translate("timeline_gmt", { gmtStr }, locale)}`;
	const parsedMod = props.ModifyDate ? parseExifDate(props.ModifyDate) : null;
	if (parsedMod && dateObj && parsedMod.getTime() !== dateObj.getTime()) {
		const modStr = formatFullDate(parsedMod);
		narrative += `\n${translate("timeline_mod_note", { modStr }, locale)}`;
	} else narrative += `\n${translate("timeline_integrity", {}, locale)}`;
	return narrative.trim();
}
/**
* Generates plain-text geospatial coordinates and location summary narrative.
*/
function generateGeospatialNarrative(latitude, longitude, locationName, locale = "en") {
	if (latitude === void 0 || longitude === void 0 || isNaN(latitude) || isNaN(longitude)) return translate("no_geo", {}, locale);
	return translate("geospatial", {
		locationName: locationName || translate("remote_location", {}, locale),
		lat: latitude.toFixed(5),
		lng: longitude.toFixed(5)
	}, locale);
}
/**
* Generates natural language multi-asset collective narratives for PDF, Markdown, and UI displays.
*/
function generateCollectiveNarratives(collective, totalAssets, locale = "en") {
	const sections = [];
	let integrityText = "";
	if (collective.integrity.fullyStrippedCount === totalAssets) integrityText = translate("combined_integrity_stripped_all", {
		count: totalAssets,
		total: totalAssets
	}, locale);
	else if (collective.integrity.cleanCount === totalAssets) integrityText = translate("combined_integrity_clean", { total: totalAssets }, locale);
	else integrityText = translate("combined_integrity_mix", {
		total: totalAssets,
		fully: collective.integrity.fullyStrippedCount,
		partially: collective.integrity.partiallyStrippedCount,
		clean: collective.integrity.cleanCount
	}, locale);
	sections.push({
		title: translate("analysis_integrity", {}, locale, "ui"),
		narrative: integrityText
	});
	let hwText = "";
	if (collective.hardware.uniqueDevices.length === 1 && collective.hardware.missingCount === 0) hwText = translate("combined_hw_consistent", { device: collective.hardware.uniqueDevices[0] }, locale);
	else if (collective.hardware.uniqueDevices.length > 1) hwText = translate("combined_hw_discrepancy", { deviceList: collective.hardware.uniqueDevices.join(", ") }, locale);
	else if (collective.hardware.uniqueDevices.length === 1 && collective.hardware.missingCount > 0) hwText = translate("combined_hw_sparse_consistent", {
		count: totalAssets - collective.hardware.missingCount,
		total: totalAssets,
		device: collective.hardware.uniqueDevices[0]
	}, locale);
	if (collective.hardware.hasSerialMatch && collective.hardware.uniqueSerials.length === 1) {
		const serialNote = translate("combined_serial_match", { serial: collective.hardware.uniqueSerials[0] }, locale);
		hwText = hwText ? `${hwText}\n\n${serialNote}` : serialNote;
	}
	sections.push({
		title: translate("analysis_hardware", {}, locale, "ui"),
		narrative: hwText
	});
	let timelineText = "";
	if (collective.timeline.totalDurationMs > 0 && collective.timeline.startTime && collective.timeline.endTime) timelineText = translate("combined_timeline", {
		diffHours: (collective.timeline.totalDurationMs / 36e5).toFixed(1).replace(".0", ""),
		start: formatFullDate(collective.timeline.startTime),
		end: formatFullDate(collective.timeline.endTime)
	}, locale);
	else if (collective.timeline.missingAssets.length === totalAssets - 1) timelineText = translate("combined_timeline_sparse", { total: totalAssets }, locale);
	sections.push({
		title: translate("analysis_timeline", {}, locale, "ui"),
		narrative: timelineText
	});
	let geoText = "";
	const dist = collective.geospatial.totalPathDistanceKm;
	if (collective.geospatial.spreadCategory === "concentrated") geoText = translate("combined_geo_concentrated", {}, locale);
	else if (collective.geospatial.spreadCategory === "localized") geoText = translate("combined_geo_localized", { dist: Math.round(dist * 1e3) }, locale);
	else if (collective.geospatial.spreadCategory === "trail") geoText = translate("combined_geo_trail", { dist: dist.toFixed(1) }, locale);
	if (collective.geospatial.velocityAlert?.hasAnomaly) {
		const speed = collective.geospatial.velocityAlert.maxSpeedKmh;
		const velNote = translate("velocity_warning", { speed }, locale);
		geoText = geoText ? `${geoText}\n\n${velNote}` : velNote;
	}
	sections.push({
		title: translate("analysis_geospatial", {}, locale, "ui"),
		narrative: geoText
	});
	return sections;
}
// src/cli/formatter.ts
function formatSingleOutput(asset, options) {
	const locale = options?.locale || "en";
	const isMarkdown = options?.format === "markdown";
	const lines = [];
	if (isMarkdown) {
		lines.push("# ExifSense Forensic Analysis");
		lines.push(`- **File Name**: ${asset.fileName}`);
		lines.push(`- **File Size**: ${asset.fileSize} bytes`);
		lines.push(`- **Format**: ${asset.fileType}`);
		lines.push(`- **Dimensions**: ${asset.actualWidth ?? "Unknown"} x ${asset.actualHeight ?? "Unknown"}`);
		lines.push(`- **SHA-256**: \`${asset.sha256}\``);
		lines.push(`- **SHA-1**: \`${asset.sha1}\``);
		lines.push("");
	} else {
		lines.push("=== ExifSense Forensic Analysis ===");
		lines.push(`File Name  : ${asset.fileName}`);
		lines.push(`File Size  : ${asset.fileSize} bytes`);
		lines.push(`Format     : ${asset.fileType}`);
		lines.push(`Dimensions : ${asset.actualWidth ?? "Unknown"} x ${asset.actualHeight ?? "Unknown"}`);
		lines.push(`SHA-256    : ${asset.sha256}`);
		lines.push(`SHA-1      : ${asset.sha1}`);
		lines.push("");
	}
	const alertCount = asset.integrityAlerts.length;
	if (isMarkdown) lines.push(`## Integrity Alerts (${alertCount})`);
	else lines.push(`--- Integrity Alerts (${alertCount}) ---`);
	if (alertCount === 0) lines.push("No integrity anomalies detected.");
	else for (const alert of asset.integrityAlerts) {
		const severityTag = `[${alert.severity.toUpperCase()}]`;
		lines.push(`${severityTag} ${alert.defaultMessage}`);
	}
	lines.push("");
	if (isMarkdown) lines.push("## Forensic Narrative");
	else lines.push("--- Forensic Narrative ---");
	const hw = asset.categorizedExif?.["Device Hardware"] || asset.exifData || {};
	const exp = asset.categorizedExif?.["Exposure Settings"] || asset.exifData || {};
	const optics = asset.categorizedExif?.["Optics & Lens"] || asset.exifData || {};
	const quality = asset.categorizedExif?.["Image Quality"] || asset.exifData || {};
	const timeline = asset.categorizedExif?.["Timeline & Date"] || asset.exifData || {};
	const lat = typeof asset.exifData?.latitude === "number" ? asset.exifData.latitude : null;
	const lon = typeof asset.exifData?.longitude === "number" ? asset.exifData.longitude : null;
	const geoText = lat !== null && lon !== null ? generateGeospatialNarrative(lat, lon, asset.locationName ?? null, locale) : "";
	const narrativeSections = [
		{
			title: "Hardware",
			text: generateHardwareNarrative(hw, locale)
		},
		{
			title: "Integrity",
			text: generateIntegrityNarrative(asset, locale)
		},
		{
			title: "Exposure",
			text: generateExposureNarrative(exp, locale)
		},
		{
			title: "Optics",
			text: generateOpticsNarrative(optics, locale)
		},
		{
			title: "Quality",
			text: generateQualityNarrative(quality, locale)
		},
		{
			title: "Timeline",
			text: generateTimelineNarrative(timeline, locale)
		},
		{
			title: "Geospatial",
			text: geoText
		}
	];
	for (const sec of narrativeSections) {
		if (!sec.text) continue;
		if (isMarkdown) {
			lines.push(`### ${sec.title}`);
			lines.push(sec.text);
			lines.push("");
		} else {
			lines.push(`[${sec.title}]`);
			lines.push(sec.text);
			lines.push("");
		}
	}
	return lines.join("\n").trim();
}
function formatDuration(ms) {
	if (ms <= 0) return "0s";
	const seconds = Math.floor(ms / 1e3) % 60;
	const minutes = Math.floor(ms / 6e4) % 60;
	const hours = Math.floor(ms / 36e5) % 24;
	const days = Math.floor(ms / 864e5);
	const parts = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
	return parts.join(" ");
}
function formatBatchOutput(assets, collective, story, options) {
	const locale = options?.locale || "en";
	const isMarkdown = options?.format === "markdown";
	const lines = [];
	if (isMarkdown) {
		lines.push("# ExifSense Collective Intelligence Analysis");
		lines.push(`- **Total Assets**: ${assets.length}`);
		lines.push("");
	} else {
		lines.push("=== ExifSense Collective Intelligence Analysis ===");
		lines.push(`Total Assets: ${assets.length}`);
		lines.push("");
	}
	const assetAlerts = [];
	for (const asset of assets) for (const alert of asset.integrityAlerts) assetAlerts.push({
		fileName: asset.fileName,
		severity: alert.severity,
		message: alert.defaultMessage
	});
	if (assetAlerts.length > 0) {
		if (isMarkdown) {
			lines.push(`## Asset Integrity Alerts (${assetAlerts.length})`);
			for (const a of assetAlerts) lines.push(`- **[${a.severity.toUpperCase()}]** \`${a.fileName}\`: ${a.message}`);
			lines.push("");
		} else {
			lines.push(`--- Asset Integrity Alerts (${assetAlerts.length}) ---`);
			for (const a of assetAlerts) lines.push(`[${a.severity.toUpperCase()}] ${a.fileName}: ${a.message}`);
			lines.push("");
		}
	}
	const collectiveSections = generateCollectiveNarratives(collective, assets.length, locale);
	if (collectiveSections.length > 0) {
		if (isMarkdown) {
			lines.push("## Combined Analysis");
			for (const sec of collectiveSections) {
				if (!sec.narrative) continue;
				lines.push(`### ${sec.title}`);
				lines.push(sec.narrative);
				lines.push("");
			}
		} else {
			lines.push("--- Combined Analysis ---");
			for (const sec of collectiveSections) {
				if (!sec.narrative) continue;
				lines.push(`[${sec.title}]`);
				lines.push(sec.narrative);
				lines.push("");
			}
		}
	}
	if (isMarkdown) {
		lines.push("## Device Hardware");
		lines.push(`- **Consistent Hardware**: ${collective.hardware.isConsistent ? "Yes" : "No"}`);
		lines.push(`- **Unique Devices**: ${collective.hardware.uniqueDevices.join(", ") || "None detected"}`);
		lines.push("");
	} else {
		lines.push("--- Device Hardware ---");
		lines.push(`Consistent Hardware : ${collective.hardware.isConsistent ? "Yes" : "No"}`);
		lines.push(`Unique Devices      : ${collective.hardware.uniqueDevices.join(", ") || "None detected"}`);
		lines.push("");
	}
	if (isMarkdown) {
		lines.push("## Timeline & Sequence");
		lines.push(`- **Total Duration**: ${formatDuration(collective.timeline.totalDurationMs)}`);
		lines.push(`- **Time Gaps Between Photos**: ${collective.timeline.jumps.length}`);
		for (const jump of collective.timeline.jumps) {
			const tag = jump.deltaDays > 0 ? "**[TIME ANOMALY]** " : "";
			lines.push(`  - ${tag}${jump.fromFileName} -> ${jump.toFileName}: ${formatDuration(jump.deltaMs)}`);
		}
		lines.push("");
	} else {
		lines.push("--- Timeline & Sequence ---");
		lines.push(`Total Duration            : ${formatDuration(collective.timeline.totalDurationMs)}`);
		lines.push(`Time Gaps Between Photos  : ${collective.timeline.jumps.length}`);
		for (const jump of collective.timeline.jumps) {
			const tag = jump.deltaDays > 0 ? "[TIME ANOMALY] " : "";
			lines.push(`  ${tag}Gap: ${jump.fromFileName} -> ${jump.toFileName} (${formatDuration(jump.deltaMs)})`);
		}
		lines.push("");
	}
	const velocityAlert = collective.geospatial.velocityAlert;
	if (isMarkdown) {
		lines.push("## Geospatial & Movement");
		lines.push(`- **Total Path Distance**: ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
		lines.push(`- **Max Spread**: ${collective.geospatial.maxSpreadKm.toFixed(2)} km`);
		lines.push(`- **Spread Category**: ${collective.geospatial.spreadCategory}`);
		if (velocityAlert?.hasAnomaly) lines.push(`- **[CRITICAL VELOCITY ANOMALY]**: Impossible speed detected between ${velocityAlert.fromFileName} and ${velocityAlert.toFileName} (${velocityAlert.maxSpeedKmh} km/h).`);
		lines.push("");
	} else {
		lines.push("--- Geospatial & Movement ---");
		lines.push(`Total Path Distance   : ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
		lines.push(`Max Spread            : ${collective.geospatial.maxSpreadKm.toFixed(2)} km`);
		lines.push(`Spread Category       : ${collective.geospatial.spreadCategory}`);
		if (velocityAlert?.hasAnomaly) lines.push(`[CRITICAL] Velocity Anomaly: Impossible speed between ${velocityAlert.fromFileName} and ${velocityAlert.toFileName} (${velocityAlert.maxSpeedKmh} km/h)`);
		lines.push("");
	}
	if (isMarkdown) {
		lines.push("## Chronological Story");
		if (story.baseline) {
			lines.push(`> ${story.baseline}`);
			lines.push("");
		}
		for (const step of story.steps) {
			lines.push(`### Step ${step.stepIndex + 1}: ${step.fileName}`);
			lines.push(step.narrativeText);
			lines.push("");
		}
	} else {
		lines.push("--- Chronological Story ---");
		if (story.baseline) {
			lines.push(`Baseline: ${story.baseline}`);
			lines.push("");
		}
		for (const step of story.steps) {
			lines.push(`[Step ${step.stepIndex + 1}] ${step.fileName}`);
			lines.push(step.narrativeText);
			lines.push("");
		}
	}
	return lines.join("\n").trim();
}
// src/core/forensics/collective.ts
function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const clampedA = Math.min(1, Math.max(0, a));
	return R * (2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0, 1 - clampedA))));
}
const EXIF_CATEGORIES = [
	"Device Hardware",
	"Exposure Settings",
	"Optics & Lens",
	"Image Quality",
	"Timeline & Date",
	"Geospatial",
	"Standards & Info",
	"Miscellaneous"
];
function evaluateCollectiveIntelligence(assets) {
	let cleanCount = 0;
	let partiallyStrippedCount = 0;
	let fullyStrippedCount = 0;
	const matrix = assets.map((asset) => {
		const alerts = evaluateSingleAssetIntegrity(asset);
		const isFullyStripped = alerts.some((a) => a.type === "fully_stripped");
		const isPartiallyStripped = alerts.some((a) => [
			"missing_gps",
			"missing_datetime",
			"missing_device"
		].includes(a.type));
		if (isFullyStripped) fullyStrippedCount += 1;
		else if (isPartiallyStripped) partiallyStrippedCount += 1;
		else cleanCount += 1;
		const categorized = categorizeExif(asset.exifData || {});
		const presence = {};
		for (const cat of EXIF_CATEGORIES) {
			const hasProps = Object.keys(categorized[cat] || {}).length > 0;
			if (cat === "Geospatial") {
				const hasCoords = asset.exifData?.latitude != null && asset.exifData?.longitude != null;
				presence[cat] = hasProps || hasCoords;
			} else presence[cat] = hasProps;
		}
		return {
			fileName: asset.fileName,
			presence
		};
	});
	const hardwareDetails = [];
	const rawDevices = [];
	const rawSerials = [];
	let missingHwCount = 0;
	for (const asset of assets) {
		const exif = asset.exifData || {};
		const make = typeof exif.Make === "string" && exif.Make.trim() ? exif.Make.trim() : "-";
		const model = typeof exif.Model === "string" && exif.Model.trim() ? exif.Model.trim() : "-";
		const software = typeof exif.Software === "string" && exif.Software.trim() ? exif.Software.trim() : "-";
		const lensModel = typeof exif.LensModel === "string" && exif.LensModel.trim() ? exif.LensModel.trim() : "-";
		const bodySerialVal = exif.BodySerialNumber ?? exif.SerialNumber ?? exif.InternalSerialNumber;
		const bodySerial = bodySerialVal != null && String(bodySerialVal).trim() ? String(bodySerialVal).trim() : "-";
		const lensSerialVal = exif.LensSerialNumber;
		const lensSerial = lensSerialVal != null && String(lensSerialVal).trim() ? String(lensSerialVal).trim() : "-";
		hardwareDetails.push({
			fileName: asset.fileName,
			make,
			model,
			software,
			lensModel,
			bodySerial,
			lensSerial
		});
		const devStr = [make !== "-" ? make : "", model !== "-" ? model : ""].filter(Boolean).join(" ").trim();
		if (devStr) rawDevices.push(devStr);
		else missingHwCount += 1;
		if (bodySerial !== "-") rawSerials.push(bodySerial);
	}
	const uniqueDevices = Array.from(new Set(rawDevices));
	const uniqueSerials = Array.from(new Set(rawSerials));
	const isConsistent = uniqueDevices.length <= 1;
	const hasSerialMatch = uniqueSerials.length === 1 && assets.length > 1;
	const validTimeAssets = [];
	const missingAssets = [];
	for (const asset of assets) {
		const exif = asset.exifData || {};
		const d = parseExifDate(exif.DateTimeOriginal || exif.CreateDate || exif.DateTime);
		if (d) validTimeAssets.push({
			fileName: asset.fileName,
			date: d,
			time: d.getTime()
		});
		else missingAssets.push(asset.fileName);
	}
	validTimeAssets.sort((a, b) => a.time - b.time);
	const timelineJumps = [];
	let startTime = null;
	let endTime = null;
	let totalDurationMs = 0;
	if (validTimeAssets.length > 0) {
		startTime = validTimeAssets[0].date;
		endTime = validTimeAssets[validTimeAssets.length - 1].date;
		totalDurationMs = endTime.getTime() - startTime.getTime();
		for (let i = 0; i < validTimeAssets.length - 1; i++) {
			const curr = validTimeAssets[i];
			const next = validTimeAssets[i + 1];
			const diffMs = next.time - curr.time;
			const deltaDays = Math.floor(diffMs / 864e5);
			const deltaHours = Math.floor(diffMs % 864e5 / 36e5);
			const deltaMinutes = Math.floor(diffMs % 36e5 / 6e4);
			const deltaSeconds = Math.floor(diffMs % 6e4 / 1e3);
			timelineJumps.push({
				fromFileName: curr.fileName,
				toFileName: next.fileName,
				deltaMs: diffMs,
				deltaDays,
				deltaHours,
				deltaMinutes,
				deltaSeconds
			});
		}
	}
	const geoAssets = assets.map((a) => {
		const lat = a.exifData?.latitude != null ? Number(a.exifData.latitude) : null;
		const lng = a.exifData?.longitude != null ? Number(a.exifData.longitude) : null;
		const date = parseExifDate(a.exifData?.DateTimeOriginal || a.exifData?.CreateDate || a.exifData?.DateTime);
		return {
			fileName: a.fileName,
			lat,
			lng,
			date,
			time: date ? date.getTime() : null
		};
	}).filter((g) => g.lat != null && g.lng != null && !Number.isNaN(g.lat) && !Number.isNaN(g.lng));
	const missingCoordinatesCount = assets.length - geoAssets.length;
	let maxSpreadKm = 0;
	let totalPathDistanceKm = 0;
	let spreadCategory = "none";
	const geoJumps = [];
	let velocityAlert = null;
	if (geoAssets.length === 1) spreadCategory = "concentrated";
	else if (geoAssets.length > 1) {
		for (let i = 0; i < geoAssets.length; i++) for (let j = i + 1; j < geoAssets.length; j++) {
			const d = calculateDistance(geoAssets[i].lat, geoAssets[i].lng, geoAssets[j].lat, geoAssets[j].lng);
			if (d > maxSpreadKm) maxSpreadKm = d;
		}
		if (maxSpreadKm < .05) spreadCategory = "concentrated";
		else if (maxSpreadKm < 1) spreadCategory = "localized";
		else spreadCategory = "trail";
		const chronoPoints = geoAssets.filter((g) => g.time != null).sort((a, b) => a.time - b.time);
		let hasVelocityAnomaly = false;
		let maxSpeed = 0;
		let anomalyFrom;
		let anomalyTo;
		if (chronoPoints.length > 1) {
			for (let i = 0; i < chronoPoints.length - 1; i++) {
				const p1 = chronoPoints[i];
				const p2 = chronoPoints[i + 1];
				const distKm = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
				const distM = distKm * 1e3;
				totalPathDistanceKm += distKm;
				geoJumps.push({
					fromFileName: p1.fileName,
					toFileName: p2.fileName,
					distanceKm: distKm,
					distanceMeters: distM
				});
				const timeDiffHours = (p2.time - p1.time) / 36e5;
				if (timeDiffHours === 0 && distKm > .05) {
					hasVelocityAnomaly = true;
					anomalyFrom = p1.fileName;
					anomalyTo = p2.fileName;
					maxSpeed = Math.max(maxSpeed, 999999);
				} else if (timeDiffHours > 0) {
					const speed = distKm / timeDiffHours;
					if (speed > maxSpeed) maxSpeed = speed;
					if (speed > 1200 && !hasVelocityAnomaly) {
						hasVelocityAnomaly = true;
						anomalyFrom = p1.fileName;
						anomalyTo = p2.fileName;
					}
				}
			}
			velocityAlert = {
				hasAnomaly: hasVelocityAnomaly,
				maxSpeedKmh: Math.round(maxSpeed),
				fromFileName: anomalyFrom,
				toFileName: anomalyTo
			};
		}
	}
	return {
		integrity: {
			cleanCount,
			partiallyStrippedCount,
			fullyStrippedCount,
			matrix
		},
		hardware: {
			isConsistent,
			uniqueDevices,
			uniqueSerials,
			missingCount: missingHwCount,
			hasSerialMatch,
			details: hardwareDetails
		},
		timeline: {
			totalDurationMs,
			startTime,
			endTime,
			missingAssets,
			jumps: timelineJumps
		},
		geospatial: {
			totalPathDistanceKm,
			maxSpreadKm,
			spreadCategory,
			missingCoordinatesCount,
			jumps: geoJumps,
			velocityAlert
		}
	};
}
// src/core/narratives/chronological.ts
const LOCALES = {
	en: en_default,
	id: id_default,
	ar: ar_default
};
function getTemplate(key, locale, section = "narratives") {
	return (LOCALES[locale]?.[section] || LOCALES.en[section] || {})[key] || LOCALES.en[section]?.[key] || key;
}
function interpolate(template, params) {
	let result = template;
	for (const [k, v] of Object.entries(params)) result = result.replace(new RegExp(`\\{${k}\\}`, "g"), () => v);
	return result;
}
function formatEvidence(value, format) {
	if (format === "html") return `<span class="evidence-highlight">${value}</span>`;
	if (format === "markdown") return `**${value}**`;
	return value;
}
function formatElapsedTime(diffSeconds, locale) {
	if (diffSeconds < 60) return interpolate(getTemplate("time_seconds_later", locale), { seconds: String(diffSeconds) });
	if (diffSeconds < 3600) {
		const mins = Math.max(1, Math.round(diffSeconds / 60));
		return interpolate(getTemplate("time_minutes_later", locale), { minutes: String(mins) });
	}
	if (diffSeconds < 86400) {
		const hours = (diffSeconds / 3600).toFixed(1).replace(".0", "");
		return interpolate(getTemplate("time_hours_later", locale), { hours });
	}
	const days = (diffSeconds / 86400).toFixed(1).replace(".0", "");
	return interpolate(getTemplate("time_days_later", locale), { days });
}
function formatDistance(distanceMeters) {
	if (distanceMeters >= 1e3) return `${(distanceMeters / 1e3).toFixed(1).replace(".0", "")} km`;
	return `${distanceMeters} m`;
}
/**
* Parses and sorts an array of forensic assets into chronological event nodes (BP-NARRATIVE-001).
* Fails fast if fewer than 2 assets are provided.
*/
function parseChronologicalEvents(assets) {
	if (!assets || assets.length < 2) throw new Error("Chronological narrative requires at least 2 assets");
	return assets.map((asset, index) => {
		const exif = asset.exifData || {};
		const parsedDate = parseExifDate(exif.DateTimeOriginal || exif.CreateDate || exif.DateTime);
		const hasCaptureTime = parsedDate !== null;
		const timestamp = parsedDate || new Date(asset.fileDate || 0);
		const latRaw = exif.latitude != null ? Number(exif.latitude) : null;
		const lngRaw = exif.longitude != null ? Number(exif.longitude) : null;
		const hasGps = latRaw !== null && lngRaw !== null && !Number.isNaN(latRaw) && !Number.isNaN(lngRaw);
		const make = typeof exif.Make === "string" && exif.Make.trim() ? exif.Make.trim() : "";
		const model = typeof exif.Model === "string" && exif.Model.trim() ? exif.Model.trim() : "";
		const deviceString = [make, model].filter(Boolean).join(" ");
		const lensModel = typeof exif.LensModel === "string" && exif.LensModel.trim() ? exif.LensModel.trim() : null;
		const focalLength = exif.FocalLength != null ? String(exif.FocalLength).trim() : null;
		const fNumber = exif.FNumber != null ? String(exif.FNumber).trim() : null;
		const iso = exif.ISO != null ? String(exif.ISO).trim() : null;
		const locationName = asset.locationData?.display_name || asset.locationName || null;
		return {
			assetIndex: index,
			fileName: asset.fileName,
			timestamp,
			hasCaptureTime,
			latitude: hasGps ? latRaw : null,
			longitude: hasGps ? lngRaw : null,
			hasGps,
			locationName,
			make,
			model,
			deviceString,
			lensModel,
			focalLength,
			fNumber,
			iso
		};
	}).slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
function buildBaseline(nodes, locale, format) {
	const devices = Array.from(new Set(nodes.map((n) => n.deviceString).filter(Boolean)));
	if (devices.length === 1) {
		const formattedDevice = formatEvidence(devices[0], format);
		return interpolate(getTemplate("chrono_baseline_single", locale), { device: formattedDevice });
	}
	if (devices.length > 1) {
		const formattedList = devices.map((d) => formatEvidence(d, format)).join(", ");
		return interpolate(getTemplate("chrono_baseline_multiple", locale), { devices: formattedList });
	}
	return getTemplate("chrono_baseline_unknown", locale);
}
function buildInitialStep(node, locale, format) {
	const formattedFileName = formatEvidence(node.fileName, format);
	const formattedDate = formatNaturalDate(node.timestamp, locale);
	const highlightedDate = formatEvidence(formattedDate, format);
	let lensPart = "";
	let lensString;
	if (node.lensModel) {
		lensString = node.lensModel;
		const highlightedLens = formatEvidence(node.lensModel, format);
		lensPart = interpolate(getTemplate("chrono_initial_lens", locale), { lens: highlightedLens });
	} else if (node.focalLength) {
		const focalWithUnit = node.focalLength.endsWith("mm") ? node.focalLength : `${node.focalLength}mm`;
		lensString = focalWithUnit;
		const highlightedFocal = formatEvidence(focalWithUnit, format);
		lensPart = interpolate(getTemplate("chrono_initial_focal", locale), { focal: highlightedFocal });
	}
	let narrativeText = "";
	if (node.hasGps && node.latitude !== null && node.longitude !== null) {
		const highlightedCoords = formatEvidence(`${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}`, format);
		if (node.locationName) {
			const highlightedLocation = formatEvidence(node.locationName, format);
			narrativeText = interpolate(getTemplate("chrono_initial_location", locale), {
				fileName: formattedFileName,
				date: highlightedDate,
				location: highlightedLocation,
				coordinates: highlightedCoords,
				lens: lensPart
			});
		} else narrativeText = interpolate(getTemplate("chrono_initial_gps", locale), {
			fileName: formattedFileName,
			date: highlightedDate,
			coordinates: highlightedCoords,
			lens: lensPart
		});
	} else narrativeText = interpolate(getTemplate("chrono_initial_no_gps", locale), {
		fileName: formattedFileName,
		date: highlightedDate,
		lens: lensPart
	});
	return {
		stepIndex: 0,
		assetIndex: node.assetIndex,
		fileName: node.fileName,
		narrativeText,
		evidence: {
			formattedDate,
			deviceString: node.deviceString,
			deviceChanged: false,
			lensString,
			lensChanged: false
		}
	};
}
function buildSubsequentStep(curr, prev, stepIndex, locale, format) {
	const diffMs = curr.timestamp.getTime() - prev.timestamp.getTime();
	const rawElapsedTime = formatElapsedTime(Math.max(0, Math.round(diffMs / 1e3)), locale);
	const highlightedElapsedTime = formatEvidence(rawElapsedTime, format);
	const formattedFileName = formatEvidence(curr.fileName, format);
	const formattedPrevFileName = formatEvidence(prev.fileName, format);
	const formattedDate = formatNaturalDate(curr.timestamp, locale);
	const highlightedDate = formatEvidence(formattedDate, format);
	let distanceMeters;
	let distanceString;
	let narrativeText = "";
	if (curr.hasGps && prev.hasGps && curr.latitude !== null && curr.longitude !== null && prev.latitude !== null && prev.longitude !== null) {
		const distKm = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
		distanceMeters = Math.round(distKm * 1e3);
		distanceString = formatDistance(distanceMeters);
		const highlightedDistance = formatEvidence(distanceString, format);
		if (curr.locationName) {
			const highlightedLocation = formatEvidence(curr.locationName, format);
			narrativeText = interpolate(getTemplate("chrono_step_location", locale), {
				fileName: formattedFileName,
				date: highlightedDate,
				elapsedTime: highlightedElapsedTime,
				distance: highlightedDistance,
				prevFileName: formattedPrevFileName,
				location: highlightedLocation
			});
		} else {
			const highlightedCoords = formatEvidence(`${curr.latitude.toFixed(5)}, ${curr.longitude.toFixed(5)}`, format);
			narrativeText = interpolate(getTemplate("chrono_step_gps", locale), {
				fileName: formattedFileName,
				date: highlightedDate,
				elapsedTime: highlightedElapsedTime,
				distance: highlightedDistance,
				prevFileName: formattedPrevFileName,
				coordinates: highlightedCoords
			});
		}
	} else if (curr.hasGps && curr.latitude !== null && curr.longitude !== null) {
		if (curr.locationName) {
			const highlightedLocation = formatEvidence(curr.locationName, format);
			narrativeText = interpolate(getTemplate("chrono_step_location_no_prev_gps", locale), {
				fileName: formattedFileName,
				date: highlightedDate,
				elapsedTime: highlightedElapsedTime,
				location: highlightedLocation
			});
		} else {
			const highlightedCoords = formatEvidence(`${curr.latitude.toFixed(5)}, ${curr.longitude.toFixed(5)}`, format);
			narrativeText = interpolate(getTemplate("chrono_step_gps_no_prev_gps", locale), {
				fileName: formattedFileName,
				date: highlightedDate,
				elapsedTime: highlightedElapsedTime,
				coordinates: highlightedCoords
			});
		}
	} else narrativeText = interpolate(getTemplate("chrono_step_no_gps", locale), {
		fileName: formattedFileName,
		date: highlightedDate,
		elapsedTime: highlightedElapsedTime
	});
	const deviceChanged = Boolean(curr.deviceString) && Boolean(prev.deviceString) && curr.deviceString !== prev.deviceString;
	if (deviceChanged) {
		const prevDev = formatEvidence(prev.deviceString, format);
		const currDev = formatEvidence(curr.deviceString, format);
		const deviceClause = interpolate(getTemplate("chrono_device_changed", locale), {
			prevDevice: prevDev,
			currDevice: currDev
		});
		narrativeText += deviceClause;
	}
	let lensChanged = false;
	let lensString;
	if (curr.lensModel) lensString = curr.lensModel;
	else if (curr.focalLength) lensString = curr.focalLength.endsWith("mm") ? curr.focalLength : `${curr.focalLength}mm`;
	if (curr.lensModel && prev.lensModel && curr.lensModel !== prev.lensModel) {
		lensChanged = true;
		const prevL = formatEvidence(prev.lensModel, format);
		const currL = formatEvidence(curr.lensModel, format);
		const lensClause = interpolate(getTemplate("chrono_lens_changed", locale), {
			prevLens: prevL,
			currLens: currL
		});
		narrativeText += lensClause;
	} else if (curr.focalLength && prev.focalLength && curr.focalLength !== prev.focalLength) {
		lensChanged = true;
		const prevFWithUnit = prev.focalLength.endsWith("mm") ? prev.focalLength : `${prev.focalLength}mm`;
		const currFWithUnit = curr.focalLength.endsWith("mm") ? curr.focalLength : `${curr.focalLength}mm`;
		const prevF = formatEvidence(prevFWithUnit, format);
		const currF = formatEvidence(currFWithUnit, format);
		const focalClause = interpolate(getTemplate("chrono_focal_changed", locale), {
			prevFocal: prevF,
			currFocal: currF
		});
		narrativeText += focalClause;
	}
	return {
		stepIndex,
		assetIndex: curr.assetIndex,
		fileName: curr.fileName,
		narrativeText,
		evidence: {
			formattedDate,
			elapsedTimeString: rawElapsedTime,
			prevFileName: prev.fileName,
			distanceMeters,
			distanceString,
			locationName: curr.locationName || void 0,
			deviceString: curr.deviceString,
			deviceChanged,
			lensString,
			lensChanged
		}
	};
}
/**
* Synthesizes a sequential, chronological batch narrative across multiple forensic assets (BP-NARRATIVE-003).
*/
function generateChronologicalBatchStory(assets, options) {
	const locale = options?.locale || "en";
	const format = options?.format || "html";
	const nodes = parseChronologicalEvents(assets);
	const baseline = buildBaseline(nodes, locale, format);
	const steps = [];
	steps.push(buildInitialStep(nodes[0], locale, format));
	for (let i = 1; i < nodes.length; i++) steps.push(buildSubsequentStep(nodes[i], nodes[i - 1], i, locale, format));
	return {
		baseline,
		steps,
		fullNarrative: [baseline, ...steps.map((s) => s.narrativeText)].join("\n\n")
	};
}
// src/cli/runner.ts
const HELP_TEXT = `ExifSense CLI - Terminal-native photo metadata forensics & narrative harness

Usage:
  exifsense single <path> [options]         Analyze a single image or JSON asset
  exifsense batch <path...> [options]       Analyze multiple images or JSON assets
  exifsense scenario <name> [options]       Run a preset simulation scenario
  exifsense extract <image-path> [out-json] Extract raw EXIF metadata into JSON
  exifsense --help                          Show this help message
  exifsense --version                       Show version

Options:
  --locale <en|id|ar>       Narrative language (default: en)
  --format <plain|markdown> Output formatting (default: plain)
  --out <path>              Write output text to file instead of stdout`;
const VERSION_TEXT = "ExifSense CLI v1.0.0";
async function runCli(argv) {
	try {
		return await executeCommand(parseCliArgs(argv));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		process.stderr.write(`Error: ${message}\n`);
		return {
			success: false,
			exitCode: 1,
			errorText: message
		};
	}
}
async function executeCommand(command) {
	if (command.command === "help") {
		process.stdout.write(`${HELP_TEXT}\n`);
		return {
			success: true,
			exitCode: 0,
			outputText: HELP_TEXT
		};
	}
	if (command.command === "version") {
		process.stdout.write(`${VERSION_TEXT}\n`);
		return {
			success: true,
			exitCode: 0,
			outputText: VERSION_TEXT
		};
	}
	if (command.command === "single") {
		const outputText = formatSingleOutput(await loadAssetSource(command.targetPath), command.options);
		await deliverOutput(outputText, command.options.out);
		return {
			success: true,
			exitCode: 0,
			outputText
		};
	}
	if (command.command === "batch") {
		const outputText = processBatchAssets(await Promise.all(command.targetPaths.map((p) => loadAssetSource(p))), command.options);
		await deliverOutput(outputText, command.options.out);
		return {
			success: true,
			exitCode: 0,
			outputText
		};
	}
	if (command.command === "scenario") {
		const result = await resolveScenario(command.scenarioName);
		let outputText = "";
		if (Array.isArray(result)) outputText = processBatchAssets(result, command.options);
		else outputText = formatSingleOutput(result, command.options);
		await deliverOutput(outputText, command.options.out);
		return {
			success: true,
			exitCode: 0,
			outputText
		};
	}
	if (command.command === "extract") {
		const metadata = await extractBaseline(command.sourcePath, command.outputPath);
		const jsonString = JSON.stringify(metadata, null, 2);
		let outputText = jsonString;
		if (command.outputPath) {
			outputText = `Baseline extracted to ${command.outputPath}`;
			process.stdout.write(`${outputText}\n`);
		} else process.stdout.write(`${jsonString}\n`);
		return {
			success: true,
			exitCode: 0,
			outputText
		};
	}
	return {
		success: false,
		exitCode: 1,
		errorText: "Unhandled command"
	};
}
function processBatchAssets(assets, options) {
	return formatBatchOutput(assets, evaluateCollectiveIntelligence(assets), generateChronologicalBatchStory(assets, {
		locale: options.locale,
		format: options.format === "markdown" ? "markdown" : "plain"
	}), options);
}
async function deliverOutput(text, outPath) {
	if (outPath) {
		const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
		await fs.promises.mkdir(path.dirname(absOut), { recursive: true });
		await fs.promises.writeFile(absOut, text, "utf8");
		process.stdout.write(`Output written to ${outPath}\n`);
		return;
	}
	process.stdout.write(`${text}\n`);
}
// src/cli/entry.ts
const result = await runCli(process.argv.slice(2));
process.exit(result.exitCode);
export {};
