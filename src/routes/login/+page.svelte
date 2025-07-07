<script>
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user.js';
  import { onMount } from 'svelte';

  let registerData = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    department: '',
    username: ''
  };

  let loginData = {
    email: '',
    password: ''
  };

  let isLoginMode = true;
  let loading = false;
  let errorMessage = '';

  function toggleMode() {
    isLoginMode = !isLoginMode;
    errorMessage = '';
    // Reset forms
    registerData = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      department: '',
      username: ''
    };
    loginData = {
      email: '',
      password: ''
    };
  }

  async function handleRegister(event) {
    event.preventDefault();
    loading = true;
    errorMessage = '';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const result = await res.json();

      if (result.success) {
        localStorage.setItem('token', result.token);
        user.set(result.user);
        goto('/');
      } else {
        errorMessage = result.error || 'Registration failed. Please try again.';
      }
    } catch (error) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } finally {
      loading = false;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    loading = true;
    errorMessage = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const result = await res.json();

      if (result.success) {
        user.set(result.user);
        localStorage.setItem('token', result.token);
        goto('/');
      } else {
        errorMessage = result.error || 'Login failed. Please check your credentials.';
      }
    } catch (error) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally validate token with server
      goto('/');
    }
  });
</script>

<svelte:head>
  <title>{isLoginMode ? 'Login' : 'Sign Up'} - ReserveParkingSpace</title>
  <meta name="description" content="Secure login and registration for the parking reservation system" />
</svelte:head>

