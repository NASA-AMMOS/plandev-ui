<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import PageTitle from '../components/app/PageTitle.svelte';
  import AuthErrorPage from '../components/AuthErrorPage.svelte';
  import WelcomePage from '../components/WelcomePage.svelte';

  const comics = [
    { id: '538', name: 'security' },
    { id: '927', name: 'standards' },
    { id: '1091', name: 'curiosity' },
    { id: '1356', name: 'orbital_mechanics' },
    { id: '1504', name: 'opportunity' },
    { id: '1825', name: '7_eleven' },
    { id: '2111', name: 'opportunity_rover' },
    { id: '2427', name: 'perseverance_microphones' },
    { id: '2444', name: 'ingenuity' },
  ];

  let imgUrl: string;
  let xkcdUrl: string;

  console.log('PAGE ERROR:', $page.error);

  let authError = $page.status === 403;
  let expirationError =
    $page.status === 401 ||
    $page.error?.message.includes('JWT Expired in') ||
    $page.error?.message.includes('Logout triggered server-side');

  onMount(() => {
    const { id, name } = authError ? comics[0] : comics[Math.floor(Math.random() * comics.length)];
    imgUrl = `https://imgs.xkcd.com/comics/${name}.png`;
    xkcdUrl = `https://xkcd.com/${id}/`;
  });
</script>

<PageTitle title={authError ? 'Unauthenticated' : '404'} />

{#if expirationError}
  <AuthErrorPage message={$page.error?.message} />
{:else if authError}
  <WelcomePage />
{:else}
  <div class="app-error-container">
    <div class="app-error">
      <div class="app-error-title">
        <div>Uh O! Sorry, we can't find that page.</div>
        <div>{$page.error?.message}</div>
        <button class="st-button" on:click={() => goto(`${base}/`)}> Return Home </button>
      </div>

      <a href={xkcdUrl} target="_blank" rel="noopener noreferrer">
        <img alt={imgUrl} src={imgUrl} />
      </a>
    </div>
  </div>
{/if}

<style>
  .app-error-container {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
  }

  .app-error {
    align-items: center;
    border: 1px solid rgb(0 0 0 / 12.5%);
    border-radius: 0.25rem;
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }

  .app-error-title {
    align-items: center;
    display: flex;
    flex-direction: column;
    font-size: 1rem;
    gap: 1rem;
    padding: 2rem;
  }
</style>
