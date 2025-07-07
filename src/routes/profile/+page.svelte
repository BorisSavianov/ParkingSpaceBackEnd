<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { authenticatedFetch, onAuthStateChange } from '$lib/auth.js';
  import Header from '$lib/components/Header.svelte';

  let user = null;
  let loading = true;
  let editing = false;
  let saving = false;
  let error = '';
  let success = '';
  let authUnsubscribe = null;
  let isAuthChecked = false;

  // Form data for editing
  let editForm = {
    firstName: '',
    lastName: '',
    department: '',
    username: ''
  };

  const allowedDepartments = ['frontend', 'backend', 'mobile', 'qa'];

  onMount(async () => {
    loadProfile();
  });

  async function loadProfile() {
    try {
      loading = true;
      error = '';
      
      const response = await authenticatedFetch('/api/user/profile');
      const result = await response.json();
        
      if (result.success) {
        user = result.user;
        // Initialize edit form with current data
        editForm = {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          department: user.department || '',
          username: user.username || ''
        };
      } else {
        error = result.error || 'Failed to load profile';
      }
    } catch (err) {
      error = 'Network error: ' + err.message;
    } finally {
      isAuthChecked = true;
      loading = false;
    }
  }

  function startEditing() {
    editing = true;
    error = '';
    success = '';
  }

  function cancelEditing() {
    editing = false;
    error = '';
    success = '';
    // Reset form to original values
    editForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      department: user.department || '',
      username: user.username || ''
    };
  }

  async function saveProfile() {
    if (!validateForm()) return;

    try {
      saving = true;
      error = '';
      success = '';

      const response = await authenticatedFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });

      const result = await response.json();

      if (result.success) {
        user = result.user;
        editing = false;
        success = 'Profile updated successfully!';
      } else {
        error = result.error || 'Failed to update profile';
      }
    } catch (err) {
      error = 'Network error: ' + err.message;
    } finally {
      saving = false;
    }
  }

  function validateForm() {
    if (!editForm.firstName.trim()) {
      error = 'First name is required';
      return false;
    }
    if (!editForm.lastName.trim()) {
      error = 'Last name is required';
      return false;
    }
    if (!editForm.username.trim()) {
      error = 'Username is required';
      return false;
    }
    if (!editForm.department) {
      error = 'Department is required';
      return false;
    }
    if (!allowedDepartments.includes(editForm.department)) {
      error = 'Invalid department selected';
      return false;
    }
    if (editForm.firstName.length > 30) {
      error = 'First name must be 30 characters or less';
      return false;
    }
    if (editForm.lastName.length > 50) {
      error = 'Last name must be 50 characters or less';
      return false;
    }
    if (editForm.username.length > 50) {
      error = 'Username must be 50 characters or less';
      return false;
    }
    return true;
  }

  async function deactivateAccount() {
    if (!confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authenticatedFetch('/api/user/profile', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('Account deactivated successfully. You will be redirected to the login page.');
        goto('/login');
      } else {
        error = result.error || 'Failed to deactivate account';
      }
    } catch (err) {
      error = 'Network error: ' + err.message;
    }
  }
</script>

<svelte:head>
  <title>Profile - ReserveParkingSpace</title>
</svelte:head>

<Header/>



