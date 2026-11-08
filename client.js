window.__ModuleLoader__.load({
  id: 'dsh-wallpaper',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo } = React;

    /** Set once by apply; the picker reads the theme service when a wallpaper is on. */
    let runtime = null;

    const NS = 'dsh-wallpaper';
    const DB_NAME = 'dsh-wallpaper';
    const STORE = 'state';
    const KEY = 'current';
    const DEFAULT_OPACITY = 0.7;
    const MAX_BYTES = 25 * 1024 * 1024;

    /**
     * Panel tint while a wallpaper is on. `--dsw-alias-bg-base` paints the frame
     * columns, the conversation root, the right bar and the bottom row, so an
     * alpha value here is the one lever that lets the wallpaper show through the
     * app surfaces without naming any hashed class.
     */
    const PANEL_TOKENS = {
      '--dsw-alias-bg-base': {
        light: 'rgba(255, 255, 255, 0.5)',
        dark: 'rgba(21, 21, 23, 0.5)',
      },
    };

    /**
     * Off macOS the app frame (`AppFrame.module.css`) paints the frame, the
     * sidebar column and the windows-titlebar strip with
     * `--dsw-specific-sidebar-fill`, which is opaque there — the darwin layout
     * mixes that same token down to 40/50% and leaves the frame transparent, so
     * only macOS can show anything behind the frame. Two of those layers stack
     * (frame + column), so 30% each lands near the darwin result.
     */
    const FRAME_TOKENS = {
      '--dsw-specific-sidebar-fill': {
        light: 'color-mix(in srgb, var(--dsw-static-neutral-bluish-50) 30%, transparent)',
        dark: 'color-mix(in srgb, var(--dsw-static-neutral-bluish-900) 30%, transparent)',
      },
    };

    const ZH = {
      label: '背景壁纸',
      title: '背景壁纸',
      choose: '选择图片',
      replace: '更换图片',
      remove: '移除',
      opacity: '不透明度',
      empty: '点击选择一张图片',
      hint: '图片只保存在本机，不会上传。',
      close: '关闭',
      notImage: '请选择图片文件',
      tooBig: '图片太大，请选择 25 MB 以内的图片',
    };
    const EN = {
      label: 'Wallpaper',
      title: 'Wallpaper',
      choose: 'Choose image',
      replace: 'Replace image',
      remove: 'Remove',
      opacity: 'Opacity',
      empty: 'Pick an image',
      hint: 'The image stays on this machine.',
      close: 'Close',
      notImage: 'Choose an image file',
      tooBig: 'Image is too large; pick one under 25 MB',
    };

    const CSS = [
      '.dshwp-btn{position:fixed;top:11px;left:88px;z-index:30;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:8px;cursor:pointer;color:#fff;background:linear-gradient(140deg,var(--dsw-static-violet-400,#a78bfa),var(--dsw-static-violet-600,#7c3aed));box-shadow:0 1px 2px rgba(15,10,30,.35),inset 0 0 0 .5px rgba(255,255,255,.22);-webkit-app-region:no-drag;transition:filter .12s ease,transform .12s ease}',
      '.dshwp-btn:hover{filter:brightness(1.12)}',
      '.dshwp-btn:active{transform:scale(.94)}',
      '.dshwp-btn:focus-visible{outline:2px solid var(--dsw-static-violet-400,#a78bfa);outline-offset:2px}',
      '.dshwp-btn[data-on=true]{box-shadow:0 0 0 2px rgba(167,139,250,.42),0 1px 2px rgba(15,10,30,.35),inset 0 0 0 .5px rgba(255,255,255,.22)}',
      /* The sidebar owns the space the button sits in: collapsed means no brand row. */
      '[data-sidebar-collapsed] .dshwp-btn,[data-sidebar-collapsed] .dshwp-panel{display:none}',
      /* Off macOS there is no safe fallback spot before the brand row is measured. */
      'html:not([data-platform=darwin]) .dshwp-btn[data-ready=false],html:not([data-platform=darwin]) .dshwp-panel[data-ready=false]{display:none}',
      '.dshwp-panel{position:fixed;top:47px;left:88px;z-index:31;box-sizing:border-box;width:296px;max-width:calc(100vw - 24px);padding:14px;border:.5px solid var(--dsw-alias-border-l3);border-radius:14px;background:var(--dsw-specific-menu);-webkit-backdrop-filter:blur(24px) saturate(1.6);backdrop-filter:blur(24px) saturate(1.6);box-shadow:0 12px 32px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;-webkit-app-region:no-drag}',
      '.dshwp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}',
      '.dshwp-title{margin:0;font-size:14px;font-weight:600;line-height:22px}',
      '.dshwp-x{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '.dshwp-x:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dshwp-preview{position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;aspect-ratio:16/9;border:.5px dashed var(--dsw-alias-border-l3);border-radius:10px;background-color:var(--dsw-alias-bg-layer-1);background-position:center;background-size:cover;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:12px;user-select:none}',
      '.dshwp-preview[data-filled=true]{border-style:solid;color:transparent}',
      '.dshwp-preview[data-drop=true]{border-color:var(--dsw-static-violet-400,#a78bfa);box-shadow:inset 0 0 0 2px rgba(167,139,250,.35)}',
      '.dshwp-actions{display:flex;gap:8px;margin-top:12px}',
      '.dshwp-primary,.dshwp-ghost{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border-radius:8px;font:inherit;font-size:13px;font-weight:500;cursor:pointer}',
      '.dshwp-primary{flex:1;border:0;color:#fff;background:linear-gradient(140deg,var(--dsw-static-violet-400,#a78bfa),var(--dsw-static-violet-600,#7c3aed));box-shadow:0 1px 2px rgba(15,10,30,.25)}',
      '.dshwp-primary:hover{filter:brightness(1.1)}',
      '.dshwp-primary:focus-visible,.dshwp-ghost:focus-visible{outline:2px solid var(--dsw-static-violet-400,#a78bfa);outline-offset:2px}',
      '.dshwp-ghost{border:.5px solid var(--dsw-alias-border-l3);background:transparent;color:var(--dsw-alias-label-secondary)}',
      '.dshwp-ghost:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dshwp-ghost:disabled{opacity:.45;cursor:default}',
      '.dshwp-row{display:flex;align-items:center;gap:10px;margin-top:14px}',
      '.dshwp-label{flex:none;color:var(--dsw-alias-label-secondary)}',
      '.dshwp-range{flex:1;min-width:0;accent-color:var(--dsw-static-violet-600,#7c3aed);cursor:pointer}',
      '.dshwp-value{flex:none;width:40px;text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.dshwp-hint{margin:10px 0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
      '.dshwp-notice{margin:8px 0 0;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:16px}',
      /* The image lives in a child of the layer so the layer itself can keep an
         opaque, theme-colored base off macOS: there the window is opaque and the
         frame paints its own fill, so a translucent image would blend with the
         window instead of with a backdrop. */
      '.dshwp-image{position:absolute;inset:0;pointer-events:none}',
      'html:not([data-platform=darwin]) [data-dsh-wallpaper]{background-color:var(--dsw-static-neutral-bluish-00,#fff)}',
      'html:not([data-platform=darwin]) body[data-ds-dark-theme] [data-dsh-wallpaper]{background-color:var(--dsw-static-neutral-bluish-950,#151517)}',
    ].join('\n');

    const icon = h('svg', {
      viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': true, focusable: 'false',
    }, h('path', {
      d: 'M2.2 3.1h11.6a.9.9 0 0 1 .9.9v8a.9.9 0 0 1-.9.9H2.2a.9.9 0 0 1-.9-.9v-8a.9.9 0 0 1 .9-.9Z',
      fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3,
    }), h('circle', { cx: 5.7, cy: 6.1, r: 1.15, fill: 'currentColor' }),
    h('path', {
      d: 'm2.2 11.4 3.4-3.1 2.4 2.1 2.3-2.5 3.5 3.5', fill: 'none',
      stroke: 'currentColor', 'stroke-width': 1.3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));

    function layerElement() {
      return document.querySelector('[data-dsh-wallpaper]');
    }

    /** The full-window layer, kept as the body's first child and below #root. */
    function ensureLayer() {
      let el = layerElement();
      if (el) return el;
      el = document.createElement('div');
      el.setAttribute('data-dsh-wallpaper', '');
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '-1',
        pointerEvents: 'none',
      });
      const image = document.createElement('div');
      image.className = 'dshwp-image';
      image.setAttribute('data-dsh-wallpaper-image', '');
      Object.assign(image.style, {
        position: 'absolute',
        inset: '0',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        opacity: String(DEFAULT_OPACITY),
        transition: 'opacity 180ms ease',
      });
      el.appendChild(image);
      document.body.insertBefore(el, document.body.firstChild);
      return el;
    }

    /** The image inside the layer; `ensureLayer` owns its creation. */
    function imageElement(layer) {
      const el = layer || layerElement();
      return el ? el.querySelector('[data-dsh-wallpaper-image]') : null;
    }

    function openDb() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function loadState() {
      try {
        const db = await openDb();
        return await new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readonly');
          const request = tx.objectStore(STORE).get(KEY);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
          tx.oncomplete = () => db.close();
        });
      } catch {
        return null;
      }
    }

    async function saveState(state) {
      try {
        const db = await openDb();
        await new Promise((resolve) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(state, KEY);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); resolve(); };
        });
      } catch {
        // Storage unavailable: the wallpaper still works for this page.
      }
    }

    /** The picker lives in the frame-wide overlay layer, beside the window controls. */
    function WallpaperButton(props) {
      // The slot injects `t` because the registration names this namespace. The
      // fallback keeps readable copy if a host ever mounts the entry without it.
      const fallback = /^zh(-|$)/i.test(document.documentElement.lang || '') ? ZH : EN;
      const t = typeof props.t === 'function' ? props.t : (key) => fallback[key] ?? key;
      const [open, setOpen] = useState(false);
      const [image, setImage] = useState(null);
      const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
      const [ready, setReady] = useState(false);
      const [notice, setNotice] = useState('');
      const [dropping, setDropping] = useState(false);
      const [pos, setPos] = useState(null);
      const rootRef = useRef(null);
      const fileRef = useRef(null);

      const url = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);

      /**
       * The button belongs right of the sidebar's brand wordmark, and no slot
       * allocates that space. The anchor is measured instead: the sidebar toggle
       * locates the sidebar and its brand row, the brand's identity box ends the
       * wordmark, and the row supplies the vertical center. The window-chrome
       * position is only a fallback; off macOS the unmeasured button stays hidden.
       */
      useEffect(() => {
        let frame = 0;
        let ro = null;
        let mo = null;

        const measure = () => {
          const toggle = document.querySelector('[data-sidebar-toggle]');
          const toggleRow = toggle && toggle.closest('[data-window-drag]');
          const sidebar = toggleRow && toggleRow.parentElement;
          if (!sidebar) return;
          const rows = Array.from(sidebar.children).filter((el) => el.hasAttribute('data-window-drag'));
          const row = rows.find((el) => el !== toggleRow) || toggleRow;
          if (!row) return;
          const brand = Array.from(row.children).find((el) => !el.hasAttribute('data-sidebar-toggle') && !el.querySelector('[data-sidebar-toggle]'));
          if (!brand) return;
          const anchor = (brand.firstElementChild || brand).getBoundingClientRect();
          const box = row.getBoundingClientRect();
          if (box.width < 140 || anchor.width === 0) return;
          const left = Math.min(Math.max(anchor.right + 8, box.left + 8), box.right - 36);
          const top = box.top + Math.max(0, (box.height - 28) / 2);
          setPos((prev) => (prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5 ? prev : { left, top }));
        };

        const schedule = () => {
          if (frame) return;
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
              frame = 0;
              measure();
            });
          });
        };

        schedule();
        window.addEventListener('resize', schedule);
        const toggle = document.querySelector('[data-sidebar-toggle]');
        const toggleRow = toggle && toggle.closest('[data-window-drag]');
        const sidebar = toggleRow && toggleRow.parentElement;
        if (sidebar) {
          if (typeof ResizeObserver === 'function') {
            ro = new ResizeObserver(schedule);
            ro.observe(sidebar);
          }
          if (typeof MutationObserver === 'function') {
            mo = new MutationObserver(schedule);
            mo.observe(sidebar, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
          }
        }
        return () => {
          if (frame) cancelAnimationFrame(frame);
          window.removeEventListener('resize', schedule);
          if (ro) ro.disconnect();
          if (mo) mo.disconnect();
        };
      }, []);

      useEffect(() => {
        let alive = true;
        loadState().then((saved) => {
          if (!alive) return;
          if (saved && saved.blob instanceof Blob) setImage(saved.blob);
          if (saved && typeof saved.opacity === 'number') setOpacity(saved.opacity);
          setReady(true);
        });
        return () => { alive = false; };
      }, []);

      useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

      useEffect(() => {
        if (!url) {
          const stale = layerElement();
          if (stale) stale.remove();
          return;
        }
        const image = imageElement(ensureLayer());
        if (!image) return;
        image.style.backgroundImage = 'url("' + url + '")';
        image.style.opacity = String(opacity);
      }, [url, opacity]);

      useEffect(() => {
        const theme = runtime?.ctx?.theme;
        if (!url || typeof theme?.overrideTokens !== 'function') return;
        // The frame fill is opaque off macOS and covers the layer; on macOS the
        // frame is already transparent, so leave that platform untouched.
        const mac = document.documentElement.dataset.platform === 'darwin';
        const dispose = theme.overrideTokens('dsh-wallpaper', mac ? PANEL_TOKENS : { ...PANEL_TOKENS, ...FRAME_TOKENS });
        return () => dispose();
      }, [url]);

      useEffect(() => {
        if (!ready) return;
        // One write settles a whole slider drag; the blob is stored by reference.
        const timer = setTimeout(() => { saveState({ blob: image, opacity }); }, 300);
        return () => clearTimeout(timer);
      }, [ready, image, opacity]);

      useEffect(() => () => {
        const el = layerElement();
        if (el) el.remove();
      }, []);

      useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(''), 4000);
        return () => clearTimeout(timer);
      }, [notice]);

      useEffect(() => {
        if (!open) return;
        const onPointerDown = (event) => {
          if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown, true);
        };
      }, [open]);

      const acceptFile = (file) => {
        if (!file) return;
        if (!/^image\//.test(file.type || '')) {
          setNotice(t('notImage'));
          return;
        }
        if (file.size > MAX_BYTES) {
          setNotice(t('tooBig'));
          return;
        }
        setNotice('');
        setImage(file);
      };

      const preview = h('div', {
        className: 'dshwp-preview',
        'data-filled': image ? 'true' : 'false',
        'data-drop': dropping ? 'true' : 'false',
        style: url ? { backgroundImage: 'url("' + url + '")' } : undefined,
        onClick: () => fileRef.current?.click(),
        onDragOver: (event) => { event.preventDefault(); setDropping(true); },
        onDragLeave: () => setDropping(false),
        onDrop: (event) => {
          event.preventDefault();
          setDropping(false);
          acceptFile(event.dataTransfer?.files?.[0]);
        },
        role: 'button',
        tabIndex: 0,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileRef.current?.click();
          }
        },
        'aria-label': image ? t('replace') : t('choose'),
      }, image ? null : t('empty'));

      const panel = open ? h('div', {
        className: 'dshwp-panel',
        role: 'dialog',
        'aria-label': t('title'),
        'data-ready': pos ? 'true' : 'false',
        style: pos ? { left: pos.left + 'px', top: (pos.top + 36) + 'px' } : undefined,
      }, [
        h('div', { className: 'dshwp-head', key: 'head' }, [
          h('h2', { className: 'dshwp-title', key: 'title' }, t('title')),
          h('button', {
            key: 'close',
            type: 'button',
            className: 'dshwp-x',
            title: t('close'),
            'aria-label': t('close'),
            onClick: () => setOpen(false),
          }, h('svg', { viewBox: '0 0 12 12', width: 12, height: 12, 'aria-hidden': true }, h('path', {
            d: 'm2 2 8 8M10 2l-8 8', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round',
          }))),
        ]),
        preview,
        h('input', {
          key: 'file',
          ref: fileRef,
          type: 'file',
          accept: 'image/*',
          style: { display: 'none' },
          onChange: (event) => {
            acceptFile(event.target.files?.[0]);
            event.target.value = '';
          },
        }),
        h('div', { className: 'dshwp-actions', key: 'actions' }, [
          h('button', {
            key: 'choose',
            type: 'button',
            className: 'dshwp-primary',
            onClick: () => fileRef.current?.click(),
          }, image ? t('replace') : t('choose')),
          h('button', {
            key: 'remove',
            type: 'button',
            className: 'dshwp-ghost',
            disabled: !image,
            onClick: () => setImage(null),
          }, t('remove')),
        ]),
        h('div', { className: 'dshwp-row', key: 'opacity' }, [
          h('span', { className: 'dshwp-label', key: 'label' }, t('opacity')),
          h('input', {
            key: 'range',
            className: 'dshwp-range',
            type: 'range',
            min: 0,
            max: 100,
            step: 1,
            value: Math.round(opacity * 100),
            'aria-label': t('opacity'),
            onChange: (event) => setOpacity(Number(event.target.value) / 100),
          }),
          h('span', { className: 'dshwp-value', key: 'value' }, Math.round(opacity * 100) + '%'),
        ]),
        notice
          ? h('p', { className: 'dshwp-notice', key: 'notice' }, notice)
          : h('p', { className: 'dshwp-hint', key: 'hint' }, t('hint')),
      ]) : null;

      return h(React.Fragment, null,
        h('style', { key: 'css' }, CSS),
        h('div', { key: 'root', ref: rootRef, style: { display: 'contents' } },
          h('button', {
            type: 'button',
            className: 'dshwp-btn',
            title: t('label'),
            'aria-label': t('label'),
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            'data-on': image ? 'true' : 'false',
            'data-ready': pos ? 'true' : 'false',
            style: pos ? { left: pos.left + 'px', top: pos.top + 'px' } : undefined,
            onClick: () => setOpen((value) => !value),
          }, icon),
          panel));
    }

    return {
      inject: ['slots', 'theme', 'locale'],
      apply(ctx) {
        if (runtime?.ctx === ctx) return;
        runtime = { ctx };
        ctx.effect(() => ctx.locale.register(NS, 'zh', ZH));
        ctx.effect(() => ctx.locale.register(NS, 'en', EN));
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-wallpaper',
          order: 10,
          locale: NS,
          label: () => t('label'),
        }, WallpaperButton));
      },
    };
  },
});
