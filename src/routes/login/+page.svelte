<svelte:options immutable={true} />

<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import { permissibleQueries as permissibleQueriesStore, user as userStore } from '../../stores/app';
  import type { LoginResponseBody } from '../../types/auth';

  let error: string | null = null;
  let fullError: string | null = null;
  let loginButtonText = 'Login';
  let password = '';
  let username = '';
  let usernameInput: HTMLInputElement | null = null;

  $: if ($permissibleQueriesStore && !Object.keys($permissibleQueriesStore).length) {
    error = 'You are not authorized';
    fullError =
      'You are not authorized to access the page that you attempted to view. Please contact a tool administrator to request access.';
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
      const { message, success, user = null } = loginResponse;

      if (success) {
        $userStore = user;
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
