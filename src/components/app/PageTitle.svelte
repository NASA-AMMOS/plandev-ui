<script lang="ts">
  import { page } from '$app/stores';
  import { getAppBrand } from '../../utilities/branding';

  export let title: string = '';
  export let subTitle: string = '';

  $: brand = getAppBrand($page.url.pathname);

  $: pageTitle = ((route: string = '', subRoute: string = '') => {
    if (subRoute && route) {
      return `${subRoute} - ${route}`;
    }

    if (subRoute || route) {
      return `${subRoute || route}`;
    }

    return '';
  })(title, subTitle);
</script>

<svelte:head>
  <title>{pageTitle} &#10022; {brand}</title>
</svelte:head>
