<svelte:options immutable={true} />

<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  const comics = [
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

  onMount(() => {
    const { id, name } = comics[Math.floor(Math.random() * comics.length)];
    imgUrl = `https://imgs.xkcd.com/comics/${name}.png`;
    xkcdUrl = `https://xkcd.com/${id}/`;
  });
</script>

<div class="app-error-container">
  <div class="app-error">
    <div class="app-error-title">
      <div>Uh O! Sorry, we can't find that page.</div>
      <button class="st-button" on:click={() => goto('/')}> Return Home </button>
    </div>

    <a href={xkcdUrl} target="_blank" rel="noopener noreferrer">
      <img alt={imgUrl} src={imgUrl} />
    </a>
  </div>
</div>

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
