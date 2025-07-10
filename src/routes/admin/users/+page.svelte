<!-- src/routes/admin/users/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { authenticatedFetch } from '$lib/auth.js';
  import { user } from '$lib/stores/user.js';
  
  let users = [];
  let loading = true;
  let error = null;
  let selectedUser = null;
  let showUserModal = false;
  let showDeleteModal = false;
  let userToDelete = null;
  let searchTerm = '';
  let filterRole = 'all';
  let filterDepartment = 'all';
  let sortBy = 'createdAt';
  let sortOrder = 'desc';
  let currentPage = 1;
  let pageSize = 10;
  let totalUsers = 0;
  let hasMore = true;
  let bulkActions = [];
  let selectedUsers = new Set();
  let showBulkActions = false;
  
  // User form data
  let userForm = {
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    department: '',
    role: 'user',
    isActive: true
  };
  
  let userFormErrors = {};
  let isEditing = false;
  let formSubmitting = false;
  
  const departments = ['frontend', 'backend', 'mobile', 'qa'];
  const roles = ['user', 'admin'];
  
  // Reactive filtering
  $: filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    
    return matchesSearch && matchesRole && matchesDepartment;
  });
  
  $: sortedUsers = [...filteredUsers].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  $: paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  
  $: totalPages = Math.ceil(sortedUsers.length / pageSize);
  
  onMount(async () => {
    await loadUsers();
  });
  
  async function loadUsers() {
    try {
      loading = true;
      error = null;
      
      const response = await authenticatedFetch('/api/admin/users');
      const data = await response.json();
      
      if (data.success) {
        users = data.users;
        totalUsers = data.users.length;
      } else {
        error = data.error || 'Failed to load users';
      }
    } catch (err) {
      console.error('Users loading error:', err);
      error = 'Network error loading users';
    } finally {
      loading = false;
    }
  }
  
  function openUserModal(user = null) {
    if (user) {
      isEditing = true;
      selectedUser = user;
      userForm = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        department: user.department || '',
        role: user.role || 'user',
        isActive: user.isActive !== false
      };
    } else {
      isEditing = false;
      selectedUser = null;
      userForm = {
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        department: '',
        role: 'user',
        isActive: true
      };
    }
    
    userFormErrors = {};
    showUserModal = true;
  }
  
  function closeUserModal() {
    showUserModal = false;
    selectedUser = null;
    userForm = {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      department: '',
      role: 'user',
      isActive: true
    };
    userFormErrors = {};
  }
  
  function validateUserForm() {
    const errors = {};
    
    if (!userForm.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (userForm.firstName.length > 30) {
      errors.firstName = 'First name must be 30 characters or less';
    }
    
    if (!userForm.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (userForm.lastName.length > 50) {
      errors.lastName = 'Last name must be 50 characters or less';
    }
    
    if (!userForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!userForm.username.trim()) {
      errors.username = 'Username is required';
    } else if (userForm.username.length > 50) {
      errors.username = 'Username must be 50 characters or less';
    }
    
    if (!userForm.department) {
      errors.department = 'Department is required';
    }
    
    if (!userForm.role) {
      errors.role = 'Role is required';
    }
    
    return errors;
  }
  
  async function saveUser() {
    try {
      formSubmitting = true;
      userFormErrors = validateUserForm();
      
      if (Object.keys(userFormErrors).length > 0) {
        return;
      }
      
      const endpoint = isEditing ? '/api/admin/users' : '/api/admin/users';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        ...userForm,
        ...(isEditing && { userId: selectedUser.id })
      };
      
      const response = await authenticatedFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadUsers();
        closeUserModal();
        // You might want to show a success message here
      } else {
        if (data.fieldErrors) {
          userFormErrors = data.fieldErrors;
        } else {
          error = data.error || 'Failed to save user';
        }
      }
    } catch (err) {
      console.error('User save error:', err);
      error = 'Network error saving user';
    } finally {
      formSubmitting = false;
    }
  }
  
  function confirmDeleteUser(user) {
    userToDelete = user;
    showDeleteModal = true;
  }
  
  async function deleteUser() {
    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userToDelete.id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadUsers();
        showDeleteModal = false;
        userToDelete = null;
      } else {
        error = data.error || 'Failed to delete user';
      }
    } catch (err) {
      console.error('User deletion error:', err);
      error = 'Network error deleting user';
    }
  }
  
  async function toggleUserStatus(user) {
    try {
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          isActive: !user.isActive
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadUsers();
      } else {
        error = data.error || 'Failed to update user status';
      }
    } catch (err) {
      console.error('User status update error:', err);
      error = 'Network error updating user status';
    }
  }
  
  function toggleUserSelection(userId) {
    if (selectedUsers.has(userId)) {
      selectedUsers.delete(userId);
    } else {
      selectedUsers.add(userId);
    }
    selectedUsers = selectedUsers;
    showBulkActions = selectedUsers.size > 0;
  }
  
  function selectAllUsers() {
    if (selectedUsers.size === paginatedUsers.length) {
      selectedUsers.clear();
    } else {
      selectedUsers = new Set(paginatedUsers.map(u => u.id));
    }
    selectedUsers = selectedUsers;
    showBulkActions = selectedUsers.size > 0;
  }
  
  async function performBulkAction(action) {
    try {
      const userIds = Array.from(selectedUsers);
      
      const response = await authenticatedFetch('/api/admin/users/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds,
          action
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await loadUsers();
        selectedUsers.clear();
        selectedUsers = selectedUsers;
        showBulkActions = false;
      } else {
        error = data.error || 'Failed to perform bulk action';
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      error = 'Network error performing bulk action';
    }
  }
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function getRoleColor(role) {
    return role === 'admin' ? '#dc2626' : '#059669';
  }
  

  
  function getDepartmentColor(department) {
    const colors = {
      frontend: '#3b82f6',
      backend: '#10b981',
      mobile: '#f59e0b',
      qa: '#8b5cf6'
    };
    return colors[department] || '#6b7280';
  }
  
  
  function resetFilters() {
    searchTerm = '';
    filterRole = 'all';
    filterDepartment = 'all';
    sortBy = 'createdAt';
    sortOrder = 'desc';
    currentPage = 1;
  }
</script>

<svelte:head>
  <title>User Management - Admin Panel</title>
</svelte:head>

<div class="users-page">
  <!-- Header -->
  <div class="page-header">
    <div class="header-content">
      <h1>User Management</h1>
      <div class="header-actions">
        <button class="btn btn-primary" on:click={() => openUserModal()}>
          Add User
        </button>
        <button class="btn btn-secondary" on:click={loadUsers} disabled={loading}>
          Refresh
        </button>
      </div>
    </div>
  </div>
  
  <!-- Filters and Search -->
  <div class="filters-section">
    <div class="filters-grid">
      <div class="search-box">
        <input
          type="text"
          placeholder="Search users..."
          bind:value={searchTerm}
          class="search-input"
        />
      </div>
      
      <select bind:value={filterRole} class="filter-select">
        <option value="all">All Roles</option>
        <option value="user">Users</option>
        <option value="admin">Admins</option>
      </select>
      
      <select bind:value={filterDepartment} class="filter-select">
        <option value="all">All Departments</option>
        {#each departments as dept}
          <option value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
        {/each}
      </select>
      
      <select bind:value={sortBy} class="filter-select">
        <option value="createdAt">Created Date</option>
        <option value="firstName">First Name</option>
        <option value="lastName">Last Name</option>
        <option value="email">Email</option>
        <option value="department">Department</option>
        <option value="role">Role</option>
      </select>
      
      <select bind:value={sortOrder} class="filter-select">
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
      
      <button class="btn btn-outline" on:click={resetFilters}>
        Clear Filters
      </button>
    </div>
  </div>
  
  <!-- Bulk Actions -->
  {#if showBulkActions}
    <div class="bulk-actions">
      <div class="bulk-info">
        <span>{selectedUsers.size} users selected</span>
      </div>
      <div class="bulk-buttons">
        <button 
          class="btn btn-small btn-success" 
          on:click={() => performBulkAction('activate')}
        >
          Activate
        </button>
        <button 
          class="btn btn-small btn-warning" 
          on:click={() => performBulkAction('deactivate')}
        >
          Deactivate
        </button>
        <button 
          class="btn btn-small btn-danger" 
          on:click={() => performBulkAction('delete')}
        >
          Delete
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Users Table -->
  <div class="table-section">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading users...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <h3>Error</h3>
        <p>{error}</p>
        <button class="btn btn-primary" on:click={loadUsers}>Try Again</button>
      </div>
    {:else if sortedUsers.length === 0}
      <div class="empty-state">
        <h3>No users found</h3>
        <p>No users match your current filters.</p>
        <button class="btn btn-primary" on:click={resetFilters}>Clear Filters</button>
      </div>
    {:else}
      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  checked={selectedUsers.size === paginatedUsers.length && paginatedUsers.length > 0}
                  on:change={selectAllUsers}
                />
              </th>
              <th>User</th>
              <th>Contact</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each paginatedUsers as user}
              <tr class="user-row" class:inactive={user.isActive === false}>
                <td>
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.has(user.id)}
                    on:change={() => toggleUserSelection(user.id)}
                  />
                </td>
                <td>
                  <div class="user-info">
                    <div class="user-avatar">
                      {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                      <div class="user-name">{user.firstName} {user.lastName}</div>
                      <div class="user-username">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="contact-info">
                    <div class="user-email">{user.email}</div>
                  </div>
                </td>
                <td>
                  <div class="department-badge" style="background-color: {getDepartmentColor(user.department)}20; color: {getDepartmentColor(user.department)};">

                    {user.department}
                  </div>
                </td>
                <td>
                  <div class="role-badge" style="background-color: {getRoleColor(user.role)}20; color: {getRoleColor(user.role)};">
                    {user.role}
                  </div>
                </td>
                <td>
                  <button 
                    class="status-toggle {user.isActive !== false ? 'active' : 'inactive'}"
                    on:click={() => toggleUserStatus(user)}
                  >
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>
                  <div class="date-info">
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                <td>
                  <div class="action-buttons">
                    <button 
                      class="btn btn-small btn-outline" 
                      on:click={() => openUserModal(user)}
                      title="Edit User"
                    >
                      ✏️
                    </button>
                    <button 
                      class="btn btn-small btn-danger" 
                      on:click={() => confirmDeleteUser(user)}
                      title="Delete User"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button 
            class="btn btn-outline" 
            disabled={currentPage === 1}
            on:click={() => currentPage = 1}
          >
            First
          </button>
          <button 
            class="btn btn-outline" 
            disabled={currentPage === 1}
            on:click={() => currentPage--}
          >
            Previous
          </button>
          
          <span class="page-info">
            Page {currentPage} of {totalPages} ({sortedUsers.length} users)
          </span>
          
          <button 
            class="btn btn-outline" 
            disabled={currentPage === totalPages}
            on:click={() => currentPage++}
          >
            Next
          </button>
          <button 
            class="btn btn-outline" 
            disabled={currentPage === totalPages}
            on:click={() => currentPage = totalPages}
          >
            Last
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- User Modal -->
{#if showUserModal}
  <div class="modal-overlay" on:click={closeUserModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>{isEditing ? 'Edit User' : 'Add New User'}</h3>
        <button class="modal-close" on:click={closeUserModal}>×</button>
      </div>
      
      <form class="user-form" on:submit|preventDefault={saveUser}>
        <div class="form-grid">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              bind:value={userForm.firstName}
              class="form-input"
              class:error={userFormErrors.firstName}
              maxlength="30"
              required
            />
            {#if userFormErrors.firstName}
              <span class="error-message">{userFormErrors.firstName}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              bind:value={userForm.lastName}
              class="form-input"
              class:error={userFormErrors.lastName}
              maxlength="50"
              required
            />
            {#if userFormErrors.lastName}
              <span class="error-message">{userFormErrors.lastName}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              bind:value={userForm.email}
              class="form-input"
              class:error={userFormErrors.email}
              required
            />
            {#if userFormErrors.email}
              <span class="error-message">{userFormErrors.email}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              bind:value={userForm.username}
              class="form-input"
              class:error={userFormErrors.username}
              maxlength="50"
              required
            />
            {#if userFormErrors.username}
              <span class="error-message">{userFormErrors.username}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="department">Department</label>
            <select
              id="department"
              bind:value={userForm.department}
              class="form-select"
              class:error={userFormErrors.department}
              required
            >
              <option value="">Select Department</option>
              {#each departments as dept}
                <option value={dept}>{dept.charAt(0).toUpperCase() + dept.slice(1)}</option>
              {/each}
            </select>
            {#if userFormErrors.department}
              <span class="error-message">{userFormErrors.department}</span>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="role">Role</label>
            <select
              id="role"
              bind:value={userForm.role}
              class="form-select"
              class:error={userFormErrors.role}
              required
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            {#if userFormErrors.role}
              <span class="error-message">{userFormErrors.role}</span>
            {/if}
          </div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={userForm.isActive}
            />
            Active User
          </label>
        </div>
        
        <div class="form-actions">
          <button 
            type="button" 
            class="btn btn-outline" 
            on:click={closeUserModal}
            disabled={formSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            disabled={formSubmitting}
          >
            {#if formSubmitting}
              <span class="spinner-small"></span>
              Saving...
            {:else}
              {isEditing ? 'Update User' : 'Create User'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
  <div class="modal-overlay" on:click={() => showDeleteModal = false}>
    <div class="modal-content small" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Confirm Delete</h3>
        <button class="modal-close" on:click={() => showDeleteModal = false}>×</button>
      </div>
      
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>{userToDelete?.firstName} {userToDelete?.lastName}</strong>?</p>
        <p class="warning-text">This action cannot be undone.</p>
      </div>
      
      <div class="modal-actions">
        <button 
          class="btn btn-outline" 
          on:click={() => showDeleteModal = false}
        >
          Cancel
        </button>
        <button 
          class="btn btn-danger" 
          on:click={deleteUser}
        >
          Delete User
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .users-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
  }
  
  .page-header {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .page-header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
  }
  
  .filters-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .filters-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr auto;
    gap: 1rem;
    align-items: center;
  }
  
  .search-box {
    position: relative;
  }
  
  .search-input {
    width: 75%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  
  .filter-select {
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
  }
  
  .bulk-actions {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .bulk-info {
    font-weight: 500;
    color: #92400e;
  }
  
  .bulk-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .table-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .users-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .users-table th,
  .users-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .users-table th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  
  .user-row.inactive {
    opacity: 0.6;
    background: #f3f4f6;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .user-name {
    font-weight: 600;
    color: #1f2937;
  }
  
  .user-username {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .user-email {
    color: #374151;
    font-size: 0.875rem;
  }
  
  .department-badge,
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
  }
  
  .status-toggle {
    border: none;
    background: none;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .status-toggle.active {
    background: #dcfce7;
    color: #166534;
  }
  
  .status-toggle.inactive {
    background: #fee2e2;
    color: #dc2626;
  }
  
  .status-toggle:hover {
    opacity: 0.8;
  }
  
  .date-info {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .page-info {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  /* Loading, Error, and Empty States */
  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 3rem;
  }
  
  .spinner {
    width: 3rem;
    height: 3rem;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  .spinner-small {
    width: 1rem;
    height: 1rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-right: 0.5rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .spinning {
    animation: spin 1s linear infinite;
  }
  
  .error-state h3 {
    color: #dc2626;
    margin-bottom: 1rem;
  }
  
  .empty-state h3 {
    color: #6b7280;
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: #9ca3af;
    margin-bottom: 1.5rem;
  }
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal-content {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }
  
  .modal-content.small {
    max-width: 400px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .modal-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0.25rem;
    line-height: 1;
  }
  
  .modal-close:hover {
    color: #374151;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .warning-text {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
  
  /* Form Styles */
  .user-form {
    padding: 1.5rem;
  }
  
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }
  
  .form-input,
  .form-select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
  }
  
  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-input.error,
  .form-select.error {
    border-color: #dc2626;
  }
  
  .error-message {
    color: #dc2626;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
  }
  
  .checkbox-label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    cursor: pointer;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  /* Button Styles */
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #4b5563;
  }
  
  .btn-outline {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .btn-outline:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  .btn-danger {
    background: #dc2626;
    color: white;
  }
  
  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }
  
  .btn-success {
    background: #059669;
    color: white;
  }
  
  .btn-success:hover:not(:disabled) {
    background: #047857;
  }
  
  .btn-warning {
    background: #f59e0b;
    color: white;
  }
  
  .btn-warning:hover:not(:disabled) {
    background: #d97706;
  }
  
  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }
  
  /* Responsive Design */
  @media (max-width: 1024px) {
    .filters-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
      
    .form-grid {
      grid-template-columns: 1fr;
    }
    
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .header-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
  
  @media (max-width: 768px) {
    .users-page {
      padding: 1rem;
    }
    
    .page-header,
    .filters-section,
    .table-section {
      padding: 1rem;
    }
    
    .users-table {
      font-size: 0.875rem;
    }
    
    .users-table th,
    .users-table td {
      padding: 0.75rem 0.5rem;
    }
    
    .user-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .user-avatar {
      width: 32px;
      height: 32px;
      font-size: 0.75rem;
    }
    
    .action-buttons {
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .pagination {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    
    .modal-content {
      margin: 0.5rem;
      max-height: 95vh;
    }
    
    .bulk-actions {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }
    
    .bulk-buttons {
      width: 100%;
      justify-content: flex-start;
    }
  }
  
  @media (max-width: 640px) {
    .page-header h1 {
      font-size: 1.5rem;
    }
    
    .users-table th:nth-child(n+6),
    .users-table td:nth-child(n+6) {
      display: none;
    }
    
    .table-container {
      overflow-x: scroll;
    }
    
    .users-table {
      min-width: 600px;
    }
  }
  
  
  
  /* Accessibility improvements */
  .btn:focus,
  .form-input:focus,
  .form-select:focus,
  .search-input:focus,
  .filter-select:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  .status-toggle:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  
  /* Print styles */
  @media print {
    .page-header,
    .filters-section,
    .pagination,
    .action-buttons,
    .bulk-actions {
      display: none;
    }
    
    .users-table {
      font-size: 0.75rem;
    }
    
    .users-table th,
    .users-table td {
      padding: 0.5rem;
    }
  }
  </style>