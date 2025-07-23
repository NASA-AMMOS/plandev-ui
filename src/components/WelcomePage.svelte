<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { Button } from '@nasa-jpl/stellar-svelte';
  import AerieWordmarkDark from '../assets/aerie-wordmark-dark.svg?component';

  function goToLogin() {
    if (env.PUBLIC_AUTH_OIDC_ENABLED === 'true') {
      document.location.href = '/oidc/login';
    } else {
      document.location.href = '/login';
    }
  }
</script>

<div class="w-100 flex h-12 items-center bg-[#110D3D] px-4 dark:bg-secondary" role="navigation">
  <AerieWordmarkDark />
  <!--center this somehow?-->
</div>
<div>
  Welcome to AERIE! (info about AERIE, welcome page stuff) It would appear that you are not currently logged in, so you
  cannot access anything. Log in here:
</div>

<div>
  <form on:submit|preventDefault={goToLogin}>
    <fieldset>
      <Button type="submit">Log In!</Button>
    </fieldset>
  </form>
</div>
