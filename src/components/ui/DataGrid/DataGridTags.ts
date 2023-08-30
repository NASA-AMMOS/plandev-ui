import type { ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
import type { Tag } from '../../../types/tags';
import TagChip from '../Tags/Tag.svelte';

type AssetWithTags<T = any> = T & {
  tags: { tag: Tag }[];
};

export function tagsCellRenderer<T>(params?: ICellRendererParams<AssetWithTags<T>>) {
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

export function tagsFilterValueGetter<T>(params: ValueGetterParams<AssetWithTags<T>>) {
  return params.data?.tags.map(({ tag }) => tag.name).join(', ') ?? '';
}
