<script lang="ts">
  import { Button } from '@nasa-jpl/stellar-svelte';
  import AerieWordmarkDark from '../assets/aerie-wordmark-dark.svg?component';
  import { goToLogin } from '../utilities/auth';
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
