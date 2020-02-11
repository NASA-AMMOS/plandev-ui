import { contextMenu } from './context-menu';

describe('context-menu', () => {
  it('calling contextMenu sets the correct menu trigger data and calls correct trigger functions', () => {
    const mouseEvent = new MouseEvent('oncontextmenu');
    const triggerMock = {
      _element: { nativeElement: { style: { setProperty: () => {} } } },
      menu: { focusFirstItem: () => {} },
      menuData: {},
      openMenu: () => {},
    };
    const openMenuSpy = spyOn(triggerMock, 'openMenu');
    const data = { hello: 'world' };

    // @ts-ignore
    contextMenu(mouseEvent, triggerMock, data);
    expect(triggerMock.menuData).toEqual({ data });
    expect(openMenuSpy).toHaveBeenCalledTimes(1);
  });
});
