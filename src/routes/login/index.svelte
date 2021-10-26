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
  import Field from '../../components/form/Field.svelte';
  import Label from '../../components/form/Label.svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import type { LoginPostResponseBody } from '../auth/login';

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
      const loginResponse: LoginPostResponseBody = await response.json();
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
  <form on:submit|preventDefault={login}>
    <div class="title">Log in to Aerie</div>

    <Field visible={error !== null}>
      <AlertError message={error} />
    </Field>

    <Field>
      <Label for="username">Username</Label>
      <input
        autocomplete="off"
        bind:this={usernameInput}
        bind:value={username}
        class="st-input w-100"
        name="username"
        required
        type="text"
      />
    </Field>

    <Field>
      <Label for="password">Password</Label>
      <input
        autocomplete="off"
        bind:value={password}
        class="st-input w-100"
        name="password"
        required
        type="password"
      />
    </Field>

    <Field>
      <button
        class="st-button"
        disabled={password === '' || username === ''}
        type="submit"
      >
        {loginButtonText}
      </button>
    </Field>
  </form>
</div>

<style>
  form {
    background-color: var(--st-primary-background-color);
    border-radius: 4px;
    box-shadow: 0 2px 1px -1px #0003, 0 1px 1px 0 #00000024,
      0 1px 3px 0 #0000001f;
    padding: 5px;
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
    padding: 0.5rem;
  }
</style>
