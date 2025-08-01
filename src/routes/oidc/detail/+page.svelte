<script lang="ts">
  import TokenRefresh from '$lib/components/oidc/Refresh.svelte';
  import { accessTokenStore, idTokenStore } from '$lib/stores/oidc';
  import type { MaybeToken } from '$lib/types/oidc';
  import type { PageData } from '../$types';

  export let data: PageData;

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
    <p class="text">Expires in: {expiresAt($accessTokenStore)}</p>
    <pre class="h-64 overflow-auto border p-4 text-xs">{JSON.stringify($accessTokenStore, null, 2)}</pre>
  </div>

  <div class="prose-base mt-4">
    <h3 class="text-xl font-bold">ID Token</h3>
    <p class="text">Expires in: {expiresAt($idTokenStore)}</p>
    <pre class="h-64 overflow-auto border p-4 text-xs">{JSON.stringify($idTokenStore, null, 2)}</pre>
  </div>
</div>

<div><pre>{JSON.stringify(data.user, null, 2)}</pre></div>

<div>
  <div>
    <TokenRefresh></TokenRefresh>
  </div>
</div>
