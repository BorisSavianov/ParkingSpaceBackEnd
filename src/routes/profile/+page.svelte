<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { authenticatedFetch, onAuthStateChange } from '$lib/auth.js';

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
  loadProfile()
  
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
  <title>Profile - Your App</title>
</svelte:head>

<div class="container">
  <div class="profile-header">
    <h1>My Profile</h1>
    {#if !editing}
      <button class="btn btn-primary" on:click={startEditing}>
        Edit Profile
      </button>
    {/if}
  </div>

  {#if !isAuthChecked}
    <div class="loading">
      <div class="spinner"></div>
      <p>Checking authentication...</p>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading profile...</p>
    </div>
  {:else if error}
    <div class="alert alert-error">
      {error}
    </div>
  {:else if user}
    <div class="profile-content">
      {#if success}
        <div class="alert alert-success">
          {success}
        </div>
      {/if}

      <div class="profile-card">
        {#if editing}
          <!-- Edit Form -->
          <form on:submit|preventDefault={saveProfile}>
            <div class="form-group">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                bind:value={editForm.firstName}
                maxlength="30"
                required
              />
            </div>

            <div class="form-group">
              <label for="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                bind:value={editForm.lastName}
                maxlength="50"
                required
              />
            </div>

            <div class="form-group">
              <label for="username">Username</label>
              <input
                id="username"
                type="text"
                bind:value={editForm.username}
                maxlength="50"
                required
              />
            </div>

            <div class="form-group">
              <label for="department">Department</label>
              <select id="department" bind:value={editForm.department} required>
                <option value="">Select Department</option>
                {#each allowedDepartments as dept}
                  <option value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                class="disabled"
              />
              <small>Email cannot be changed</small>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" class="btn btn-secondary" on:click={cancelEditing}>
                Cancel
              </button>
            </div>
          </form>
        {:else}
          <!-- View Mode -->
          <div class="profile-info">
            <div class="info-group">
              <label>Name</label>
              <p>{user.firstName} {user.lastName}</p>
            </div>

            <div class="info-group">
              <label>Username</label>
              <p>{user.username}</p>
            </div>

            <div class="info-group">
              <label>Email</label>
              <p>{user.email}</p>
            </div>

            <div class="info-group">
              <label>Department</label>
              <p class="department-badge department-{user.department}">
                {user.department?.charAt(0).toUpperCase() + user.department?.slice(1)}
              </p>
            </div>

            <div class="info-group">
              <label>Role</label>
              <p class="role-badge role-{user.role}">
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </p>
            </div>

            {#if user.createdAt}
              <div class="info-group">
                <label>Member Since</label>
                <p>{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            {/if}

            {#if user.updatedAt}
              <div class="info-group">
                <label>Last Updated</label>
                <p>{new Date(user.updatedAt).toLocaleDateString()}</p>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if !editing}
        <div class="danger-zone">
          <h3>Danger Zone</h3>
          <p>Once you deactivate your account, there is no going back. Please be certain.</p>
          <button class="btn btn-danger" on:click={deactivateAccount}>
            Deactivate Account
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .profile-header h1 {
    margin: 0;
    color: #333;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 2s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .alert {
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .alert-error {
    background-color: #fee;
    border: 1px solid #fcc;
    color: #c33;
  }

  .alert-success {
    background-color: #efe;
    border: 1px solid #cfc;
    color: #363;
  }

  .profile-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }

  .form-group input.disabled {
    background-color: #f8f9fa;
    cursor: not-allowed;
  }

  .form-group small {
    color: #666;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .info-group {
    margin-bottom: 1.5rem;
  }

  .info-group label {
    display: block;
    font-weight: 600;
    color: #666;
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
    text-transform: uppercase;
  }

  .info-group p {
    margin: 0;
    color: #333;
    font-size: 1rem;
  }

  .department-badge,
  .role-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .department-frontend { background: #e3f2fd; color: #1565c0; }
  .department-backend { background: #f3e5f5; color: #7b1fa2; }
  .department-mobile { background: #e8f5e8; color: #2e7d32; }
  .department-qa { background: #fff3e0; color: #ef6c00; }

  .role-employee { background: #f5f5f5; color: #666; }
  .role-admin { background: #ffebee; color: #c62828; }

  .danger-zone {
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 2rem;
  }

  .danger-zone h3 {
    color: #d32f2f;
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .danger-zone p {
    color: #666;
    margin-bottom: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3498db;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2980b9;
  }

  .btn-secondary {
    background: #95a5a6;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #7f8c8d;
  }

  .btn-danger {
    background: #e74c3c;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #c0392b;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .profile-header {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .form-actions {
      flex-direction: column;
    }

    .profile-card {
      padding: 1.5rem;
    }
  }
</style>