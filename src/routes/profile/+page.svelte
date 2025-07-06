<script>
  import { goto } from '$app/navigation';

  async function handleLogout() {
    try {
      const res = await fetch('https://reserve-parking-space-back-end.vercel.app/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('token');
        goto('/login');
      } else {
        alert('Logout failed');
      }
    } catch (err) {
      alert('Error logging out');
    }
  }
</script>

<button on:click={handleLogout}>
  Logout
</button>
