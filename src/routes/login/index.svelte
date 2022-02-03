<script lang="ts" context="module">
  import type { LoadInput, LoadOutput } from '@sveltejs/kit';

  export async function load({ session }: LoadInput): Promise<LoadOutput> {
    if (session.user) {
      return {
        redirect: '/plans',
        status: 302,
      };
    }
    return {};
  }
</script>

<script lang="ts">
  import { session } from '$app/stores';
  import { onMount } from 'svelte';
  import type { LoginResponseBody } from '../auth/login';
  import AlertError from '../../components/ui/AlertError.svelte';

  let error = null;
  let loginButtonText = 'Login';
  let password = '';
  let username = '';
  let usernameInput: HTMLInputElement | null = null;

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
      const response = await fetch('/auth/login', options);
      const loginResponse: LoginResponseBody = await response.json();
      const { message, success, user = null } = loginResponse;

      if (success) {
        $session.user = user; // Triggers redirect.
      } else {
        console.log(message);
        error = message;
        loginButtonText = 'Login';
      }
    } catch (e) {
      console.log(e);
      error = e.message;
      loginButtonText = 'Login';
    }
  }
</script>

<div class="container">
  <form on:submit|preventDefault={login} class="p-3">
    <div class="title">Log in to Aerie</div>

    {#if error !== null}
      <fieldset>
        <AlertError message={error} />
      </fieldset>
    {/if}

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
      <input
        autocomplete="off"
        bind:value={password}
        class="st-input w-100"
        name="password"
        required
        type="password"
      />
    </fieldset>

    <fieldset>
      <button
        class="st-button w-100"
        disabled={password === '' || username === ''}
        type="submit"
      >
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
    font-size: 1rem;
    justify-content: center;
  }
</style>
