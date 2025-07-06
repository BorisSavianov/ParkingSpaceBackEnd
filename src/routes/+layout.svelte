<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user.js';
  import { getCurrentUser } from '$lib/auth.js';

  onMount(async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      user.set(currentUser);
    }
  });
</script>

<slot></slot>