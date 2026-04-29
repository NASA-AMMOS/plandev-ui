import { afterEach, describe, expect, test, vi } from 'vitest';
import { handleConsoleLogCopy } from './consoleLogCopy';

type RowSpec = { open?: boolean; pre?: string; summary: string };

function makeContainer(rows: RowSpec[]): HTMLElement {
  const container = document.createElement('div');
  for (const row of rows) {
    const details = document.createElement('details');
    if (row.open) {
      details.setAttribute('open', '');
    }
    const summary = document.createElement('summary');
    summary.textContent = row.summary;
    details.appendChild(summary);
    if (row.pre) {
      const expanded = document.createElement('div');
      const pre = document.createElement('pre');
      pre.textContent = row.pre;
      expanded.appendChild(pre);
      details.appendChild(expanded);
    }
    container.appendChild(details);
  }
  document.body.appendChild(container);
  return container;
}

function mockSelectionOver(detailsEls: HTMLDetailsElement[]) {
  const selection = {
    containsNode: (node: Node) => detailsEls.includes(node as HTMLDetailsElement),
    getRangeAt: () => ({
      endContainer: detailsEls[detailsEls.length - 1],
      startContainer: detailsEls[0],
    }),
    isCollapsed: detailsEls.length === 0,
    toString: () => '',
  };
  vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);
}

function makeClipboardEvent(opts: { defaultPrevented?: boolean } = {}): ClipboardEvent {
  return {
    clipboardData: { setData: vi.fn() },
    defaultPrevented: opts.defaultPrevented ?? false,
    preventDefault: vi.fn(),
  } as unknown as ClipboardEvent;
}

describe('handleConsoleLogCopy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('multi-row selection emits one cleaned line per summary', () => {
    const container = makeContainer([
      { summary: '  10:00:00 AM  [INFO]   first message  ' },
      { summary: '  10:00:01 AM  [INFO]   second message  ' },
    ]);
    mockSelectionOver(Array.from(container.querySelectorAll('details')));

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).toHaveBeenCalledWith(
      'text/plain',
      '10:00:00 AM [INFO] first message\n10:00:01 AM [INFO] second message',
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('preserves newlines inside <pre> in expanded rows', () => {
    const container = makeContainer([
      { open: true, pre: 'line one\nline two\nline three', summary: '  10:00:00 AM  [ERROR]  boom  ' },
      { summary: '  10:00:01 AM  [INFO]  next  ' },
    ]);
    mockSelectionOver(Array.from(container.querySelectorAll('details')));

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).toHaveBeenCalledWith(
      'text/plain',
      '10:00:00 AM [ERROR] boom\nline one\nline two\nline three\n10:00:01 AM [INFO] next',
    );
  });

  test('skips expanded content when the row is closed', () => {
    const container = makeContainer([{ pre: 'should-not-appear', summary: 'first' }, { summary: 'second' }]);
    mockSelectionOver(Array.from(container.querySelectorAll('details')));

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).toHaveBeenCalledWith('text/plain', 'first\nsecond');
  });

  test('single-row selection that spans summary→expanded gets cleaned summary + preserved <pre>', () => {
    const container = makeContainer([
      { open: true, pre: 'trace line one\ntrace line two', summary: '  10:00:00 AM  [ERROR]   boom  ' },
    ]);
    const [details] = Array.from(container.querySelectorAll('details'));
    const summary = details.querySelector('summary')!;
    const pre = details.querySelector('pre')!;

    // Selection starts inside the summary (cleaned), ends inside the expanded <pre> (preserved).
    const selection = {
      containsNode: (node: Node) => node === details,
      getRangeAt: () => ({ endContainer: pre, startContainer: summary }),
      isCollapsed: false,
      toString: () => '',
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(selection as unknown as Selection);

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).toHaveBeenCalledWith(
      'text/plain',
      '10:00:00 AM [ERROR] boom\ntrace line one\ntrace line two',
    );
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('single-row selection entirely outside summary bails so native preserves <pre>', () => {
    const container = makeContainer([{ summary: 'only row' }, { summary: 'other row' }]);
    const [first] = Array.from(container.querySelectorAll('details'));
    mockSelectionOver([first]);

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  test('bails when the per-summary handler already wrote to the clipboard', () => {
    const container = makeContainer([{ summary: 'a' }, { summary: 'b' }]);
    mockSelectionOver(Array.from(container.querySelectorAll('details')));

    const event = makeClipboardEvent({ defaultPrevented: true });
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).not.toHaveBeenCalled();
  });

  test('bails when the selection touches no rows', () => {
    const container = makeContainer([{ summary: 'a' }]);
    mockSelectionOver([]);

    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, container);

    expect(event.clipboardData?.setData).not.toHaveBeenCalled();
  });

  test('bails when there is no container', () => {
    const event = makeClipboardEvent();
    handleConsoleLogCopy(event, undefined);

    expect(event.clipboardData?.setData).not.toHaveBeenCalled();
  });
});
