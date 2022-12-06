<script lang="ts">
  export let title: string = '';
  export let subTitle: string = '';

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
  <title>{pageTitle} &#10022; Aerie</title>
</svelte:head>
