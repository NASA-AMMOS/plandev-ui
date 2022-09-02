<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import CardListIcon from 'bootstrap-icons/icons/card-list.svg?component';
  import CodeSquareIcon from 'bootstrap-icons/icons/code-square.svg?component';
  import Nav from '../../components/app/Nav.svelte';
  import NavButton from '../../components/app/NavButton.svelte';
  import CssGrid from '../../components/ui/CssGrid.svelte';
</script>

<CssGrid rows="42px calc(100vh - 42px)">
  <Nav>
    <span class="expansion-title" slot="title">Expansion</span>

    <svelte:fragment slot="right">
      <NavButton
        selected={$page.url.pathname.includes('rules')}
        title="Rules"
        on:click={() => goto(`${base}/expansion/rules`)}
      >
        <CodeSquareIcon />
      </NavButton>
      <NavButton
        selected={$page.url.pathname.includes('sets')}
        title="Sets"
        on:click={() => goto(`${base}/expansion/sets`)}
      >
        <CardListIcon />
      </NavButton>
    </svelte:fragment>
  </Nav>

  <slot />
</CssGrid>
