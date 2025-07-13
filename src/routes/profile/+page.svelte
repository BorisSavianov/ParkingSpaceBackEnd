<!-- src/routes/profile/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { authenticatedFetch, onAuthStateChange } from '$lib/auth.js';
  import Header from '$lib/components/Header.svelte';
  import { theme } from '$lib/stores/theme';

  let user = null;
  let loading = true;
  let editing = false;
  let saving = false;
  let error = '';
  let success = '';
  let authUnsubscribe = null;
  let isAuthChecked = false;
  let reservations = [];
  let reservationsError = '';
  let reservationsLoading = false;

  // Reservation management
  let selectedReservation = null;
  let showReservationModal = false;
  let reservationAction = null;
  let actionLoading = false;
  let actionError = '';
  let actionSuccess = '';

  // Form data for editing
  let editForm = {
    firstName: '',
    lastName: '',
    department: '',
    username: ''
  };

  const allowedDepartments = ['frontend', 'backend', 'mobile', 'qa'];

  onMount(async () => {
    await loadProfile();
  });

  async function loadProfile() {
    try {
      loading = true;
      error = '';
      
      const response = await authenticatedFetch('/api/user/profile');
      const result = await response.json();
        
      if (result.success) {
        user = result.user;
        reservations = result.reservations || [];
        
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

  async function logout() {
    localStorage.removeItem('token');
    window.location.href = "/login"
  }

  async function loadReservations() {
    try {
      reservationsLoading = true;
      reservationsError = '';
      
      const response = await authenticatedFetch('/api/user/profile');
      const result = await response.json();
        
      if (result.success) {
        reservations = result.reservations || [];
      } else {
        reservationsError = result.error || 'Failed to load reservations';
      }
    } catch (err) {
      reservationsError = 'Network error: ' + err.message;
    } finally {
      reservationsLoading = false;
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

  // Reservation management functions
  function openReservationModal(reservation, action) {
    selectedReservation = reservation;
    reservationAction = action;
    showReservationModal = true;
    actionError = '';
    actionSuccess = '';
  }

  function closeReservationModal() {
    showReservationModal = false;
    selectedReservation = null;
    reservationAction = null;
    actionError = '';
    actionSuccess = '';
  }

  async function executeReservationAction() {
    if (!selectedReservation || !reservationAction) return;

    try {
      actionLoading = true;
      actionError = '';
      actionSuccess = '';

      let endpoint, method, body;

      switch (reservationAction) {
        case 'cancel':

          // Use the release API endpoint
          endpoint = `/api/parking/reservations/${selectedReservation.id}/release`;
          method = 'POST';
          body = null; // No body needed for release API
          break;
        default:
          actionError = 'Invalid action';
          return;
      }

      const response = await authenticatedFetch(endpoint, {
        method,
        ...(body && { body })
      });

      const result = await response.json();

      if (result.success) {
        const actionText = reservationAction === 'cancel' || reservationAction === 'release' 
          ? 'released' 
          : reservationAction + 'ed';
        actionSuccess = `Reservation ${actionText} successfully!`;
        await loadReservations();
        setTimeout(() => {
          closeReservationModal();
        }, 1500);
      } else {
        const actionText = reservationAction === 'cancel' || reservationAction === 'release' 
          ? 'release' 
          : reservationAction;
        actionError = result.error || `Failed to ${actionText} reservation`;
      }
    } catch (err) {
      actionError = 'Network error: ' + err.message;
    } finally {
      actionLoading = false;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
      case 'canceled': // Handle both spellings
        return 'status-cancelled';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-unknown';
    }
  }

  function getShiftTypeLabel(shiftType) {
    switch (shiftType) {
      case '8:00-14:00':
        return 'Morning Shift';
      case '14:00-21:00':
        return 'Afternoon Shift';
      case '9:30-18:30':
        return 'Full Day';
      default:
        return shiftType;
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function canCancelReservation(reservation) {
    return reservation.status === 'active' || reservation.status === 'pending';
  }

  function sortReservations(reservations) {
    return reservations.sort((a, b) => {
      // Sort by status priority first (active, pending, cancelled, rejected)
      const statusOrder = { 'active': 1, 'pending': 2, 'cancelled': 3, 'canceled': 3, 'rejected': 4 };
      const statusDiff = (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
      if (statusDiff !== 0) return statusDiff;
      
      // Then by start date (newest first)
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }

  $: sortedReservations = sortReservations(reservations);
</script>

<svelte:head>
  <title>Profile - ReserveParkingSpace</title>
</svelte:head>

<Header redirect={true}/>

<div class="page-container" class:dark={$theme === 'dark'}>
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
          <div>
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
                    <p class="info-value">{formatDate(user.createdAt)}</p>
                  </div>
                {/if}

                {#if user.updatedAt}
                  <div class="info-group">
                    <label class="info-label">Last Updated</label>
                    <p class="info-value">{formatDate(user.updatedAt)}</p>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Reservations Section -->
      {#if !editing}
        <div class="card">
          <div class="card-header">
            <div class="card-header-content">
              <div>
                <h2 class="card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Your Reservations
                </h2>
                <p class="card-subtitle">
                  {reservations.length} total reservation{reservations.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button class="btn btn-sm btn-primary" on:click={loadReservations} disabled={reservationsLoading}>
                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 4v6h-6"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <div class="card-content">
            {#if reservationsLoading}
              <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading reservations...</p>
              </div>
            {:else if reservationsError}
              <div class="alert alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6"/>
                  <path d="M9 9l6 6"/>
                </svg>
                {reservationsError}
              </div>
            {:else if reservations.length === 0}
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="12" y1="14" x2="12" y2="18"/>
                  <line x1="10" y1="16" x2="14" y2="16"/>
                </svg>
                <h3>No reservations yet</h3>
                <p>You haven't made any parking space reservations. Start by booking a space!</p>
                <button class="btn btn-primary" on:click={() => goto('/')}>
                  <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Make a Reservation
                </button>
              </div>
            {:else}
              <div class="reservations-grid">
                {#each sortedReservations as reservation (reservation.id)}
                  <div class="reservation-card">
                    <div class="reservation-header">
                      <div class="reservation-info">
                        <h4 class="reservation-title">
                          Space {reservation.spaceId}
                        </h4>
                        <div class="reservation-meta">
                          <span class="badge {getStatusColor(reservation.status)}">
                            {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                          </span>
                          <span class="reservation-date">
                            {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                          </span>
                        </div>
                      </div>
                      <div class="reservation-actions">
                        <button 
                          class="btn btn-sm btn-secondary" 
                          on:click={() => openReservationModal(reservation, 'view')}
                        >
                          <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          View
                        </button>
                        {#if canCancelReservation(reservation)}
                          <button 
                            class="btn btn-sm btn-warning" 
                            on:click={() => openReservationModal(reservation, 'cancel')}
                          >
                            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"/>
                              <path d="M15 9l-6 6"/>
                              <path d="M9 9l6 6"/>
                            </svg>
                            Cancel
                          </button>
                        {/if}
                        
                      </div>
                    </div>
                    <div class="reservation-details">
                      <div class="detail-item">
                        <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12,6 12,12 16,14"/>
                        </svg>
                        <span>{getShiftTypeLabel(reservation.shiftType)}</span>
                      </div>
                      <div class="detail-item">
                        <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Created {formatDate(reservation.createdAt)}</span>
                      </div>
                      {#if reservation.scheduleDocument}
                        <div class="detail-item">
                          <svg class="detail-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                          </svg>
                          <span>Document attached</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Reservation Modal -->
{#if showReservationModal && selectedReservation}
  <div class="modal-overlay" on:click={closeReservationModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3 class="modal-title">
          {#if reservationAction === 'view'}
            Reservation Details
          {:else if reservationAction === 'cancel'}
            Cancel Reservation

          {/if}
        </h3>
        <button class="modal-close" on:click={closeReservationModal}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        {#if actionError}
          <div class="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6"/>
              <path d="M9 9l6 6"/>
            </svg>
            {actionError}
          </div>
        {/if}

        {#if actionSuccess}
          <div class="alert alert-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3l8-8"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.66 0 3.22.46 4.56 1.25"/>
            </svg>
            {actionSuccess}
          </div>
        {/if}

        <div class="reservation-details-modal">
          <div class="detail-row">
            <span class="detail-label">Space ID:</span>
            <span class="detail-value">{selectedReservation.spaceId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="badge {getStatusColor(selectedReservation.status)}">
              {selectedReservation.status.charAt(0).toUpperCase() + selectedReservation.status.slice(1)}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Start Date:</span>
            <span class="detail-value">{formatDate(selectedReservation.startDate)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">End Date:</span>
            <span class="detail-value">{formatDate(selectedReservation.endDate)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Shift Type:</span>
            <span class="detail-value">{getShiftTypeLabel(selectedReservation.shiftType)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created:</span>
            <span class="detail-value">{formatDateTime(selectedReservation.createdAt)}</span>
          </div>
          {#if selectedReservation.updatedAt}
            <div class="detail-row">
              <span class="detail-label">Last Updated:</span>
              <span class="detail-value">{formatDateTime(selectedReservation.updatedAt)}</span>
            </div>
          {/if}
          {#if selectedReservation.scheduleDocument}
            <div class="detail-row">
              <span class="detail-label">Schedule Document:</span>
              <span class="detail-value">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Attached
              </span>
            </div>
          {/if}
        </div>

        {#if reservationAction === 'cancel'}
          <div class="confirmation-message">
            <p>Are you sure you want to cancel this reservation?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>

        {/if}
      </div>
      
      <div class="modal-footer">
        {#if reservationAction === 'view'}
          <button class="btn btn-secondary" on:click={closeReservationModal}>
            Close
          </button>
        {:else}
          <button class="btn btn-secondary" on:click={closeReservationModal}>
            Cancel
          </button>
          <button 
            class="btn {reservationAction === 'cancel' ? 'btn-warning' : 'btn-danger'}" 
            on:click={executeReservationAction}
            disabled={actionLoading}
          >
            {#if actionLoading}
              <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
              {reservationAction === 'cancel' ? 'Cancelling...' : 'Deleting...'}
            {:else}
              {reservationAction === 'cancel' ? 'Cancel Reservation' : 'Delete Reservation'}
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}


      {#if !editing}
      <div class="controls-grid">
      <!-- logout -->
        <div class="card logout-card">
          <div class="card-header">
            <h2 class="card-title logout-title">
              Logout
            </h2>
          </div>
          <div class="card-content" style="padding-bottom: 0;">
            <button class="btn btn-logout" on:click={logout}>
              Logout
            </button>
          </div>
        </div>
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
        </div></div>
      {/if}
    {/if}
  </div>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0;
    padding: 0;
  }

  .page-container {
    background:#dbeafe;
    min-height: 100vh;
    transition: background 0.3s ease;
  }

  .page-container.dark {
    background:  #1e293b;
  }

 .page-container.dark .card {
  background: #334155;
}

 .page-container.dark .card .card-title {
  color: #e2e8f0
}

.page-container.dark .card .card-subtitle {
  color: #94a3b8
}

.page-container.dark .card .info-value {
  color: #94a3b8
}

.page-container.dark .logout-card {
  background-color: #213d8a;
}

.page-container.dark .danger-card {
  background-color: #ce6262;
}

.page-container.dark .danger-card .card-subtitle {
  color: #e2e8f0;
}

.page-container.dark .card label {
  color: #e2e8f0
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

  .controls-grid{
    display: grid;
    grid-template-columns: auto auto;
    gap: 20px;
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

  .logout-card {
    border: 1px solid #7091eb;
    background: linear-gradient(90deg, #b7cafd 0%, #b7cafd 100%);
  }

  .logout-title {
    color: #1d4ed8;
  }

  .btn-logout {
    background: linear-gradient(90deg, #809dec 0%, #1d4ed8 100%);
    color: white;
  }

  .btn-logout:hover:not(:disabled) {
    background: linear-gradient(90deg, #5d84f0 0%, #0040f0 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

  /* Reservation Cards */
  .reservations-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .reservations-grid {
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    }
  }

  .reservation-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.2s;
  }

  .reservation-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  }

  .reservation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .reservation-info {
    flex: 1;
  }

  .reservation-title {
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .reservation-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .reservation-date {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .reservation-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .reservation-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .detail-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Status badges */
  .status-active {
    background: #dcfce7;
    color: #16a34a;
  }

  .status-pending {
    background: #fef3c7;
    color: #d97706;
  }

  .status-cancelled {
    background: #fee2e2;
    color: #dc2626;
  }

  .status-rejected {
    background: #fdf2f8;
    color: #be185d;
  }

  .status-unknown {
    background: #f1f5f9;
    color: #64748b;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .empty-state svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h3 {
    font-size: 1.125rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    margin-bottom: 1.5rem;
    max-width: 20rem;
    margin-left: auto;
    margin-right: auto;
  }

  /* Modal */
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
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .modal-title {
    font-size: 1.125rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0;
  }

  .modal-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }

  .modal-close:hover {
    color: #374151;
    background: #f3f4f6;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid #f3f4f6;
  }

  .reservation-details-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .confirmation-message {
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 1rem;
  }

  .confirmation-message p {
    margin: 0;
    font-size: 0.875rem;
    color: #92400e;
  }

  .warning-text {
    font-weight: 500;
    margin-top: 0.5rem !important;
  }

  /* Additional button styles */
  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }

  .btn-warning {
    background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .btn-warning:hover:not(:disabled) {
    background: linear-gradient(90deg, #d97706 0%, #b45309 100%);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .card-header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .card-header-content > div:first-child {
    flex: 1;
  }

  /* Dark mode for modal */
  .page-container.dark .modal-content {
    background: #334155;
  }

  .page-container.dark .modal-title {
    color: #e2e8f0;
  }

  .page-container.dark .modal-close {
    color: #94a3b8;
  }

  .page-container.dark .modal-close:hover {
    color: #e2e8f0;
    background: #475569;
  }

  .page-container.dark .modal-header {
    border-bottom-color: #475569;
  }

  .page-container.dark .modal-footer {
    border-top-color: #475569;
  }

  .page-container.dark .detail-row {
    border-bottom-color: #475569;
  }

  .page-container.dark .detail-label {
    color: #e2e8f0;
  }

  .page-container.dark .detail-value {
    color: #94a3b8;
  }

  .page-container.dark .reservation-card {
    background: #475569;
    border-color: #64748b;
  }

  .page-container.dark .reservation-card:hover {
    border-color: #94a3b8;
  }

  .page-container.dark .reservation-title {
    color: #e2e8f0;
  }

  .page-container.dark .reservation-date {
    color: #94a3b8;
  }

  .page-container.dark .detail-item {
    color: #94a3b8;
  }

  .page-container.dark .empty-state {
    color: #94a3b8;
  }

  .page-container.dark .empty-state h3 {
    color: #e2e8f0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .reservation-actions {
      flex-direction: column;
      width: 100%;
    }

    .reservation-actions .btn {
      width: 100%;
    }

    .modal-content {
      margin: 0.5rem;
    }

    .modal-footer {
      flex-direction: column;
    }

    .modal-footer .btn {
      width: 100%;
    }

    .controls-grid {
      grid-template-columns: 1fr;
    }
  }
</style>