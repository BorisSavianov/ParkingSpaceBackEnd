<script>
  import { onAuthStateChange } from '$lib/auth'; // adjust the path as needed
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user';
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';

  let unsubscribe;

  onMount(() => {
    unsubscribe = onAuthStateChange(async ({ user: authUser, token }) => {
      if (!authUser || !token) {
        localStorage.removeItem('token');
        goto('/login');
        return;
      }

      // Store token
      localStorage.setItem('token', token);
      

      // Validate with server
      const res = await fetch('/api/auth/validate', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await res.json();

      if (!result.success || !result.user.isActive) {
        localStorage.removeItem('token');
        alert(`Account isn't active`);
        goto('/login');
        return;
      }

      user.set(result.user);
    });
  });

  // optional: clean up the listener
  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>


<slot></slot>