<div class="page-container">
  <!-- Background decoration -->
  <div class="background-decoration"></div>
  
  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <div class="header-left">
        <div class="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7v10c0 5.55 3.84 10 9 10s9-4.45 9-10V7l-10-5z"/>
            <path d="M12 8v8"/>
            <path d="M8 12h8"/>
          </svg>
        </div>
        <h1 class="header-title">ReserveParkingSpace</h1>
      </div>
      <div class="header-subtitle">
        {isLoginMode ? 'Welcome back!' : 'Join us today!'}
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <div class="auth-container">
      <div class="auth-card">
        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button 
            class="toggle-button {isLoginMode ? 'active' : ''}" 
            on:click={() => isLoginMode && toggleMode()}
            class:active={isLoginMode}
          >
            Login
          </button>
          <button 
            class="toggle-button {!isLoginMode ? 'active' : ''}" 
            on:click={() => !isLoginMode && toggleMode()}
            class:active={!isLoginMode}
          >
            Sign Up
          </button>
        </div>

        <!-- Error Message -->
        {#if errorMessage}
          <div class="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {errorMessage}
          </div>
        {/if}

        <!-- Login Form -->
        {#if isLoginMode}
          <div class="form-container">
            <div class="form-header">
              <h2 class="form-title">Welcome Back</h2>
              <p class="form-subtitle">Sign in to your account to continue</p>
            </div>
            
            <form on:submit={handleLogin} class="auth-form">
              <div class="form-group">
                <label for="login-email" class="form-label">Email Address</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input 
                    id="login-email"
                    type="email" 
                    bind:value={loginData.email} 
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="login-password" class="form-label">Password</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input 
                    id="login-password"
                    type="password" 
                    bind:value={loginData.password} 
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} class="submit-button">
                {#if loading}
                  <div class="loading-spinner"></div>
                  Signing in...
                {:else}
                  Sign In
                {/if}
              </button>
            </form>

            <div class="form-footer">
              <p class="switch-text">
                Don't have an account? 
                <button type="button" on:click={toggleMode} class="switch-button">
                  Sign up here
                </button>
              </p>
            </div>
          </div>
        {:else}
          <!-- Register Form -->
          <div class="form-container">
            <div class="form-header">
              <h2 class="form-title">Create Account</h2>
              <p class="form-subtitle">Join our parking reservation system</p>
            </div>
            
            <form on:submit={handleRegister} class="auth-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="register-firstname" class="form-label">First Name</label>
                  <div class="input-container">
                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input 
                      id="register-firstname"
                      type="text" 
                      bind:value={registerData.firstName} 
                      placeholder="First name"
                      required
                      disabled={loading}
                      class="form-input"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label for="register-lastname" class="form-label">Last Name</label>
                  <div class="input-container">
                    <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input 
                      id="register-lastname"
                      type="text" 
                      bind:value={registerData.lastName} 
                      placeholder="Last name"
                      required
                      disabled={loading}
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="register-username" class="form-label">Username</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  <input 
                    id="register-username"
                    type="text" 
                    bind:value={registerData.username} 
                    placeholder="Choose a username"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="register-department" class="form-label">Department</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 21h18"/>
                    <path d="M5 21V7l8-4v18"/>
                    <path d="M19 21V11l-6-4"/>
                  </svg>
                  <input 
                    id="register-department"
                    type="text" 
                    bind:value={registerData.department} 
                    placeholder="Your department"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="register-email" class="form-label">Email Address</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input 
                    id="register-email"
                    type="email" 
                    bind:value={registerData.email} 
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="register-password" class="form-label">Password</label>
                <div class="input-container">
                  <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input 
                    id="register-password"
                    type="password" 
                    bind:value={registerData.password} 
                    placeholder="Create a password"
                    required
                    disabled={loading}
                    class="form-input"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} class="submit-button">
                {#if loading}
                  <div class="loading-spinner"></div>
                  Creating account...
                {:else}
                  Create Account
                {/if}
              </button>
            </form>

            <div class="form-footer">
              <p class="switch-text">
                Already have an account? 
                <button type="button" on:click={toggleMode} class="switch-button">
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .page-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    position: relative;
  }

  .background-decoration {
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(67, 56, 202, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  /* Header */
  .header {
    background: linear-gradient(90deg, #2563eb 0%, #4338ca 100%);
    color: white;
    padding: 1.5rem 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1;
  }

  .header-content {
    max-width: 64rem;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .header-subtitle {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.8);
  }

  /* Main Content */
  .main-content {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 120px);
    padding: 2rem 1rem;
    position: relative;
    z-index: 1;
  }

  .auth-container {
    width: 100%;
    max-width: 32rem;
  }

  .auth-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    animation: slideUp 0.6s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Mode Toggle */
  .mode-toggle {
    display: flex;
    background: #f3f4f6;
    border-radius: 0.5rem;
    padding: 0.25rem;
    margin: 1.5rem 1.5rem 0;
  }

  .toggle-button {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: transparent;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    color: #6b7280;
  }

  .toggle-button.active {
    background: white;
    color: #2563eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  /* Error Message */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin: 1rem 1.5rem;
    font-size: 0.875rem;
  }

  /* Form Container */
  .form-container {
    padding: 1.5rem;
  }

  .form-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .form-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
  }

  /* Form */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 0.75rem;
    color: #6b7280;
    pointer-events: none;
    z-index: 1;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
    background: white;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .submit-button {
    background: linear-gradient(90deg, #2563eb 0%, #4338ca 100%);
    color: white;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .submit-button:hover:not(:disabled) {
    background: linear-gradient(90deg, #1d4ed8 0%, #3730a3 100%);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Form Footer */
  .form-footer {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .switch-text {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .switch-button {
    background: none;
    border: none;
    color: #2563eb;
    cursor: pointer;
    font-weight: 500;
    text-decoration: underline;
    font-size: 0.875rem;
  }

  .switch-button:hover {
    color: #1d4ed8;
  }

  /* Responsive Design */
  @media (max-width: 640px) {
    .header {
      padding: 1rem;
    }

    .header-content {
      flex-direction: column;
      gap: 0.5rem;
    }

    .main-content {
      padding: 1rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-container {
      padding: 1rem;
    }

    .mode-toggle {
      margin: 1rem 1rem 0;
    }

    .error-message {
      margin: 1rem;
    }
  }
</style>