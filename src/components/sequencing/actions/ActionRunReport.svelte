<svelte:options immutable={true} />

<script lang="ts">
  import { browser } from '$app/environment';
  import { renderReportMarkdown } from '../../../utilities/markdown';

  export let markdown: string;

  // Sanitization runs against the DOM, so only render in the browser; the
  // server pass emits nothing and the client fills it in on hydration.
  $: html = browser ? renderReportMarkdown(markdown) : '';
</script>

{#if html}
  <div class="report-body" data-testid="action-run-report">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- content is sanitized by renderReportMarkdown -->
    {@html html}
  </div>
{/if}

<style lang="postcss">
  .report-body {
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    line-height: 1.5;
    word-break: break-word;
  }

  .report-body :global(:first-child) {
    margin-top: 0;
  }

  .report-body :global(:last-child) {
    margin-bottom: 0;
  }

  .report-body :global(h1),
  .report-body :global(h2),
  .report-body :global(h3),
  .report-body :global(h4),
  .report-body :global(h5),
  .report-body :global(h6) {
    font-weight: 600;
    line-height: 1.25;
    margin: 1em 0 0.5em;
  }

  .report-body :global(h1) {
    font-size: 1.25rem;
  }

  .report-body :global(h2) {
    font-size: 1.125rem;
  }

  .report-body :global(h3) {
    font-size: 1rem;
  }

  .report-body :global(p) {
    margin: 0.5em 0;
  }

  .report-body :global(a) {
    color: hsl(var(--primary));
    text-decoration: underline;
  }

  .report-body :global(ul) {
    list-style: disc outside;
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .report-body :global(ol) {
    list-style: decimal outside;
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .report-body :global(li) {
    margin: 0.25em 0;
  }

  .report-body :global(code) {
    @apply font-mono;
    background: hsl(var(--muted));
    border-radius: 3px;
    font-size: 0.85em;
    padding: 0.1em 0.3em;
  }

  .report-body :global(pre) {
    background: hsl(var(--muted));
    border-radius: 4px;
    overflow-x: auto;
    padding: 0.75em;
  }

  .report-body :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .report-body :global(blockquote) {
    border-left: 3px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
    margin: 0.5em 0;
    padding-left: 1em;
  }

  .report-body :global(table) {
    border-collapse: collapse;
    margin: 0.5em 0;
    width: 100%;
  }

  .report-body :global(th),
  .report-body :global(td) {
    border: 1px solid hsl(var(--border));
    padding: 0.4em 0.6em;
    text-align: left;
  }

  .report-body :global(th) {
    background: hsl(var(--muted));
    font-weight: 600;
  }

  .report-body :global(hr) {
    border: 0;
    border-top: 1px solid hsl(var(--border));
    margin: 1em 0;
  }
</style>
