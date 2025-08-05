<script lang="ts">
  import TokenRefresh from '$lib/components/oidc/Refresh.svelte';
  import type { MaybeToken } from '$lib/types/oidc';
  import * as cookie from 'cookie';
  import { jwtDecode } from 'jwt-decode';
  import { userStore } from '../../../lib/stores/auth';
  import { accessTokenDecoded } from '../../../lib/stores/oidc';

  // NOTE: not a store since we don't need to store it with the user object, and we would require
  //    some extra machinery to save it to a store which is unnecessary given this is the only place
  //    it gets read
  let idTokenDecoded = jwtDecode(cookie.parse(document.cookie)['accessToken']);

  function expiresAt(token: MaybeToken): Date | string {
    if (token?.exp) {
      return new Date(token.exp * 1000);
    } else {
      return 'No .exp field in token';
    }
  }
</script>

<h2 class="text-2xl font-bold">Token Details</h2>

<div class="items-top flex justify-between">
  <div class="prose-base mt-4">
    <h3 class="text-xl font-bold">Access Token</h3>
    <p class="text">Expires in: {expiresAt($accessTokenDecoded)}</p>
    <pre class="h-64 overflow-auto border p-4 text-xs">{JSON.stringify($accessTokenDecoded, null, 2)}</pre>
  </div>

  <div class="prose-base mt-4">
    <h3 class="text-xl font-bold">ID Token</h3>
    <p class="text">Expires in: {expiresAt(idTokenDecoded)}</p>
    <pre class="h-64 overflow-auto border p-4 text-xs">{JSON.stringify(idTokenDecoded, null, 2)}</pre>
  </div>
</div>

<div><pre>{JSON.stringify($userStore, null, 2)}</pre></div>

<div>
  <div>
    <TokenRefresh></TokenRefresh>
  </div>
</div>
