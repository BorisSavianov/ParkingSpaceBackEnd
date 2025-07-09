<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authenticatedFetch } from '$lib/auth.js';
  import { user } from '$lib/stores/user.js';
  import Header from '$lib/components/Header.svelte';
  
  
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      // Verify admin access
      const response = await authenticatedFetch('/api/auth/validate');
      const data = await response.json();
      
      
      if (!data.success || data.user.role !== 'admin') {
        alert('You must have admin')
        goto('/');
        return;
      }

      if (localStorage.getItem('token')  === null){
        goto('/login');
        return;
      }
      
      user.set(data.user);
      loading = false;
    } catch (err) {
      console.error('Admin auth check failed:', err);
      error = 'Access denied';
      goto('/');
    }
  });
  
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/reservations', label: 'Reservations', icon: '🚗' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
  ];
  
  $: currentPath = $page.url.pathname;
</script>

<svelte:head>
  <title>Admin Panel - Parking Management</title>
</svelte:head>


{#if loading}
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading admin panel...</p>
  </div>
{:else if error}
  <div class="error-container">
    <h2>❌ {error}</h2>
    <p>You don't have permission to access this page.</p>
  </div>
{:else}
  <div class="admin-layout">
    <!-- Sidebar -->
    <nav class="admin-sidebar">
      <div class="sidebar-header">
        <h2>🛡️ Admin Panel</h2>
      </div>
      
      <ul class="nav-menu">
        {#each navItems as item}
          <li>
            <a 
            on:click={() => goto(item.href)}
              class="nav-link {currentPath === item.href ? 'active' : ''}"
            >
              <span class="nav-icon">{item.icon}</span>
              <span class="nav-label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
      
      <div class="sidebar-footer">
        <a on:click={goto('/')} class="back-link">← Back to Main App</a>
      </div>
    </nav>
    
    <!-- Main Content -->
    <main class="admin-content">
      <slot />
    </main>
  </div>
{/if}

<style>
  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .admin-layout {
    display: flex;
    min-height: calc(100vh - 80px);
    background: #f8f9fa;
  }
  
  .admin-sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e9ecef;
    display: flex;
    flex-direction: column;
    position: fixed;
    height: calc(100vh - 80px);
    top: 80px;
    left: 0;
    overflow-y: auto;
    z-index: 50;
  }
  
  .sidebar-header {
    padding: 2rem 1.5rem 1rem;
    border-bottom: 1px solid #e9ecef;
  }
  
  .sidebar-header h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .nav-menu {
    flex: 1;
    padding: 1rem 0;
    list-style: none;
    margin: 0;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    padding: 0.875rem 1.5rem;
    color: #64748b;
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }
  
  .nav-link:hover {
    background: #f8f9fa;
    color: #2563eb;
  }
  
  .nav-link.active {
    background: #eff6ff;
    color: #2563eb;
    border-left-color: #2563eb;
  }
  
  .nav-icon {
    margin-right: 0.75rem;
    font-size: 1.125rem;
  }
  
  .nav-label {
    font-weight: 500;
  }
  
  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #e9ecef;
  }
  
  .back-link {
    color: #6b7280;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s ease;
  }
  
  .back-link:hover {
    color: #2563eb;
  }
  
  .admin-content {
    flex: 1;
    margin-left: 280px;
    padding: 2rem;
    background: #f8f9fa;
    min-height: calc(100vh - 80px);
  }
  
  @media (max-width: 768px) {
    .admin-sidebar {
      width: 100%;
      position: relative;
      height: auto;
    }
    
    .admin-content {
      margin-left: 0;
      padding: 1rem;
    }
    
    .nav-menu {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
      padding: 1rem;
    }
    
    .nav-link {
      flex-direction: column;
      text-align: center;
      padding: 1rem 0.5rem;
      border-radius: 0.5rem;
      border-left: none;
      min-height: 80px;
    }
    
    .nav-link.active {
      background: #2563eb;
      color: white;
    }
    
    .nav-icon {
      margin-right: 0;
      margin-bottom: 0.25rem;
    }
  }
</style>