<!-- Main Content -->
<div class="main-content">
  {#if !isAuthChecked}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Checking authentication...</p>
    </div>
  {:else if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>
  {:else if error && !user}
    <div class="card">
      <div class="card-content">
        <div class="alert alert-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6"/>
            <path d="M9 9l6 6"/>
          </svg>
          {error}
        </div>
      </div>
    </div>
  {:else if user}
    {#if success}
      <div class="success-section">
        <div class="card success-card">
          <div class="card-content">
            <div class="alert alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3l8-8"/>
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.66 0 3.22.46 4.56 1.25"/>
              </svg>
              {success}
            </div>
          </div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="card">
        <div class="card-content">
          <div class="alert alert-error">
            
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6"/>
              <path d="M9 9l6 6"/>
            </svg>
            {error}
          </div>
        </div>
      </div>
    {/if}

    <!-- Profile Card -->
    <div class="card">
      <div class="card-header card-header-grid">
        <div >
        <h2 class="card-title">
          {editing ? 'Edit Profile' : 'Profile Information'}
        </h2>
        <p class="card-subtitle">
          {editing ? 'Update your personal information' : 'View and manage your account details'}
        </p>
      </div>
        {#if !editing && user}
      <button class="edit-button" on:click={startEditing}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    {/if}
      </div>
      <div class="card-content">
        {#if editing}
          <!-- Edit Form -->
          <form on:submit|preventDefault={saveProfile} class="profile-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="firstName" class="form-label">First Name</label>
                <input
                  id="firstName"
                  type="text"
                  bind:value={editForm.firstName}
                  maxlength="30"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="lastName" class="form-label">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  bind:value={editForm.lastName}
                  maxlength="50"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="username" class="form-label">Username</label>
                <input
                  id="username"
                  type="text"
                  bind:value={editForm.username}
                  maxlength="50"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="department" class="form-label">Department</label>
                <select id="department" bind:value={editForm.department} required class="form-select">
                  <option value="">Select Department</option>
                  {#each allowedDepartments as dept}
                    <option value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                  {/each}
                </select>
              </div>

              <div class="form-group form-group-full">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  class="form-input form-input-disabled"
                />
                <small class="form-help">Email cannot be changed</small>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={saving}>
                {#if saving}
                  <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Saving...
                {:else}
                  <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3l8-8"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.66 0 3.22.46 4.56 1.25"/>
                  </svg>
                  Save Changes
                {/if}
              </button>
              <button type="button" class="btn btn-secondary" on:click={cancelEditing}>
                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18"/>
                  <path d="M6 6l12 12"/>
                </svg>
                Cancel
              </button>
            </div>
          </form>
        {:else}
          <!-- View Mode -->
          <div class="profile-info">
            <div class="info-grid">
              <div class="info-group">
                <label class="info-label">Full Name</label>
                <p class="info-value">{user.firstName} {user.lastName}</p>
              </div>

              <div class="info-group">
                <label class="info-label">Username</label>
                <p class="info-value">{user.username}</p>
              </div>

              <div class="info-group">
                <label class="info-label">Email</label>
                <p class="info-value">{user.email}</p>
              </div>

              <div class="info-group">
                <label class="info-label">Department</label>
                <div class="badge-container">
                  <span class="badge department-{user.department}">
                    {user.department?.charAt(0).toUpperCase() + user.department?.slice(1)}
                  </span>
                </div>
              </div>

              <div class="info-group">
                <label class="info-label">Role</label>
                <div class="badge-container">
                  <span class="badge role-{user.role}">
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </span>
                </div>
              </div>

              {#if user.createdAt}
                <div class="info-group">
                  <label class="info-label">Member Since</label>
                  <p class="info-value">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              {/if}

              {#if user.updatedAt}
                <div class="info-group">
                  <label class="info-label">Last Updated</label>
                  <p class="info-value">{new Date(user.updatedAt).toLocaleDateString()}</p>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if !editing}
      <!-- Danger Zone -->
      <div class="card danger-card">
        <div class="card-header">
          <h2 class="card-title danger-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Danger Zone
          </h2>
          <p class="card-subtitle">Once you deactivate your account, there is no going back. Please be certain.</p>
        </div>
        <div class="card-content">
          <button class="btn btn-danger" on:click={deactivateAccount}>
            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Deactivate Account
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    min-height: 100vh;
  }

  /* Header */
  .header {
    background: linear-gradient(90deg, #2563eb 0%, #4338ca 100%);
    color: white;
    padding: 1.5rem 1rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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
  }

  .header-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .header-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .header-button:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Main Content */
  .main-content {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }

  .spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Card */
  .card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .card-header  {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .card-header-grid{
    display:  grid;
    grid-template-columns: auto auto;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .card-content {
    padding: 1.5rem;
  }

  /* Success Section */
  .success-section {
    animation: fadeIn 0.3s ease-out;
  }

  .success-card {
    background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #86efac;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Alerts */
  .alert {
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  /* Forms */
  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group-full {
    grid-column: 1 / -1;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input,
  .form-select {
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
    background: white;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input-disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .form-help {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f3f4f6;
  }

  @media (max-width: 768px) {
    .form-actions {
      flex-direction: column;
    }
  }

  /* Profile Info */
  .profile-info {
    width: 100%;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .info-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  .info-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-value {
    font-size: 0.875rem;
    color: #1f2937;
    font-weight: 500;
    margin: 0;
  }

  /* Badges */
  .badge-container {
    display: flex;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .department-frontend {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .department-backend {
    background: #f3e8ff;
    color: #7c3aed;
  }

  .department-mobile {
    background: #ecfdf5;
    color: #059669;
  }

  .department-qa {
    background: #fff7ed;
    color: #ea580c;
  }

  .role-employee {
    background: #f8fafc;
    color: #64748b;
  }

  .role-admin {
    background: #fef2f2;
    color: #dc2626;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    justify-content: center;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .btn-primary {
    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .btn-secondary {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .btn-danger {
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  /* Danger Zone */
  .danger-card {
    border: 1px solid #fecaca;
    background: linear-gradient(90deg, #fef2f2 0%, #fef2f2 100%);
  }

  .danger-title {
    color: #dc2626;
  }

  .edit-button{
    color:#1d4ed8;
    background-color: transparent;
    border: 0;
    width: 50px;
    place-self: end;
    align-self: center;
  }

  .edit-button:hover{
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .main-content {
      padding: 1rem;
    }

    .header-content {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .card-header,
    .card-content {
      padding: 1rem;
    }
  }
</style>