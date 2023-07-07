import type { ICellRendererParams } from 'ag-grid-community';
import type { Tag } from '../../../types/tags';
import TagChip from '../Tags/Tag.svelte';

export function tagsCellRenderer(params?: ICellRendererParams<{ tags: { tag: Tag }[] }>) {
  if (params && params.data && params.data.tags) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags-cell';
    params.data.tags.map(({ tag }) => {
      new TagChip({
        props: {
          removable: false,
          tag,
        },
        target: tagsDiv,
      });
    });
    return tagsDiv;
  }
}
