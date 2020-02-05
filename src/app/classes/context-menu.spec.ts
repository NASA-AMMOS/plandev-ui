import { ContextMenu } from './context-menu';

describe('ContextMenu', () => {
  let contextMenu;

  beforeEach(() => {
    contextMenu = new ContextMenu();
  });

  it('initial class state', () => {
    expect(contextMenu.contextMenuPosition.x).toBe(0);
    expect(contextMenu.contextMenuPosition.y).toBe(0);
  });

  it('calling onContextMenu sets the correct menu trigger data and calls correct trigger functions', () => {
    const mouseEvent = new MouseEvent('oncontextmenu');
    const triggerMock = { _openedBy: '', menuData: {}, openMenu: () => {} };
    const openMenuSpy = spyOn(triggerMock, 'openMenu');
    const item = { hello: 'world' };

    contextMenu.onContextMenu(mouseEvent, triggerMock, item);
    expect(triggerMock.menuData).toEqual({ item });
    expect(triggerMock._openedBy).toEqual('mouse');
    expect(openMenuSpy).toHaveBeenCalledTimes(1);
  });
});
