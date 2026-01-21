<svelte:options immutable={true} />

<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { env } from '$env/dynamic/public';
  import { Button, Input, Label } from '@nasa-jpl/stellar-svelte';
  import AlertError from '../../components/ui/AlertError.svelte';
  import { SearchParameters } from '../../enums/searchParameters';
  import { getUserStore } from '../../stores/user';
  import type { LoginResponseBody } from '../../types/auth';
  import { EXPIRED_JWT, hasNoAuthorization } from '../../utilities/permissions';
  import { removeQueryParam } from '../../utilities/url';

  const user = getUserStore();

  let error: string | null = null;
  let fullError: string | null = null;
  let loginButtonText = 'Login';
  let password = '';
  let reason = $page.url.searchParams.get(SearchParameters.REASON);
  let username = '';

  $: if ($user?.permissibleQueries && hasNoAuthorization($user)) {
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

  function isOidcEnabled() {
    return env.PUBLIC_AUTH_OIDC_ENABLED === 'true';
  }
</script>

<div class="flex h-full w-full items-center justify-center bg-accent">
  <form
    on:submit|preventDefault={login}
    class="flex w-[320px] flex-col gap-2 rounded-md border bg-background px-3 py-6 shadow-sm"
    autocomplete="off"
  >
    <div class="flex items-center justify-center text-base tracking-tight">Log in to PlanDev</div>

    <AlertError class="m-2" {error} {fullError} />

    {#if isOidcEnabled()}
      <fieldset class="pt-4">
        <div>
          <Button type="button" on:click={() => goto(`${base}/oidc/login`)}>Login Using OIDC</Button>
        </div>
      </fieldset>
    {:else}
      <fieldset>
        <Label size="sm" for="username" class="pb-0.5">Username</Label>
        <Input
          sizeVariant="xs"
          autocomplete="off"
          autofocus
          bind:value={username}
          name="username"
          required
          type="text"
        />
      </fieldset>

      <fieldset>
        <Label size="sm" for="password" class="pb-0.5">Password</Label>
        <Input sizeVariant="xs" autocomplete="off" bind:value={password} name="password" required type="password" />
      </fieldset>

      <fieldset class="pt-4">
        <Button disabled={password === '' || username === ''} type="submit">
          {loginButtonText}
        </Button>
      </fieldset>
    {/if}
  </form>
</div>
