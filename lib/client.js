window.__ModuleLoader__.load({
	id: "@aa2246740/dsh-skillhub",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dshx-css-module:SkillHubPanel.module.css.mjs
		const css = ".H9YCKq_root{box-sizing:border-box;min-width:0;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);--skillhub-motion-fast:.12s;--skillhub-motion-panel:.18s;--skillhub-ease-out:cubic-bezier(.2, .8, .2, 1);flex-direction:column;gap:10px;font-size:13px;line-height:20px;display:flex}.H9YCKq_root[data-surface=page]{max-width:720px;min-height:0;max-height:100%;padding:4px 0 24px;overflow:auto}.H9YCKq_root[data-surface=popover]{gap:8px;width:420px;max-width:calc(100vw - 24px);max-height:min(640px,100vh - 24px);padding:12px 12px 10px;overflow:hidden}.H9YCKq_chipWrap{position:relative}.H9YCKq_trigger{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);height:32px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;transition:background-color var(--skillhub-motion-fast) ease, border-color var(--skillhub-motion-fast) ease, color var(--skillhub-motion-fast) ease, transform .1s ease;background:0 0;border-radius:18px;justify-content:center;align-items:center;gap:6px;padding:0 10px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.H9YCKq_trigger:hover:not(:disabled),.H9YCKq_trigger:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}.H9YCKq_trigger:active:not(:disabled){transform:scale(.96)}.H9YCKq_trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.H9YCKq_trigger[data-open]{border-color:var(--dsw-alias-button-ghost-active-border);background:var(--dsw-alias-button-ghost-active-fill);color:var(--dsw-alias-brand-primary)}.H9YCKq_triggerLabel{white-space:nowrap}@container (width<=460px){.H9YCKq_triggerLabel{display:none}.H9YCKq_trigger{width:32px;padding:0}}.H9YCKq_menu{z-index:900;box-sizing:border-box;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);background-color:var(--dsw-alias-bg-overlay);background-image:linear-gradient(var(--dsw-specific-menu), var(--dsw-specific-menu));max-width:calc(100vw - 24px);max-height:min(640px,100vh - 24px);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);transform-origin:0 100%;animation:H9YCKq_skillhub-panel-enter var(--skillhub-motion-panel) var(--skillhub-ease-out);isolation:isolate;border-radius:12px;flex-direction:column;font-size:13px;line-height:20px;display:flex;position:fixed;overflow:hidden}@keyframes H9YCKq_skillhub-panel-enter{0%{opacity:0;transform:translateY(5px)scale(.992)}to{opacity:1;transform:translateY(0)scale(1)}}.H9YCKq_toolbar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;min-width:0;display:flex}.H9YCKq_tabs{align-items:center;gap:4px;min-width:0;display:inline-flex}.H9YCKq_pillCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:11px;line-height:17px}.H9YCKq_toolbarEnd{flex:none;align-items:center;gap:6px;margin-left:auto;display:flex}.H9YCKq_segment{background:var(--dsw-alias-bg-layer-2);border-radius:14px;align-items:center;min-width:0;padding:2px;display:flex}.H9YCKq_segment button{min-width:0;height:20px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;transition:background-color var(--skillhub-motion-fast) ease, color var(--skillhub-motion-fast) ease;background:0 0;border:0;border-radius:10px;padding:0 8px;font-size:12px;font-weight:500;line-height:18px}.H9YCKq_segment button[data-active]{background:var(--dsw-specific-menu);box-shadow:inset 0 0 0 1px var(--dsw-alias-button-ghost-active-border);color:var(--dsw-alias-label-primary)}.H9YCKq_segment button:disabled{cursor:not-allowed;opacity:.45}.H9YCKq_segment button:focus-visible,.H9YCKq_switch:focus-visible,.H9YCKq_chevron:focus-visible,.H9YCKq_nameBtn:focus-visible,.H9YCKq_inherit:focus-visible,.H9YCKq_layerTag:focus-visible,.H9YCKq_slash:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.H9YCKq_search{min-width:0;display:block}.H9YCKq_field{width:100%;min-width:0}.H9YCKq_body,.H9YCKq_mcpBody{overscroll-behavior:contain;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);flex-direction:column;flex:auto;gap:8px;min-height:0;display:flex;overflow:auto}.H9YCKq_root[data-surface=popover] .H9YCKq_body,.H9YCKq_root[data-surface=popover] .H9YCKq_mcpBody{max-height:min(480px,60vh)}.H9YCKq_error,.H9YCKq_warn{border-radius:8px;margin:0;padding:6px 10px;font-size:12px;line-height:18px}.H9YCKq_error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}.H9YCKq_warn{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent)}.H9YCKq_bannerRow{flex-direction:column;align-items:flex-start;gap:6px;display:flex}.H9YCKq_empty{color:var(--dsw-alias-label-tertiary);margin:0;padding:8px 6px 12px;font-size:12px;line-height:18px}.H9YCKq_skeleton{flex-direction:column;gap:6px;padding:4px 0;display:flex}.H9YCKq_skel{background:var(--dsw-alias-bg-layer-2);border-radius:8px;height:32px}.H9YCKq_root[aria-busy=true] .H9YCKq_body,.H9YCKq_root[aria-busy=true] .H9YCKq_mcpBody,.H9YCKq_mcpBody[aria-busy=true]{opacity:.72}.H9YCKq_emptyCard{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);text-align:center;border-radius:10px;flex-direction:column;justify-content:center;align-items:center;margin:8px 0;padding:28px 20px 22px;display:flex}.H9YCKq_emptyIcon{background:var(--dsw-alias-bg-layer-2);width:44px;height:44px;color:var(--dsw-alias-label-tertiary);border-radius:50%;justify-content:center;align-items:center;margin-bottom:10px;display:flex}.H9YCKq_emptyTitle{margin:0 0 4px;font-size:13px;font-weight:600;line-height:20px}.H9YCKq_emptyDesc{max-width:300px;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}.H9YCKq_home{flex-direction:column;gap:2px;min-width:0;display:flex}.H9YCKq_home+.H9YCKq_home{margin-top:8px}.H9YCKq_row{box-sizing:border-box;min-height:32px;padding:3px 6px 3px calc(6px + var(--depth,0) * 16px);border-radius:8px;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:8px;display:grid}.H9YCKq_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.H9YCKq_row[data-broken]{grid-template-columns:20px minmax(0,1fr)}.H9YCKq_chevron{width:20px;height:20px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:center;align-items:center;padding:0;display:inline-flex}.H9YCKq_chevron[aria-expanded=true]{color:var(--dsw-alias-label-secondary)}.H9YCKq_chevron svg{transition:transform var(--skillhub-motion-fast) var(--skillhub-ease-out)}.H9YCKq_chevron[aria-expanded=true] svg{transform:rotate(90deg)}.H9YCKq_chevronGhost{width:20px;height:20px}.H9YCKq_cell{flex-direction:column;gap:2px;min-width:0;display:flex}.H9YCKq_nameBtn{min-width:0;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;padding:0;display:flex}.H9YCKq_nameBtn:disabled{cursor:default}.H9YCKq_name{min-width:0;color:var(--dsw-alias-label-primary);align-items:center;gap:6px;display:flex}.H9YCKq_nameText{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.H9YCKq_layerTag{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);color:var(--dsw-alias-state-business-primary);font:inherit;white-space:nowrap;cursor:pointer;transition:background-color var(--skillhub-motion-fast) ease;border:0;border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.H9YCKq_layerTag:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}.H9YCKq_layerTag:disabled{cursor:not-allowed;opacity:.45}.H9YCKq_inherit{min-width:0;color:var(--dsw-alias-state-business-primary);font:inherit;white-space:nowrap;cursor:pointer;background:0 0;border:0;border-radius:6px;padding:2px 6px;font-size:11px;font-weight:500;line-height:17px}.H9YCKq_inherit:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)}.H9YCKq_inherit:disabled{cursor:not-allowed;opacity:.45}.H9YCKq_actions{flex:none;align-items:center;gap:4px;display:flex}.H9YCKq_slash{min-width:0;max-width:150px;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;cursor:pointer;opacity:0;transition:opacity var(--skillhub-motion-fast) ease, background-color var(--skillhub-motion-fast) ease;background:0 0;border:0;border-radius:6px;padding:1px 6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:17px;overflow:hidden}.H9YCKq_row:hover .H9YCKq_slash,.H9YCKq_slash:focus-visible,.H9YCKq_slash[data-copied]{opacity:1}.H9YCKq_slash:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.H9YCKq_slash[data-copied]{color:var(--dsw-alias-state-success-primary)}.H9YCKq_switch{box-sizing:border-box;background:var(--dsw-alias-border-l3);cursor:pointer;border:0;border-radius:10px;flex:none;width:36px;height:20px;padding:2px;position:relative}.H9YCKq_switch[data-state=on]{background:var(--dsw-alias-brand-primary)}.H9YCKq_switch[data-state=mixed]{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l3))}.H9YCKq_switch:disabled{cursor:not-allowed;opacity:.5}.H9YCKq_thumb{background:var(--dsw-alias-label-primary-foreground);width:16px;height:16px;transition:transform var(--skillhub-motion-fast) var(--skillhub-ease-out);border-radius:50%;display:block;box-shadow:0 1px 2px #0000002e}.H9YCKq_switch[data-state=on] .H9YCKq_thumb{transform:translate(16px)}.H9YCKq_switch[data-state=mixed] .H9YCKq_thumb{transform:translate(8px)}.H9YCKq_mcpList{flex-direction:column;gap:2px;display:flex}.H9YCKq_variantList{flex-direction:column;gap:2px;min-width:0;display:flex}.H9YCKq_variant{align-items:center;gap:6px;min-width:0;display:flex}.H9YCKq_variantSource{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;line-height:17px}.H9YCKq_variantCommand{min-width:0;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:17px;overflow:hidden}.H9YCKq_problems{color:var(--dsw-alias-state-warn-primary);margin:0;padding-left:16px;font-size:11px;line-height:17px}.H9YCKq_scope{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:11px;line-height:17px;overflow:hidden}@media (prefers-reduced-motion:reduce){.H9YCKq_menu{animation:none}.H9YCKq_trigger,.H9YCKq_thumb,.H9YCKq_chevron svg,.H9YCKq_slash,.H9YCKq_layerTag,.H9YCKq_segment button{transition:none}.H9YCKq_trigger:active:not(:disabled){transform:none}}";
		const tagId = "@aa2246740/dsh-skillhub/SkillHubPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@aa2246740/dsh-skillhub";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SkillHubPanel_module_css_default = {
			"actions": "H9YCKq_actions",
			"bannerRow": "H9YCKq_bannerRow",
			"body": "H9YCKq_body",
			"cell": "H9YCKq_cell",
			"chevron": "H9YCKq_chevron",
			"chevronGhost": "H9YCKq_chevronGhost",
			"chipWrap": "H9YCKq_chipWrap",
			"empty": "H9YCKq_empty",
			"emptyCard": "H9YCKq_emptyCard",
			"emptyDesc": "H9YCKq_emptyDesc",
			"emptyIcon": "H9YCKq_emptyIcon",
			"emptyTitle": "H9YCKq_emptyTitle",
			"error": "H9YCKq_error",
			"field": "H9YCKq_field",
			"home": "H9YCKq_home",
			"inherit": "H9YCKq_inherit",
			"layerTag": "H9YCKq_layerTag",
			"mcpBody": "H9YCKq_mcpBody",
			"mcpList": "H9YCKq_mcpList",
			"menu": "H9YCKq_menu",
			"name": "H9YCKq_name",
			"nameBtn": "H9YCKq_nameBtn",
			"nameText": "H9YCKq_nameText",
			"pillCount": "H9YCKq_pillCount",
			"problems": "H9YCKq_problems",
			"root": "H9YCKq_root",
			"row": "H9YCKq_row",
			"scope": "H9YCKq_scope",
			"search": "H9YCKq_search",
			"segment": "H9YCKq_segment",
			"skel": "H9YCKq_skel",
			"skeleton": "H9YCKq_skeleton",
			"skillhub-panel-enter": "H9YCKq_skillhub-panel-enter",
			"slash": "H9YCKq_slash",
			"switch": "H9YCKq_switch",
			"tabs": "H9YCKq_tabs",
			"thumb": "H9YCKq_thumb",
			"toolbar": "H9YCKq_toolbar",
			"toolbarEnd": "H9YCKq_toolbarEnd",
			"trigger": "H9YCKq_trigger",
			"triggerLabel": "H9YCKq_triggerLabel",
			"variant": "H9YCKq_variant",
			"variantCommand": "H9YCKq_variantCommand",
			"variantList": "H9YCKq_variantList",
			"variantSource": "H9YCKq_variantSource",
			"warn": "H9YCKq_warn"
		};
		//#endregion
		//#region src/client/McpPanel.tsx
		/** The folder's own name, which is what tells one workspace from another here. */
		function folderName(folder) {
			return folder.split(/[\\/]/).filter((part) => part !== "").pop() ?? folder;
		}
		function McpPanel(props) {
			const { t, layer, sessionId, folder, layerReady } = props;
			const [catalog, setCatalog] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [busy, setBusy] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [pendingTrust, setPendingTrust] = (0, react.useState)();
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const pending = (0, react.useRef)(false);
			const generation = (0, react.useRef)(0);
			const inFlight = (0, react.useRef)(0);
			const tRef = (0, react.useRef)(t);
			tRef.current = t;
			const onCountRef = (0, react.useRef)(props.onServerCountChange);
			onCountRef.current = props.onServerCountChange;
			const query = {
				layer,
				...sessionId ? { sessionId } : {},
				...folder ? { folder } : {}
			};
			const key = JSON.stringify(query);
			const activeKey = (0, react.useRef)(key);
			activeKey.current = key;
			const request = (0, react.useCallback)(async (path, body, signal) => {
				const response = await fetch(`/skillhub/mcp/${path}`, body === void 0 ? { ...signal ? { signal } : {} } : {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body)
				});
				if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(tRef.current("mcp.unavailable"));
				const data = await response.json();
				if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
				if (!Array.isArray(data.servers)) throw new Error(tRef.current("mcp.unavailable"));
				return data;
			}, []);
			const load = (0, react.useCallback)(() => {
				const current = ++generation.current;
				const controller = new AbortController();
				inFlight.current += 1;
				setRefreshing(true);
				const done = () => {
					inFlight.current -= 1;
					if (inFlight.current === 0) setRefreshing(false);
				};
				request(`catalog?${new URLSearchParams(JSON.parse(key))}`, void 0, controller.signal).then((data) => {
					if (key === activeKey.current && current === generation.current) {
						setCatalog(data);
						onCountRef.current?.(data.servers.length);
						setError(void 0);
					}
				}).catch((caught) => {
					if (!controller.signal.aborted && key === activeKey.current && current === generation.current) setError(caught.message);
				}).finally(done);
				return () => controller.abort();
			}, [key, request]);
			(0, react.useEffect)(() => {
				setError(void 0);
				return load();
			}, [load]);
			useCatalogRefresh(load);
			const apply = (latest) => {
				if (latest && key === activeKey.current) {
					setCatalog(latest);
					onCountRef.current?.(latest.servers.length);
				}
			};
			const update = async (servers, on) => {
				if (pending.current || !layerReady) return;
				pending.current = true;
				++generation.current;
				setBusy(true);
				setError(void 0);
				try {
					let latest;
					for (const server of servers) latest = await request("toggle", {
						...query,
						server,
						on
					});
					apply(latest);
				} catch (caught) {
					if (key === activeKey.current) setError(String(caught));
				} finally {
					pending.current = false;
					setBusy(false);
					notifyCatalogChanged(layer);
				}
			};
			const runLifecycle = async (path, server, source) => {
				if (pending.current) return;
				pending.current = true;
				++generation.current;
				setBusy(true);
				setError(void 0);
				try {
					apply(await request(path, {
						...query,
						server,
						...source !== void 0 ? { source } : {}
					}));
					notifyCatalogChanged(layer);
				} catch (caught) {
					if (key === activeKey.current) setError(String(caught));
				} finally {
					pending.current = false;
					setBusy(false);
				}
			};
			const askTrust = (server) => {
				const variants = (server.variants ?? []).filter((variant) => variant.startable);
				setAcknowledged(false);
				setPendingTrust({
					server: server.name,
					...variants[0] !== void 0 ? { source: variants[0].source } : {},
					commands: (server.variants ?? []).map((variant) => `${variant.source}: ${variant.command}`)
				});
			};
			/**
			* A declared row's primary action: an already approved variant starts at once,
			* a new one asks for trust before anything runs.
			*/
			const primaryAction = (server) => {
				const trusted = (server.variants ?? []).filter((variant) => variant.startable).find((variant) => variant.approved);
				if (trusted !== void 0) runLifecycle("start", server.name, trusted.source);
				else askTrust(server);
			};
			const bulkActions = (0, react.useMemo)(() => {
				if (!catalog?.servers.length) return void 0;
				const live = catalog.servers.filter((server) => !server.startRequired);
				if (live.length === 0) return void 0;
				const names = live.filter((server) => server.supported || server.gate === "off").map((server) => server.name);
				return {
					allOn: () => void update(live.map((server) => server.name), true),
					allOff: () => void update(names, false),
					disabled: !layerReady || busy
				};
			}, [
				catalog,
				key,
				layerReady,
				busy
			]);
			(0, react.useEffect)(() => {
				props.onBulkActions?.(bulkActions);
				return () => props.onBulkActions?.(void 0);
			}, [bulkActions]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.mcpBody,
				"data-ud-check": "skillhub-mcp-body",
				"aria-busy": busy || refreshing,
				children: [
					error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.bannerRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: SkillHubPanel_module_css_default.error,
							role: "alert",
							children: error
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: () => load(),
							children: t("error.retry")
						})]
					}) : null,
					catalog !== void 0 && (catalog.declaredProblems?.length ?? 0) > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: SkillHubPanel_module_css_default.warn,
						role: "status",
						children: [
							t("mcp.declaredProblems"),
							" ",
							(catalog.declaredProblems ?? []).join(" · ")
						]
					}) : null,
					catalog !== void 0 && folder !== void 0 && folder !== "" && catalog.servers.some((server) => server.declared) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillHubPanel_module_css_default.scope,
						title: folder,
						children: t("mcp.scope", { name: folderName(folder) })
					}) : null,
					catalog === void 0 && error === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.skeleton,
						"aria-label": t("loading"),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel })
						]
					}) : null,
					catalog !== void 0 && catalog.servers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.emptyCard,
						"data-ud-check": "skillhub-mcp-empty",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SkillHubPanel_module_css_default.emptyIcon,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutlineRegular, { size: 28 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: SkillHubPanel_module_css_default.emptyTitle,
								children: t("mcp.empty.title")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: SkillHubPanel_module_css_default.emptyDesc,
								children: t("mcp.empty.desc")
							})
						]
					}) : null,
					catalog !== void 0 && catalog.servers.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillHubPanel_module_css_default.mcpList,
						children: catalog.servers.map((server) => {
							const variants = server.variants ?? [];
							const startable = variants.some((variant) => variant.startable);
							const trusted = variants.some((variant) => variant.startable && variant.approved);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SkillHubPanel_module_css_default.row,
								"data-leaf": "",
								"data-declared": server.declared && !server.running ? "" : void 0,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillHubPanel_module_css_default.chevronGhost }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: SkillHubPanel_module_css_default.cell,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: SkillHubPanel_module_css_default.name,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: SkillHubPanel_module_css_default.nameText,
														children: server.name
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "quiet",
														children: t("mcp.tools", { n: server.tools })
													}),
													server.declared && !server.running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "quiet",
														children: t("mcp.declared")
													}) : null,
													server.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "warning",
														children: t("mcp.failed")
													}) : null,
													server.declared && variants.some((variant) => variant.approved) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "quiet",
														children: t("mcp.approved")
													}) : null,
													server.managed && server.running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "quiet",
														children: t("mcp.managed")
													}) : null,
													server.declared && !startable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "warning",
														children: t("mcp.notStartable")
													}) : null,
													!server.supported ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "warning",
														children: t("mcp.unsupported")
													}) : null
												]
											}),
											variants.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: SkillHubPanel_module_css_default.variantList,
												children: variants.map((variant) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: SkillHubPanel_module_css_default.variant,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: SkillHubPanel_module_css_default.variantSource,
														children: variant.source
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
														className: SkillHubPanel_module_css_default.variantCommand,
														title: variant.command,
														children: variant.command
													})]
												}, `${variant.source}:${variant.command}`))
											}) : null,
											(server.problems?.length ?? 0) > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
												className: SkillHubPanel_module_css_default.problems,
												children: (server.problems ?? []).map((problem) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: problem }, problem))
											}) : null
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: SkillHubPanel_module_css_default.actions,
										children: [server.declared ? server.running && server.managed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											disabled: busy,
											onClick: () => void runLifecycle("stop", server.name),
											children: t("mcp.stop")
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											disabled: busy || !layerReady || !startable,
											onClick: () => primaryAction(server),
											children: trusted ? t("mcp.start") : t("mcp.trust")
										}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GateSwitch, {
											gate: server.gate,
											label: t(server.startRequired ? "switch.mcpPending" : "switch.mcp", {
												name: server.name,
												state: gateWord(t, server.gate)
											}),
											disabled: !layerReady || busy || server.startRequired === true || !server.supported && server.gate === "on",
											onChange: (on) => void update([server.name], on)
										})]
									})
								]
							}, server.name);
						})
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
						open: pendingTrust !== void 0,
						title: t("mcp.trust.title", { name: pendingTrust?.server ?? "" }),
						description: t("mcp.trust.desc", { command: (pendingTrust?.commands ?? []).join("  |  ") }),
						acknowledgeLabel: t("mcp.trust.ack"),
						cancelLabel: t("cancel"),
						closeLabel: t("close"),
						confirmLabel: t("mcp.trust.confirm"),
						acknowledged,
						disabled: busy,
						onAcknowledgedChange: setAcknowledged,
						onCancel: () => setPendingTrust(void 0),
						onConfirm: () => {
							const request = pendingTrust;
							setPendingTrust(void 0);
							if (request !== void 0) runLifecycle("start", request.server, request.source);
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/catalog-api.ts
		const BASE = "/skillhub";
		async function readJson(response) {
			const text = await response.text();
			const trimmed = text.trimStart().toLowerCase();
			if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) throw new Error("The SkillHub host API is not on this Web session yet. Retry after DSH reloads the SkillHub server plugin.");
			if (!response.ok) {
				try {
					const parsed = JSON.parse(text);
					if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
						const error = parsed.error;
						if (typeof error === "string" && error !== "") throw new Error(error);
					}
				} catch (caught) {
					if (caught instanceof Error && caught.message !== text) throw caught;
				}
				throw new Error(text === "" ? `HTTP ${String(response.status)}` : text);
			}
			return JSON.parse(text);
		}
		async function fetchCatalog(sessionId, folder, layer) {
			const query = new URLSearchParams();
			if (sessionId !== void 0 && sessionId !== "") query.set("sessionId", sessionId);
			if (folder !== void 0 && folder !== "") query.set("folder", folder);
			if (layer !== void 0) query.set("layer", layer);
			return await readJson(await fetch(`${BASE}/catalog?${query.toString()}`));
		}
		async function postCatalog(path, body) {
			const payload = await readJson(await fetch(`${BASE}${path}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			}));
			if (typeof payload === "object" && payload !== null && "offered" in payload) return payload;
			if (typeof payload === "object" && payload !== null && "catalog" in payload && typeof payload.catalog === "object" && payload.catalog !== null) return payload.catalog;
			throw new Error("SkillHub returned an unexpected response");
		}
		//#endregion
		//#region src/client/slash-refresh.ts
		const SKILL_CLIENT = "@deepseek-ai/dsh-client-ui-skill";
		const REFRESH_EVENT = "dsh-skillhub:refresh-autocomplete";
		function createSlashRefresh(loader) {
			let disposed = false;
			let dirty = false;
			let running;
			const refresh = () => {
				if (disposed) return Promise.reject(/* @__PURE__ */ new Error("SkillHub autocomplete refresher is disposed"));
				dirty = true;
				if (running) return running;
				running = Promise.resolve().then(async () => {
					while (dirty && !disposed) {
						dirty = false;
						const targets = [...loader.entries()].filter((entry) => entry.options.name === SKILL_CLIENT);
						if (targets.length !== 1 || targets[0].disabled || !targets[0].fiber) throw new Error("The official skill autocomplete plugin is not active");
						const entry = targets[0];
						const fiber = entry.fiber;
						await fiber.await();
						if (disposed) return;
						if (![...loader.entries()].includes(entry) || entry.fiber !== fiber || entry.disabled) {
							dirty = true;
							continue;
						}
						if (fiber.state !== 2) throw new Error("The official skill autocomplete plugin is not active");
						await fiber.restart();
					}
				}).finally(() => {
					running = void 0;
				});
				return running;
			};
			return {
				refresh,
				dispose: () => {
					disposed = true;
					dirty = false;
				}
			};
		}
		/** Notify other windows and wait for this window's lifecycle refresh to finish. */
		async function refreshSkillAutocomplete() {
			const pending = [];
			window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: { waitUntil: (promise) => {
				pending.push(promise);
			} } }));
			if (typeof BroadcastChannel !== "undefined") {
				const channel = new BroadcastChannel(REFRESH_EVENT);
				channel.postMessage("refresh");
				channel.close();
			}
			if (pending.length !== 1) throw new Error("SkillHub autocomplete refresher is unavailable");
			await Promise.all(pending);
		}
		/** All listeners belong to SkillHub's client fiber and leave on HMR/disposal. */
		function connectSlashRefresh(loader, report) {
			const refresher = createSlashRefresh(loader);
			const changed = (event) => {
				event.detail.waitUntil(refresher.refresh());
			};
			const channel = typeof BroadcastChannel === "undefined" ? void 0 : new BroadcastChannel(REFRESH_EVENT);
			if (channel) channel.onmessage = () => {
				refresher.refresh().catch(report);
			};
			window.addEventListener(REFRESH_EVENT, changed);
			refresher.refresh().catch(report);
			return () => {
				window.removeEventListener(REFRESH_EVENT, changed);
				channel?.close();
				refresher.dispose();
			};
		}
		//#endregion
		//#region src/client/SkillHubPanel.tsx
		function layerLabel(t, layer) {
			return t(layer === "session" ? "layer.session" : layer === "project" ? "layer.project" : "layer.global");
		}
		function gateWord(t, gate) {
			return t(gate === "on" ? "gate.on" : gate === "off" ? "gate.off" : "gate.mixed");
		}
		const CHANGED_EVENT = "dsh-skillhub:changed";
		function notifyCatalogChanged(layer) {
			if (typeof window === "undefined") return;
			window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: layer }));
			if (typeof BroadcastChannel !== "undefined") {
				const channel = new BroadcastChannel(CHANGED_EVENT);
				channel.postMessage(layer);
				channel.close();
			}
		}
		/** Keep mounted panels current, including other tabs and focused windows. */
		function useCatalogRefresh(reload) {
			const latest = (0, react.useRef)(reload);
			latest.current = reload;
			(0, react.useEffect)(() => {
				let cleanup;
				const changed = () => {
					cleanup?.();
					const next = latest.current();
					cleanup = typeof next === "function" ? next : void 0;
				};
				const visible = () => {
					if (document.visibilityState === "visible") changed();
				};
				const channel = typeof BroadcastChannel === "undefined" ? void 0 : new BroadcastChannel(CHANGED_EVENT);
				if (channel) channel.onmessage = changed;
				window.addEventListener(CHANGED_EVENT, changed);
				window.addEventListener("focus", visible);
				document.addEventListener("visibilitychange", visible);
				return () => {
					channel?.close();
					window.removeEventListener(CHANGED_EVENT, changed);
					window.removeEventListener("focus", visible);
					document.removeEventListener("visibilitychange", visible);
					cleanup?.();
				};
			}, []);
		}
		function brokenCopy(t, reason) {
			if (reason.kind === "missing-symlink-target") return reason.target === void 0 ? t("broken.missing") : t("broken.missingNamed", { target: reason.target });
			if (reason.kind === "empty-pack") return t("broken.empty");
			if (reason.kind === "invalid-name") return t("broken.name");
			if (reason.kind === "unreadable-skill") return t("broken.unreadable");
			if (reason.kind === "invalid-frontmatter") return t("broken.frontmatter");
			if (reason.kind === "symlink-cycle") return t("broken.cycle");
			return reason.kind;
		}
		function homeLabel(t, home) {
			if (home.home === "project") return home.label ?? t("home.project");
			return t(home.home === "agent" ? "home.agent" : "home.dsh");
		}
		/** `.opencode` and `.claude` Skills reach the model only through SkillHub. */
		function isSkillHubOnly(home) {
			return home.home === "project" && home.source !== void 0 && home.source !== "project-agents";
		}
		function collectSkills(nodes) {
			return nodes.flatMap((node) => {
				if (node.kind === "broken") return [];
				if (node.kind === "root-skill") return [node];
				return [...node.skill ? [node.skill] : [], ...collectSkills(node.children)];
			});
		}
		function collectSkillIds(nodes) {
			return collectSkills(nodes).map((skill) => skill.id);
		}
		function countSkills(nodes) {
			const skills = collectSkills(nodes);
			const on = skills.filter((skill) => skill.gate === "on").length;
			return {
				on,
				off: skills.length - on
			};
		}
		function gateFromCounts(counts) {
			return counts.on > 0 && counts.off > 0 ? "mixed" : counts.on > 0 ? "on" : "off";
		}
		function skillCountLabel(t, total) {
			return t(total === 1 ? "count.skillsOne" : "count.skills", { n: total });
		}
		function folderChildren(node) {
			if (node.kind === "broken" || node.kind === "root-skill") return [];
			return node.children.filter((child) => child.kind === "broken" || collectSkillIds([child]).length > 0);
		}
		function soleSkill(node) {
			if (node.kind === "broken") return null;
			if (node.kind === "root-skill") return node;
			return node.skill !== null && folderChildren(node).length === 0 ? node.skill : null;
		}
		function packPrefix(name) {
			const split = name.indexOf("-");
			return split < 2 ? void 0 : name.slice(0, split);
		}
		function clusterFlatPacks(nodes) {
			const existing = new Set(nodes.map((node) => node.name));
			const counts = /* @__PURE__ */ new Map();
			for (const node of nodes) {
				if (node.kind !== "pack" && node.kind !== "broken") continue;
				const prefix = packPrefix(node.name);
				if (prefix !== void 0 && !existing.has(prefix)) counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
			}
			const buckets = /* @__PURE__ */ new Map();
			const out = [];
			for (const node of nodes) {
				const prefix = packPrefix(node.name);
				if (node.kind !== "pack" && node.kind !== "broken" || prefix === void 0 || (counts.get(prefix) ?? 0) < 3) {
					out.push(node);
					continue;
				}
				const list = buckets.get(prefix);
				if (list) list.push(node);
				else {
					buckets.set(prefix, [node]);
					out.push({
						kind: "cluster",
						prefix
					});
				}
			}
			const result = [];
			for (const node of out) {
				if (node.kind !== "cluster") {
					result.push(node);
					continue;
				}
				const members = buckets.get(node.prefix);
				const first = members?.[0];
				if (!members || !first) continue;
				const children = members.map((member) => {
					const name = member.name.slice(node.prefix.length + 1);
					if (member.kind === "broken") return {
						...member,
						name
					};
					return {
						kind: "group",
						name,
						rel: member.name,
						home: member.home,
						path: member.path,
						gate: member.gate,
						skill: member.skill,
						children: member.children
					};
				});
				result.push({
					kind: "pack",
					id: `${first.home}:${node.prefix}`,
					name: node.prefix,
					home: first.home,
					path: first.path,
					link: { kind: "directory" },
					gate: gateFromCounts(countSkills(members)),
					skill: null,
					children
				});
			}
			return result;
		}
		function nodeMatches(node, needle) {
			return (node.kind === "broken" ? `${node.name} ${node.reason.kind}` : node.kind === "root-skill" ? `${node.name} ${node.description ?? ""}` : `${node.name} ${node.skill?.name ?? ""} ${node.skill?.description ?? ""}`).toLowerCase().includes(needle) || node.kind !== "broken" && node.kind !== "root-skill" && node.children.some((child) => nodeMatches(child, needle));
		}
		function GateSwitch(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: SkillHubPanel_module_css_default.switch,
				role: "switch",
				"aria-checked": props.gate === "mixed" ? "mixed" : props.gate === "on",
				"aria-label": props.label,
				"data-state": props.gate,
				disabled: props.disabled,
				onClick: () => props.onChange(props.gate !== "on"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillHubPanel_module_css_default.thumb })
			});
		}
		function SkillLeaf(props) {
			const { skill, t } = props;
			const [copied, setCopied] = (0, react.useState)(false);
			const copySlash = () => {
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(`/${skill.name} `).then((ok) => {
					if (ok) {
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1500);
					}
				});
			};
			const name = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SkillHubPanel_module_css_default.nameText,
				children: props.label
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.row,
				"data-leaf": "",
				style: { "--depth": String(props.depth) },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillHubPanel_module_css_default.chevronGhost }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillHubPanel_module_css_default.cell,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SkillHubPanel_module_css_default.name,
							children: [skill.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: skill.description,
								side: "top",
								maxWidth: 320,
								children: name
							}) : name, skill.collision ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "warning",
								children: t("badge.collision")
							}) : null]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: copied ? t("copy.done") : t("copy.slash", { name: skill.name }),
							side: "top",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: SkillHubPanel_module_css_default.slash,
								"aria-label": t("copy.slash", { name: skill.name }),
								"data-copied": copied ? "" : void 0,
								onClick: copySlash,
								children: ["/", skill.name]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GateSwitch, {
							gate: skill.gate,
							label: t("switch.skill", {
								name: props.label,
								state: gateWord(t, skill.gate)
							}),
							disabled: props.disabled,
							onChange: (on) => props.onToggle([skill.id], on)
						})]
					})
				]
			});
		}
		function SkillHubPanel(props) {
			const { sessionId, t } = props;
			const folder = props.folder ?? "";
			const [layer, setLayer] = (0, react.useState)(props.defaultLayer);
			const [catalog, setCatalog] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const [query, setQuery] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [expanded, setExpanded] = (0, react.useState)({});
			const [notice, setNotice] = (0, react.useState)();
			const [tab, setTab] = (0, react.useState)("skills");
			const [mcpServerCount, setMcpServerCount] = (0, react.useState)();
			const [mcpBulk, setMcpBulk] = (0, react.useState)();
			const [moreOpen, setMoreOpen] = (0, react.useState)(false);
			const pending = (0, react.useRef)(false);
			const generation = (0, react.useRef)(0);
			const inFlight = (0, react.useRef)(0);
			const noticeSeq = (0, react.useRef)(0);
			const key = JSON.stringify([
				layer,
				folder,
				sessionId
			]);
			const activeKey = (0, react.useRef)(key);
			activeKey.current = key;
			const canWriteSession = !!sessionId;
			const canWriteProject = folder !== "";
			const layerReady = layer === "global" || layer === "session" && canWriteSession || layer === "project" && canWriteProject;
			const load = (0, react.useCallback)(async () => {
				const current = ++generation.current;
				inFlight.current += 1;
				setRefreshing(true);
				try {
					const next = await fetchCatalog(sessionId, folder === "" ? void 0 : folder, layer);
					if (key === activeKey.current && current === generation.current) {
						setCatalog(next);
						setError(void 0);
					}
				} catch (caught) {
					if (key === activeKey.current && current === generation.current) setError(String(caught));
				} finally {
					inFlight.current -= 1;
					if (inFlight.current === 0) setRefreshing(false);
				}
			}, [
				key,
				sessionId,
				folder,
				layer
			]);
			(0, react.useEffect)(() => {
				setError(void 0);
				load();
			}, [load]);
			useCatalogRefresh(load);
			const mutate = async (target, on) => {
				if (pending.current || !layerReady) return;
				pending.current = true;
				++generation.current;
				setBusy(true);
				setError(void 0);
				try {
					const next = await postCatalog("/toggle", {
						layer,
						...target,
						...sessionId ? { sessionId } : {},
						...folder ? { folder } : {}
					});
					if (key === activeKey.current) setCatalog(next);
					notifyCatalogChanged(layer);
					let refreshed = true;
					try {
						await refreshSkillAutocomplete();
					} catch (caught) {
						refreshed = false;
						console.warn("[skillhub] Saved skills but autocomplete refresh failed:", caught);
					}
					if (key === activeKey.current) {
						noticeSeq.current += 1;
						setNotice({
							key: refreshed ? on ? "refresh.hintOn" : "refresh.hintOff" : "refresh.partial",
							seq: noticeSeq.current
						});
					}
				} catch (caught) {
					if (key === activeKey.current) setError(String(caught));
				} finally {
					pending.current = false;
					setBusy(false);
				}
			};
			const toggleIds = (ids, on) => {
				if (ids.length) mutate({
					kind: "ids",
					ids,
					on
				}, on);
			};
			const needle = query.trim().toLowerCase();
			const counts = (0, react.useMemo)(() => catalog ? countSkills(catalog.tree.flatMap((home) => home.children)) : {
				on: 0,
				off: 0
			}, [catalog]);
			const allSkillCount = counts.on + counts.off;
			const moreDisabled = tab === "mcp" ? mcpBulk === void 0 || mcpBulk.disabled : !(layerReady && !busy && catalog !== void 0 && allSkillCount > 0);
			const moreItems = [
				{
					id: "allOn",
					label: t("allOn"),
					disabled: moreDisabled
				},
				{
					id: "allOff",
					label: t("allOff"),
					disabled: moreDisabled
				},
				...tab === "skills" ? [{
					id: "refreshSlash",
					label: t("refresh.slash"),
					disabled: busy
				}] : []
			];
			const refreshSlash = async () => {
				if (pending.current) return;
				pending.current = true;
				setBusy(true);
				let refreshed = true;
				try {
					await refreshSkillAutocomplete();
				} catch (caught) {
					refreshed = false;
					console.warn("[skillhub] Autocomplete refresh failed:", caught);
				} finally {
					pending.current = false;
					setBusy(false);
				}
				if (key === activeKey.current) {
					noticeSeq.current += 1;
					setNotice({
						key: refreshed ? "refresh.done" : "refresh.failed",
						seq: noticeSeq.current
					});
				}
			};
			const onMoreSelect = (id) => {
				setMoreOpen(false);
				if (id === "refreshSlash") {
					refreshSlash();
					return;
				}
				if (id !== "allOn" && id !== "allOff") return;
				if (tab === "mcp") {
					if (id === "allOn") mcpBulk?.allOn();
					else mcpBulk?.allOff();
				} else mutate({
					kind: "all",
					on: id === "allOn"
				}, id === "allOn");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.root,
				"data-surface": props.surface,
				"data-skillhub-panel": "",
				"aria-busy": busy || refreshing,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SkillHubPanel_module_css_default.toolbar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("tab.aria"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
							role: "tab",
							"aria-selected": tab === "skills",
							active: tab === "skills",
							onClick: () => setTab("skills"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: 13 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("tab.skills") }),
								allSkillCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillHubPanel_module_css_default.pillCount,
									children: allSkillCount
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
							role: "tab",
							"aria-selected": tab === "mcp",
							active: tab === "mcp",
							onClick: () => setTab("mcp"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutlineRegular, { size: 13 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("tab.mcp") }),
								mcpServerCount !== void 0 && mcpServerCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillHubPanel_module_css_default.pillCount,
									children: mcpServerCount
								}) : null
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.toolbarEnd,
						children: [props.layers.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SkillHubPanel_module_css_default.segment,
							role: "radiogroup",
							"aria-label": t("layer.aria"),
							children: props.layers.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "radio",
								"aria-checked": layer === name,
								"data-active": layer === name ? "" : void 0,
								disabled: busy || name === "session" && !canWriteSession || name === "project" && !canWriteProject,
								onClick: () => setLayer(name),
								children: layerLabel(t, name)
							}, name))
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: moreOpen,
							onClose: () => setMoreOpen(false),
							onSelect: onMoreSelect,
							items: moreItems,
							align: "end",
							compact: true,
							portal: true,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, { size: 16 }),
								"aria-label": t("more"),
								title: t("more"),
								onClick: () => setMoreOpen((value) => !value)
							})
						})]
					})]
				}), tab === "mcp" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpPanel, {
					surface: props.surface,
					layer,
					sessionId,
					folder,
					canWriteSession,
					canWriteProject,
					layerReady,
					onServerCountChange: setMcpServerCount,
					onBulkActions: setMcpBulk,
					t
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						className: SkillHubPanel_module_css_default.search,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: SkillHubPanel_module_css_default.field ?? "",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 16 }),
							value: query,
							placeholder: t("search.placeholder"),
							"aria-label": t("search.placeholder"),
							onChange: (event) => setQuery(event.currentTarget.value)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.body,
						"data-ud-check": "skillhub-tree",
						"data-ud-role": "panel",
						children: [
							error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SkillHubPanel_module_css_default.bannerRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: SkillHubPanel_module_css_default.error,
									role: "alert",
									children: t("error.load", { error })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									size: "sm",
									onClick: () => void load(),
									children: t("error.retry")
								})]
							}) : null,
							catalog && catalog.collisions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: SkillHubPanel_module_css_default.warn,
								role: "status",
								children: [
									t("collision.warn"),
									" ",
									catalog.collisions.map((row) => row.name).join(", ")
								]
							}) : null,
							catalog === void 0 && error === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SkillHubPanel_module_css_default.skeleton,
								"aria-label": t("loading"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: SkillHubPanel_module_css_default.skel })
								]
							}) : null,
							catalog !== void 0 && allSkillCount === 0 && needle === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SkillHubPanel_module_css_default.emptyCard,
								"data-ud-check": "skillhub-skills-empty",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: SkillHubPanel_module_css_default.emptyIcon,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: 28 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
										className: SkillHubPanel_module_css_default.emptyTitle,
										children: t("skills.empty.title")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: SkillHubPanel_module_css_default.emptyDesc,
										children: t("skills.empty.desc")
									})
								]
							}) : null,
							catalog !== void 0 && (allSkillCount > 0 || needle !== "") ? catalog.tree.map((home) => {
								const children = clusterFlatPacks(home.children).filter((node) => needle === "" || nodeMatches(node, needle));
								const populated = catalog.tree.filter((row) => row.children.length > 0);
								const onlyHome = populated[0];
								const hideHomeChrome = props.surface === "popover" && populated.length <= 1 && (onlyHome === void 0 || onlyHome.home !== "project");
								const homeKey = `home:${home.home}:${home.path}`;
								const homeOpen = hideHomeChrome || needle !== "" || (expanded[homeKey] ?? true);
								const homeCounts = countSkills(home.children);
								const homeIds = collectSkillIds(home.children);
								const label = homeLabel(t, home);
								const skillHubOnly = isSkillHubOnly(home);
								const toggleOpen = () => setExpanded((current) => ({
									...current,
									[homeKey]: !(current[homeKey] ?? true)
								}));
								const tree = children.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: SkillHubPanel_module_css_default.empty,
									children: t(needle === "" ? "empty.home" : "empty.search")
								}) : children.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeNode, {
									node,
									depth: hideHomeChrome ? 0 : 1,
									needle,
									expanded,
									setExpanded,
									disabled: !layerReady || busy,
									t,
									onToggle: toggleIds
								}, node.kind === "root-skill" ? node.id : node.path));
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: SkillHubPanel_module_css_default.home,
									"aria-label": label,
									children: [!hideHomeChrome ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: SkillHubPanel_module_css_default.row,
										style: { "--depth": "0" },
										"data-folder": "",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: SkillHubPanel_module_css_default.chevron,
												"aria-expanded": homeOpen,
												"aria-label": t(homeOpen ? "collapse" : "expand", { name: label }),
												onClick: toggleOpen,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: SkillHubPanel_module_css_default.cell,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: SkillHubPanel_module_css_default.nameBtn,
													title: home.path,
													onClick: toggleOpen,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: SkillHubPanel_module_css_default.name,
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
																className: SkillHubPanel_module_css_default.nameText,
																children: label
															}),
															skillHubOnly ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
																tone: "quiet",
																children: t("badge.skillhubOnly")
															}) : null,
															homeIds.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
																tone: "quiet",
																children: skillCountLabel(t, homeIds.length)
															}) : null
														]
													})
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: SkillHubPanel_module_css_default.actions,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GateSwitch, {
													gate: gateFromCounts(homeCounts),
													label: t("switch.folder", {
														name: label,
														state: gateWord(t, gateFromCounts(homeCounts))
													}),
													disabled: !layerReady || busy || homeIds.length === 0,
													onChange: (on) => toggleIds(homeIds, on)
												})
											})
										]
									}) : null, homeOpen ? tree : null]
								}, homeKey);
							}) : null
						]
					}),
					notice ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: t(notice.key),
						onDone: () => setNotice((current) => current?.seq === notice.seq ? void 0 : current)
					}, notice.seq) : null
				] })]
			});
		}
		function TreeNode(props) {
			const { node, t } = props;
			const style = { "--depth": String(props.depth) };
			if (node.kind === "broken") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.row,
				"data-broken": "",
				style,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillHubPanel_module_css_default.chevronGhost }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SkillHubPanel_module_css_default.cell,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillHubPanel_module_css_default.name,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { size: 14 }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillHubPanel_module_css_default.nameText,
								children: node.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
								tone: "danger",
								children: brokenCopy(t, node.reason)
							})
						]
					})
				})]
			});
			const leaf = soleSkill(node);
			if (leaf) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillLeaf, {
				depth: props.depth,
				skill: leaf,
				label: node.name,
				disabled: props.disabled,
				t,
				onToggle: props.onToggle
			});
			if (node.kind === "root-skill") return null;
			const children = folderChildren(node);
			const ids = collectSkillIds([node]);
			const key = node.path;
			const open = props.needle !== "" || (props.expanded[key] ?? false);
			const toggleOpen = () => props.setExpanded((current) => ({
				...current,
				[key]: !(current[key] ?? false)
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.row,
				style,
				"data-folder": children.length ? "" : void 0,
				children: [
					children.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillHubPanel_module_css_default.chevron,
						"aria-expanded": open,
						"aria-label": t(open ? "collapse" : "expand", { name: node.name }),
						onClick: toggleOpen,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 })
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillHubPanel_module_css_default.chevronGhost }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillHubPanel_module_css_default.cell,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: SkillHubPanel_module_css_default.nameBtn,
							onClick: toggleOpen,
							disabled: !children.length,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SkillHubPanel_module_css_default.name,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillHubPanel_module_css_default.nameText,
									children: node.name
								}), ids.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: "quiet",
									children: skillCountLabel(t, ids.length)
								}) : null]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillHubPanel_module_css_default.actions,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GateSwitch, {
							gate: node.gate,
							label: t("switch.folder", {
								name: node.name,
								state: gateWord(t, node.gate)
							}),
							disabled: props.disabled || ids.length === 0,
							onChange: (on) => props.onToggle(ids, on)
						})
					})
				]
			}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [node.skill && children.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillLeaf, {
				depth: props.depth + 1,
				skill: node.skill,
				label: node.skill.name,
				disabled: props.disabled,
				t,
				onToggle: props.onToggle
			}) : null, children.filter((child) => props.needle === "" || nodeMatches(child, props.needle)).map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeNode, {
				...props,
				node: child,
				depth: props.depth + 1
			}, child.path))] }) : null] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** SkillHub copy. zh is the key-set source of truth. */
		const zh = {
			"nav": "skill&mcp",
			"chip": "技能",
			"chip.aria": "技能",
			"tab.skills": "技能",
			"tab.mcp": "MCP",
			"tab.aria": "分类切换",
			"more": "更多操作",
			"allOff": "全部关闭",
			"allOn": "全部开启",
			"count.skills": "{n} 个技能",
			"count.skillsOne": "{n} 个技能",
			"mcp.tools": "{n} 个工具",
			"layer.aria": "作用范围",
			"layer.session": "本对话",
			"layer.project": "本项目",
			"layer.global": "全局",
			"session.needsChat": "请先打开一个对话",
			"project.needsWorkspace": "请先打开一个工作区",
			"copy.slash": "复制 /{name}",
			"copy.done": "已复制",
			"refresh.hint": "已保存，后续请求使用新设置",
			"refresh.hintOn": "已开启，/ 补全已重新加载；下一次模型请求使用新设置",
			"refresh.hintOff": "已关闭，/ 补全已重新加载；本对话已载入的技能内容仍保留",
			"refresh.slash": "刷新 / 补全",
			"refresh.done": "/ 补全已重新加载，无需刷新窗口",
			"refresh.partial": "技能设置已保存，但 / 补全未能刷新。请在更多操作中重试“刷新 / 补全”",
			"refresh.failed": "/ 补全刷新失败，请稍后重试",
			"skills.empty.title": "暂无已安装技能",
			"skills.empty.desc": "将技能放入 ~/.agents/skills 即可在此启用。",
			"mcp.empty.title": "暂无 MCP 服务",
			"mcp.empty.desc": "在环境中配置并启动外部 MCP 后，可在此随时开关工具。",
			"search.placeholder": "搜索…",
			"error.load": "加载失败：{error}",
			"error.retry": "重试",
			"collision.warn": "存在同名技能：",
			"loading": "正在加载…",
			"home.agent": "Agent 目录",
			"home.dsh": "DSH 目录",
			"home.project": "本项目",
			"badge.skillhubOnly": "仅 SkillHub",
			"empty.home": "暂无技能",
			"empty.search": "无匹配结果",
			"expand": "展开 {name}",
			"collapse": "收起 {name}",
			"switch.folder": "文件夹 {name}，{state}",
			"switch.skill": "技能 {name}，{state}",
			"switch.mcp": "MCP 服务 {name}，{state}",
			"switch.mcpPending": "MCP 服务 {name} 尚未启动",
			"mcp.unsupported": "不支持动态隐藏",
			"mcp.unavailable": "服务暂未就绪，请稍后重试",
			"mcp.declared": "项目声明",
			"mcp.scope": "声明来源：{name}",
			"mcp.approved": "信任已记录",
			"mcp.failed": "启动失败",
			"mcp.managed": "SkillHub 已启动",
			"mcp.start": "启动",
			"mcp.trust": "信任并启动",
			"mcp.stop": "停止",
			"mcp.notStartable": "无法启动",
			"mcp.declaredProblems": "项目声明有问题：",
			"mcp.trust.title": "信任并启动 MCP 服务 {name}",
			"mcp.trust.desc": "SkillHub 将按项目文件里的声明启动这个服务，命令为：{command}。确认后会记住这条命令，之后进入本工程的会话会自动启动它。",
			"mcp.trust.ack": "我确认这条命令来自我信任的项目文件",
			"mcp.trust.confirm": "信任并启动",
			"cancel": "取消",
			"close": "关闭",
			"badge.collision": "重名",
			"broken.missing": "链接失效",
			"broken.missingNamed": "链接目标不存在：{target}",
			"broken.empty": "目录中未包含 SKILL.md",
			"broken.name": "技能名无效",
			"broken.unreadable": "无法读取文件",
			"broken.frontmatter": "配置格式错误",
			"broken.cycle": "链接回环",
			"gate.on": "开",
			"gate.off": "关",
			"gate.mixed": "部分"
		};
		const en = {
			"nav": "skill&mcp",
			"chip": "Skills",
			"chip.aria": "Skills",
			"tab.skills": "Skills",
			"tab.mcp": "MCP",
			"tab.aria": "Category switcher",
			"more": "More actions",
			"allOff": "All Off",
			"allOn": "All On",
			"count.skills": "{n} skills",
			"count.skillsOne": "{n} skill",
			"mcp.tools": "{n} tools",
			"layer.aria": "Scope",
			"layer.session": "This Chat",
			"layer.project": "This Project",
			"layer.global": "Global",
			"session.needsChat": "Open a chat first",
			"project.needsWorkspace": "Open a workspace first",
			"copy.slash": "Copy /{name}",
			"copy.done": "Copied",
			"refresh.hint": "Saved. Subsequent requests use the new settings",
			"refresh.hintOn": "Enabled. / autocomplete reloaded; the next model request uses the new settings",
			"refresh.hintOff": "Disabled. / autocomplete reloaded; skill content already loaded in this chat remains",
			"refresh.slash": "Refresh / autocomplete",
			"refresh.done": "/ autocomplete reloaded. No window refresh needed",
			"refresh.partial": "Skill settings saved, but / autocomplete could not refresh. Retry “Refresh / autocomplete” in More actions",
			"refresh.failed": "/ autocomplete could not refresh. Please retry",
			"skills.empty.title": "No Skills Installed",
			"skills.empty.desc": "Place skill directories in ~/.agents/skills to manage them here.",
			"mcp.empty.title": "No MCP Services",
			"mcp.empty.desc": "Connect MCP servers in your environment to manage tools here.",
			"search.placeholder": "Search…",
			"error.load": "Load failed: {error}",
			"error.retry": "Retry",
			"collision.warn": "Conflicting skill names:",
			"loading": "Loading…",
			"home.agent": "Agent Directory",
			"home.dsh": "DSH Directory",
			"home.project": "This project",
			"badge.skillhubOnly": "SkillHub only",
			"empty.home": "No skills",
			"empty.search": "No matches",
			"expand": "Expand {name}",
			"collapse": "Collapse {name}",
			"switch.folder": "Folder {name}, {state}",
			"switch.skill": "Skill {name}, {state}",
			"switch.mcp": "MCP service {name}, {state}",
			"switch.mcpPending": "MCP service {name} is not running yet",
			"mcp.unsupported": "Dynamic hide unsupported",
			"mcp.unavailable": "Service unavailable, please retry",
			"mcp.declared": "Declared",
			"mcp.scope": "Declared for {name}",
			"mcp.approved": "Approved",
			"mcp.failed": "Start failed",
			"mcp.managed": "Started by SkillHub",
			"mcp.start": "Start",
			"mcp.trust": "Trust and start",
			"mcp.stop": "Stop",
			"mcp.notStartable": "Not startable",
			"mcp.declaredProblems": "Declaration problems:",
			"mcp.trust.title": "Trust and start MCP service {name}",
			"mcp.trust.desc": "SkillHub will start this service exactly as the project file declares it: {command}. Confirming remembers this command and starts it automatically the next time a session opens in this project.",
			"mcp.trust.ack": "I trust this command as it comes from the project files",
			"mcp.trust.confirm": "Trust and start",
			"cancel": "Cancel",
			"close": "Close",
			"badge.collision": "conflict",
			"broken.missing": "Broken link",
			"broken.missingNamed": "Missing target: {target}",
			"broken.empty": "Missing SKILL.md",
			"broken.name": "Invalid name",
			"broken.unreadable": "Unreadable file",
			"broken.frontmatter": "Invalid config",
			"broken.cycle": "Symlink cycle",
			"gate.on": "on",
			"gate.off": "off",
			"gate.mixed": "mixed"
		};
		//#endregion
		//#region src/client/index.tsx
		const name = "dsh-skillhub-client";
		const inject = [
			"slots",
			"locale",
			"loader"
		];
		const NS = "skillhub";
		const PANEL_GAP = 8;
		const PANEL_MARGIN = 12;
		const UNPLACED = {
			visibility: "hidden",
			left: 0,
			top: 0
		};
		function apply(ctx) {
			ctx.effect(() => connectSlashRefresh(ctx.get("loader"), (error) => {
				ctx.logger.warn(`SkillHub autocomplete refresh failed: ${String(error)}`);
			}), "dsh-skillhub: autocomplete refresh");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-skillhub: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dsh-skillhub",
				order: 80,
				label: () => t("nav"),
				locale: NS
			}, SkillHubSettings));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "dsh-skillhub",
				order: 40,
				label: () => t("chip"),
				locale: NS
			}, SkillHubChip));
		}
		function SkillHubSettings(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillHubPanel, {
				defaultLayer: "global",
				layers: ["global"],
				surface: "page",
				t: props.t
			});
		}
		function SkillHubChip(props) {
			const sessionId = props.sessionId;
			const folder = props.useSessions((list) => list.byId?.[sessionId]?.cwd ?? "");
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const panelPosition = (0, _deepseek_ai_dsh_client_ui_primitives.useAnchoredPosition)({
				open,
				anchorRef: triggerRef,
				panelRef,
				gap: PANEL_GAP,
				margin: PANEL_MARGIN
			});
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (!(event.target instanceof Node)) return;
					if (rootRef.current?.contains(event.target) === true) return;
					if (panelRef.current?.contains(event.target) === true) return;
					if (event.target instanceof Element) {
						if (event.target.closest("[role=\"menu\"], [role=\"dialog\"], [role=\"listbox\"]") !== null) return;
					}
					setOpen(false);
				};
				const closeOnEscape = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					setOpen(false);
					triggerRef.current?.focus();
				};
				document.addEventListener("pointerdown", closeOutside);
				document.addEventListener("keydown", closeOnEscape);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
					document.removeEventListener("keydown", closeOnEscape);
				};
			}, [open]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillHubPanel_module_css_default.chipWrap,
				ref: rootRef,
				"data-skillhub-chip": "",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: SkillHubPanel_module_css_default.trigger,
					"data-open": open ? "" : void 0,
					"aria-expanded": open,
					"aria-label": props.t("chip.aria"),
					title: props.t("chip.aria"),
					onClick: () => setOpen((value) => !value),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutlineRegular, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillHubPanel_module_css_default.triggerLabel,
						children: props.t("chip")
					})]
				}), open ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: panelRef,
					className: SkillHubPanel_module_css_default.menu,
					style: panelPosition ?? UNPLACED,
					role: "dialog",
					"aria-modal": "false",
					"aria-label": props.t("chip.aria"),
					"data-ud-check": "skillhub-chip-panel",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillHubPanel, {
						sessionId,
						defaultLayer: "session",
						layers: ["session", "project"],
						surface: "popover",
						t: props.t,
						...folder !== "" ? { folder } : {}
					})
				}), document.body) : null]
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
