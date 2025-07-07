<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/user.js';
  import { getCurrentUser } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  import {auth} from '$lib/firebase'

  onMount(async () => {
    const currentUser = auth.currentUser
    
    if (currentUser) {
      user.set(currentUser);
    } else {
      goto('/login')
    }
  });
</script>

<slot></slot>