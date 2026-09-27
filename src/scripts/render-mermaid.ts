import mermaid from 'mermaid';

type MermaidTheme = 'dark' | 'default';

let diagramSeq = 0;
let activeTheme: MermaidTheme | null = null;
let rendering: Promise<void> | null = null;

function themeFromDom(): MermaidTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

function extractSource(pre: HTMLElement): string {
  const code = pre.querySelector('code');
  return (code?.textContent ?? pre.textContent ?? '').trim();
}

function findMermaidPres(): HTMLElement[] {
  const found = new Set<HTMLElement>();

  document
    .querySelectorAll<HTMLElement>('pre[data-language="mermaid"]')
    .forEach((pre) => found.add(pre));

  document.querySelectorAll('pre > code.language-mermaid').forEach((code) => {
    if (code.parentElement instanceof HTMLElement) {
      found.add(code.parentElement);
    }
  });

  return Array.from(found);
}

/** Convert Astro/Shiki mermaid fences into stable diagram hosts. */
function ensureContainers(): HTMLElement[] {
  for (const pre of findMermaidPres()) {
    if (!(pre instanceof HTMLElement) || pre.tagName !== 'PRE') continue;

    const source = extractSource(pre);
    const container = document.createElement('div');
    container.className = 'mermaid-diagram';
    container.dataset.mermaidSource = source;
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', 'Mermaid diagram');
    pre.replaceWith(container);
  }

  return Array.from(document.querySelectorAll<HTMLElement>('.mermaid-diagram'));
}

async function renderDiagrams(): Promise<void> {
  const theme = themeFromDom();
  const containers = ensureContainers();
  if (containers.length === 0) return;

  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'strict',
  });
  activeTheme = theme;

  for (const el of containers) {
    const source = el.dataset.mermaidSource ?? '';
    if (!source) continue;

    const id = `mermaid-diagram-${++diagramSeq}`;
    try {
      const { svg, bindFunctions } = await mermaid.render(id, source);
      el.innerHTML = svg;
      bindFunctions?.(el);
    } catch (err) {
      console.error('Mermaid render failed:', err);
      el.classList.add('mermaid-diagram--error');
      el.textContent = source;
    }
  }
}

function scheduleRender(): void {
  if (rendering) return;
  rendering = renderDiagrams().finally(() => {
    rendering = null;
    if (themeFromDom() !== activeTheme) {
      scheduleRender();
    }
  });
}

function watchTheme(): void {
  const observer = new MutationObserver(() => {
    if (themeFromDom() !== activeTheme) {
      scheduleRender();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

scheduleRender();
watchTheme();
