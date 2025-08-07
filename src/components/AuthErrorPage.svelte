<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import AerieWordmarkDark from '../assets/aerie-wordmark-dark.svg?component';
  import { userStore } from '../lib/stores/auth';
  import { goToLogin } from '../utilities/auth';
  import { logout } from '../utilities/login';

  export let message: string | undefined;

  let accessToken: string | undefined;
  accessToken = $userStore?.token;
</script>

<div class="w-100 flex h-12 items-center bg-[#110D3D] px-4 dark:bg-secondary" role="navigation">
  <AerieWordmarkDark />
  <!--center this somehow?-->
</div>
<div>
  Looks like you encountered an authentication error:

  <div>
    {message}
  </div>

  Don't worry, you didn't do anything wrong and we can get you right back in.

  {accessToken
    ? 'We are going to log you out, and then you can reauthenticate. Sorry about that!'
    : 'Make note of the error and click below to try logging in again! If this error keeps persisting, please contact a system administrator.'}
</div>

{#if accessToken}
  <div>
    <form on:submit={() => logout()}>
      <fieldset>
        <Button type="submit">Log Out!</Button>
      </fieldset>
    </form>
  </div>
{:else}
  <div>
    <form on:submit|preventDefault={goToLogin}>
      <fieldset>
        <Button type="submit">Log In!</Button>
      </fieldset>
    </form>
  </div>
{/if}
