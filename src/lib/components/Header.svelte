<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { theme, toggleTheme } from '$lib/stores/theme';
  import { goto } from '$app/navigation';
  
  export let redirect;
  let isScrolled = false;
  let isMenuOpen = false;
  let windowWidth = 1024;
  
  // Responsive header heights
  $: headerHeight = windowWidth > 768 ? 100 : 70;
  $: scrolledHeight = windowWidth > 768 ? 80 : 60;
  
  onMount(() => {
    windowWidth = window.innerWidth;
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  });
  
  function handleScroll() {
    isScrolled = window.scrollY > 20;
  }
  
  function handleResize() {
    windowWidth = window.innerWidth;
    if (windowWidth > 768) isMenuOpen = false;
  }
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  
</script>

<svelte:head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
    
    :global(body.light) {
      background-color: #e1f5fe;
      color: #333;
      font-family: 'Poppins', sans-serif;
      margin: 0;
      transition: background-color 0.3s ease;
    }
    
    :global(body.dark) {
      background-color: #0a192f;
      color: #f8f8f8;
      font-family: 'Poppins', sans-serif;
      margin: 0;
      transition: background-color 0.3s ease;
    }
    
    :global(.light a) {
      color: #3a6bc8;
      font-family: 'Poppins', sans-serif;
    }
    
    :global(.dark a) {
      color: #4fc3f7;
      font-family: 'Poppins', sans-serif;
    }
    
    :global(a:hover) {
      color: #4fc3f7;
    }
  </style>
</svelte:head>

<header 
  class={`header ${isScrolled ? 'scrolled' : ''}`}
  style={`height: ${isScrolled ? scrolledHeight : headerHeight}px`}
>
  <div class="header-container">
    <!-- Logo -->
    <div class="logo-container">
      
      <img 
        src="/logo.png" 
        alt="Company Logo" 
        class="logo" 
        in:fade={{ duration: 500 }}
        
       on:click={() => { if (redirect === true) goto('/'); }}

        
        />
    </div>
    
    <!-- Desktop Navigation -->
    <nav class="desktop-nav">
      <button on:click={toggleTheme} class="nav-button icon-button" aria-label="Toggle theme">
        <img src="/dark-mode.png" alt="Theme" class="button-icon bri" />
      </button>
      {#if redirect === true}
      <a on:click={goto('/admin')} tyle="fill: white;" class="nav-button icon-button" aria-label="User profile">
        <img src="/admin.svg" alt="Profile" class="button-icon" />
      </a>
      
      <a on:click={goto('/profile')} class="nav-button icon-button" aria-label="User profile">
        <img src="/user.png" alt="Profile" class="button-icon" />
      </a>
      {/if}
    </nav>
    
    <!-- Mobile Menu Toggle -->
    <button class="menu-toggle" on:click={toggleMenu} aria-label="Menu">
      <div class="hamburger" class:open={isMenuOpen} />
    </button>
  </div>
  
  <!-- Mobile Dropdown Menu -->
  <div class="mobile-menu" class:open={isMenuOpen}>
    <button on:click={() => {
      toggleTheme();
      toggleMenu();
    }} class="mobile-nav-button icon-button" aria-label="Toggle theme">
      <img src="/dark-mode.png" alt="Theme" class="button-icon bri" />
    </button>{#if redirect === true}
    <a on:click={goto('/admin')} class="mobile-nav-button icon-button" aria-label="User profile">
      <img src="/admin.svg" alt="Profile" class="button-icon " />
    </a>
    <a on:click={goto('/profile')} class="mobile-nav-button icon-button" aria-label="User profile">
      <img src="/user.png" alt="Profile" class="button-icon " />
    </a>{/if}
  </div>
</header>

<style>
  /* Base Header Styles */
  .header {
    z-index: 100; /* Променено от 1000 на 100 */
    background: linear-gradient(90deg, #2563eb 0%, #4338ca 100%);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    font-family: 'Poppins', sans-serif;
  }
  
  .header.scrolled {
    background: linear-gradient(90deg, #2563eb 0%, #2563eb 100%);
  }
  
  /* Header Container */
  .header-container {
    max-width: 1200px;
    height: 100%;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  /* Logo */
  .logo-container {
    height: 100%;
    display: flex;
    align-items: center;
  }
  
  .logo {
    height: 60%;
    width: auto;
    transition: all 0.3s ease;
  }
  
  /* Desktop Navigation */
  .desktop-nav {
    display: flex;
    gap: 1.5rem;
  }
  
  .nav-button {
    color: white;
    background-color: transparent;
    border: none;
    text-decoration: none;
    font-weight: 500;
    font-family: 'Poppins', sans-serif;
    padding: 0.5rem;
    transition: all 0.3s ease;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
  }
  
  .nav-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  /* Icon Buttons */
  .icon-button {
    background: none !important;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .button-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    transition: all 0.3s ease;
  }
  
  .bri {
    filter: brightness(0) invert(1);
  }
  
  /* Mobile Menu Toggle */
  .menu-toggle {
    display: none;
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
  }
  
  .hamburger, .hamburger::before, .hamburger::after {
    content: '';
    display: block;
    width: 24px;
    height: 2px;
    background: white;
    transition: all 0.3s ease;
  }
  
  .hamburger::before {
    transform: translateY(-8px);
  }
  
  .hamburger::after {
    transform: translateY(6px);
  }
  
  .hamburger.open {
    background: transparent;
  }
  
  .hamburger.open::before {
    transform: rotate(45deg);
  }
  
  .hamburger.open::after {
    transform: rotate(-45deg);
  }
  
  /* Mobile Menu */
  .mobile-menu {
    position: absolute;
    left: 0;
    width: 100%;
    background: linear-gradient(135deg, #3a6bc8 0%, #4fc3f7 100%);
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    z-index: 100; /* Добавено */
  }
  
  .mobile-menu.open {
    max-height: 300px;
  }
  
  .mobile-nav-button {
    display: flex;
    align-items: center;
    padding: 1rem 2rem;
    color: white;
    text-decoration: none;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    transition: background 0.3s ease;
    gap: 0.5rem;
  }
  
  .mobile-nav-button:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .desktop-nav {
      display: none;
    }
    
    .menu-toggle {
      display: block;
    }
    
    .header-container {
      padding: 0 1.5rem;
    }
    
    .button-icon {
      width: 20px;
      height: 20px;
    }
  }
  
  @media (max-width: 480px) {
    .header-container {
      padding: 0 1rem;
    }
    
    .mobile-nav-button {
      padding: 0.8rem 1.5rem;
    }
    
    .button-icon {
      width: 18px;
      height: 18px;
    }
  }
</style>