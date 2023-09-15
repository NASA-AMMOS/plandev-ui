<svelte:options immutable={true} />

<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import type { LoginResponseBody } from '../../types/auth';
  import { removeQueryParam } from '../../utilities/generic';
  import { EXPIRED_JWT, hasNoAuthorization } from '../../utilities/permissions';
  import type { PageData } from './$types';

  export let data: PageData;

  let error: string | null = null;
  let fullError: string | null = null;
  let loginButtonText = 'Login';
  let password = '';
  let reason = $page.url.searchParams.get(SearchParameters.REASON);
  let username = '';
  let usernameInput: HTMLInputElement | null = null;

  $: if (data.user?.permissibleQueries && hasNoAuthorization(data.user)) {
    error = 'You are not authorized';
    fullError =
      'You are not authorized to access the page that you attempted to view. Please contact a tool administrator to request access.';
  }

  $: if (reason) {
    if (reason.includes(EXPIRED_JWT)) {
      error = 'Your session has expired.';
      fullError = 'Your session has expired. Please log in again.';
    } else {
      error = decodeURIComponent(reason);
      fullError = null;
    }

    removeQueryParam(SearchParameters.REASON);
  }

  onMount(() => {
    if (usernameInput) {
      usernameInput.focus();
    }
  });

  async function login() {
    error = null;
    loginButtonText = 'Logging in...';

    try {
      const options = {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      };
      const response = await fetch(`${base}/auth/login`, options);
      const loginResponse: LoginResponseBody = await response.json();
      const { message, success } = loginResponse;

      if (success) {
        await invalidateAll();
        await goto(`${base}/plans`);
      } else {
        console.log(message);
        error = message ?? null;
        loginButtonText = 'Login';
      }
    } catch (e) {
      console.log(e);
      error = (e as Error).message;
      loginButtonText = 'Login';
    }
  }
</script>

<div class="container">
  <form on:submit|preventDefault={login} class="form">
    <div class="title st-typography-displayBody">Log in to Aerie</div>

    <AlertError class="m-2" {error} {fullError} />

    <fieldset>
      <label for="username"> Username </label>
      <input
        autocomplete="off"
        bind:this={usernameInput}
        bind:value={username}
        class="st-input w-100"
        name="username"
        required
        type="text"
      />
    </fieldset>

    <fieldset>
      <label for="password"> Password </label>
      <input autocomplete="off" bind:value={password} class="st-input w-100" name="password" required type="password" />
    </fieldset>

    <fieldset>
      <button class="st-button w-100" disabled={password === '' || username === ''} type="submit">
        {loginButtonText}
      </button>
    </fieldset>
  </form>
</div>

<style>
  form {
    background-color: var(--st-primary-background-color);
    border: 1px solid var(--st-gray-20);
    width: 300px;
  }

  .container {
    align-items: center;
    display: flex;
    height: 100%;
    justify-content: center;
    width: 100%;
  }

  .title {
    align-items: center;
    display: flex;
    justify-content: center;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 8px;
  }
</style>
