<!-- src/routes/admin/reservations/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { authenticatedFetch } from '$lib/auth.js';
  import { goto } from '$app/navigation';
  
  let reservations = [];
  let loading = true;
  let error = null;
  let selectedStatus = 'all';
  let searchUserId = '';
  let searchSpaceId = '';
  let hasMore = false;
  let lastDocId = null;
  let processingActions = new Set();
  
  // Modal state
  let showModal = false;
  let modalType = '';
  let selectedReservation = null;
  let modalReason = '';
  let modalNotes = '';
  let modalData = {};
  
  // Filters from URL params
  $: {
    const urlParams = $page.url.searchParams;
    selectedStatus = urlParams.get('status') || 'all';
    searchUserId = urlParams.get('userId') || '';
    searchSpaceId = urlParams.get('spaceId') || '';
  }
  
  onMount(async () => {
    await loadReservations();
  });
  
  async function loadReservations(append = false) {
    try {
      loading = true;
      const params = new URLSearchParams();
      
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (searchUserId) params.set('userId', searchUserId);
      if (searchSpaceId) params.set('spaceId', searchSpaceId);
      if (append && lastDocId) params.set('lastDocId', lastDocId);
      
      const response = await authenticatedFetch(`/api/admin/reservations?${params}`);
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          reservations = [...reservations, ...data.reservations];
        } else {
          reservations = data.reservations;
        }
        hasMore = data.hasMore;
        lastDocId = data.lastDocId;
        error = null;
      } else {
        error = data.error || 'Failed to load reservations';
      }
    } catch (err) {
      console.error('Reservations loading error:', err);
      error = 'Network error loading reservations';
    } finally {
      loading = false;
    }
  }
  
  async function handleFilterChange() {
    lastDocId = null;
    await loadReservations();
    
    // Update URL params
    const params = new URLSearchParams();
    if (selectedStatus !== 'all') params.set('status', selectedStatus);
    if (searchUserId) params.set('userId', searchUserId);
    if (searchSpaceId) params.set('spaceId', searchSpaceId);
    
    const newUrl = `/admin/reservations${params.toString() ? '?' + params.toString() : ''}`;
    goto(newUrl, { replaceState: true });
  }
  
  async function loadMore() {
    if (hasMore && !loading) {
      await loadReservations(true);
    }
  }
  
  function openModal(type, reservation = null) {
    modalType = type;
    selectedReservation = reservation;
    modalReason = '';
    modalNotes = '';
    modalData = reservation ? {
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      shiftType: reservation.shiftType,
      notes: reservation.adminNotes || ''
    } : {};
    showModal = true;
  }
  
  function closeModal() {
    showModal = false;
    modalType = '';
    selectedReservation = null;
    modalReason = '';
    modalNotes = '';
    modalData = {};
  }
  
  async function handleReservationAction(action) {

    if (!selectedReservation) return;
    
    const reservationId = selectedReservation.id;
    processingActions.add(reservationId);
    
    try {
      const requestData = {
        reservationId,
        action,
        data: {}
      };

      
      if (action === 'reject' || action === 'cancel') {
        requestData.data.reason = modalReason;
      } else if (action === 'update') {
        requestData.data = modalData;
      }
      
      const response = await authenticatedFetch('/api/admin/reservations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadReservations();
        closeModal();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('Action error:', err);
      alert('Network error performing action');
    } finally {
      processingActions.delete(reservationId);
      processingActions = processingActions;
    }
  }
  
  async function deleteReservation(reservationId) {
    if (!confirm('Are you sure you want to permanently delete this reservation?')) return;
    
    processingActions.add(reservationId);
    
    try {
      const response = await authenticatedFetch('/api/admin/reservations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadReservations();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error deleting reservation');
    } finally {
      processingActions.delete(reservationId);
      processingActions = processingActions;
    }
  }
  
  async function downloadDocument(reservationId) {
    try {
      const response = await authenticatedFetch(`/api/admin/documents/${reservationId}`);
      const data = await response.json();
      
      if (data.success) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert('Error accessing document: ' + data.error);
      }
    } catch (err) {
      console.error('Document download error:', err);
      alert('Network error accessing document');
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
  
  function getStatusColor(status) {
    const colors = {
      active: '#10b981',
      pending: '#f59e0b',
      cancelled: '#ef4444',
      rejected: '#ef4444'
    };
    return colors[status] || '#6b7280';
  }
  
  function getStatusIcon(status) {
    const icons = {
      active: '✅',
      pending: '⏳',
      cancelled: '❌',
      rejected: '🚫'
    };
    return icons[status] || '❓';
  }
</script>

<svelte:head>
  <title>Reservations Management - Admin Panel</title>
</svelte:head>

<div class="reservations-page">
  <div class="page-header">
    <h1>🚗 Reservations Management</h1>
    <div class="header-stats">
      <span class="stat-item">Total: {reservations.length}</span>
      <span class="stat-item">Active: {reservations.filter(r => r.status === 'active').length}</span>
      <span class="stat-item">Pending: {reservations.filter(r => r.status === 'pending').length}</span>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters-section">
    <div class="filters-row">
      <div class="filter-group">
        <label for="status">Status:</label>
        <select id="status" bind:value={selectedStatus} on:change={handleFilterChange}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="userId">User ID:</label>
        <input 
          type="text" 
          id="userId" 
          bind:value={searchUserId} 
          placeholder="Search by user ID..."
          on:input={handleFilterChange}
        />
      </div>
      
      <div class="filter-group">
        <label for="spaceId">Space ID:</label>
        <input 
          type="text" 
          id="spaceId" 
          bind:value={searchSpaceId} 
          placeholder="Search by space ID..."
          on:input={handleFilterChange}
        />
      </div>
      
      <button class="refresh-btn" on:click={() => loadReservations()}>
        <span class="refresh-icon">🔄</span>
        Refresh
      </button>
    </div>
  </div>

  {#if loading && reservations.length === 0}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading reservations...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h3>❌ Error</h3>
      <p>{error}</p>
      <button class="retry-btn" on:click={() => loadReservations()}>Try Again</button>
    </div>
  {:else}
    <!-- Reservations Table -->
    <div class="table-container">
      <table class="reservations-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>User</th>
            <th>Space</th>
            <th>Period</th>
            <th>Shift</th>
            <th>Created</th>
            <th>Document</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each reservations as reservation}
            <tr class="reservation-row">
              <td>
                <div class="status-cell">
                  <span class="status-icon">{getStatusIcon(reservation.status)}</span>
                  <span class="status-text" style="color: {getStatusColor(reservation.status)};">
                    {reservation.status.toUpperCase()}
                  </span>
                </div>
              </td>
              <td>
                <div class="user-cell">
                  <div class="user-name">
                    {reservation.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : 'Unknown User'}
                  </div>
                  <div class="user-email">{reservation.user?.email || reservation.userId}</div>
                </div>
              </td>
              <td>
                <div class="space-cell">
                  <div class="space-name">Space {reservation.spaceId}</div>
                  <div class="space-location">{reservation.space?.location || 'Unknown Location'}</div>
                </div>
              </td>
              <td>
                <div class="period-cell">
                  <div class="period-dates">
                    {formatDate(reservation.startDate)} - {formatDate(reservation.endDate)}
                  </div>
                </div>
              </td>
              <td>
                <div class="shift-cell">
                  <span class="shift-badge">{reservation.shiftType}</span>
                </div>
              </td>
              <td>
                <div class="created-cell">
                  {formatDate(reservation.createdAt)}
                </div>
              </td>
              <td>
                <div class="document-cell">
                  {#if reservation.scheduleDocument}
                    <button 
                      class="doc-btn" 
                      on:click={() => downloadDocument(reservation.id)}
                    >
                      📄 View
                    </button>
                  {:else}
                    <span class="no-doc">No document</span>
                  {/if}
                </div>
              </td>
              <td>
                <div class="actions-cell">
                  {#if reservation.status === 'pending'}
                    <button 
                      class="action-btn approve" 
                      on:click={() => openModal('approve', reservation)}
                      disabled={processingActions.has(reservation.id)}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      class="action-btn reject" 
                      on:click={() => openModal('reject', reservation)}
                      disabled={processingActions.has(reservation.id)}
                    >
                      🚫 Reject
                    </button>
                  {:else if reservation.status === 'active'}
                    <button 
                      class="action-btn cancel" 
                      on:click={() => openModal('cancel', reservation)}
                      disabled={processingActions.has(reservation.id)}
                    >
                      ❌ Cancel
                    </button>
                  {/if}
                  
                  <button 
                    class="action-btn edit" 
                    on:click={() => openModal('update', reservation)}
                    disabled={processingActions.has(reservation.id)}
                  >
                    ✏️ Edit
                  </button>
                  
                  <button 
                    class="action-btn delete" 
                    on:click={() => deleteReservation(reservation.id)}
                    disabled={processingActions.has(reservation.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="empty-state">
                No reservations found matching your criteria
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Load More Button -->
    {#if hasMore}
      <div class="load-more-section">
        <button class="load-more-btn" on:click={loadMore} disabled={loading}>
          {#if loading}
            <span class="spinner small"></span>
            Loading...
          {:else}
            Load More Reservations
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <div class="modal-overlay" on:click={closeModal}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h3>
          {#if modalType === 'reject'}
            🚫 Reject Reservation
          {:else if modalType === 'cancel'}
            ❌ Cancel Reservation
          {:else if modalType === 'update'}
            ✏️ Update Reservation
          {:else if modalType === 'approve'}
            ✅ Approve
          {/if}
        </h3>
        <button class="close-btn" on:click={closeModal}>×</button>
      </div>
      
      <div class="modal-body">
        {#if modalType === 'reject' || modalType === 'cancel'}
          <div class="form-group">
            <label for="reason">Reason for {modalType}:</label>
            <textarea 
              id="reason" 
              bind:value={modalReason} 
              placeholder="Enter reason..."
              rows="3"
            ></textarea>
          </div>
        {:else if modalType === 'update'}
          <div class="form-group">
            <label for="startDate">Start Date:</label>
            <input type="datetime-local" id="startDate" bind:value={modalData.startDate} />
          </div>
          
          <div class="form-group">
            <label for="endDate">End Date:</label>
            <input type="datetime-local" id="endDate" bind:value={modalData.endDate} />
          </div>
          
          <div class="form-group">
            <label for="shiftType">Shift Type:</label>
            <select id="shiftType" bind:value={modalData.shiftType}>
              <option value="8:00-14:00">Morning (8:00-14:00)</option>
              <option value="14:00-21:00">Afternoon (14:00-21:00)</option>
              <option value="9:30-18:30">Full Day (9:30-18:30)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="notes">Admin Notes:</label>
            <textarea 
              id="notes" 
              bind:value={modalData.notes} 
              placeholder="Admin notes..."
              rows="3"
            ></textarea>
          </div>
          {:else if modalType === 'approve'}

        {/if}

      </div>
      
      <div class="modal-footer">
        <button class="btn secondary" on:click={closeModal}>Cancel</button>
        <button class="btn primary" on:click={() => handleReservationAction(modalType)}>
          {#if modalType === 'reject'}
            Reject Reservation
          {:else if modalType === 'cancel'}
            Cancel Reservation
          {:else if modalType === 'update'}
            Update Reservation
          {:else if modalType === 'approve'}
            Approve
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .reservations-page {
    padding: 0;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .page-header h1 {
    margin: 0;
    color: #1f2937;
  }
  
  .header-stats {
    display: flex;
    gap: 1rem;
  }
  
  .stat-item {
    background: #f3f4f6;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .filters-section {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    margin-bottom: 1.5rem;
  }
  
  .filters-row {
    display: flex;
    gap: 1rem;
    align-items: end;
    flex-wrap: wrap;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filter-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
  
  .filter-group select,
  .filter-group input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    min-width: 150px;
  }
  
  .refresh-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .refresh-btn:hover {
    background: #2563eb;
  }
  
  .table-container {
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    overflow: hidden;
  }
  
  .reservations-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .reservations-table th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .reservations-table td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .reservation-row:hover {
    background: #f9fafb;
  }
  
  .status-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .status-text {
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .user-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .user-name {
    font-weight: 500;
    color: #1f2937;
  }
  
  .user-email {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .space-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .space-name {
    font-weight: 500;
    color: #1f2937;
  }
  
  .space-location {
    font-size: 0.75rem;
    color: #6b7280;
  }
  
  .period-cell {
    font-size: 0.875rem;
    color: #374151;
  }
  
  .shift-badge {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .created-cell {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  .doc-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
  }
  
  .doc-btn:hover {
    background: #059669;
  }
  
  .no-doc {
    font-size: 0.75rem;
    color: #9ca3af;
  }
  
  .actions-cell {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .action-btn {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .action-btn.approve {
    background: #10b981;
    color: white;
  }
  
  .action-btn.reject {
    background: #ef4444;
    color: white;
  }
  
  .action-btn.cancel {
    background: #f59e0b;
    color: white;
  }
  
  .action-btn.edit {
    background: #3b82f6;
    color: white;
  }
  
  .action-btn.delete {
    background: #ef4444;
    color: white;
  }
  
  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .load-more-section {
    margin-top: 2rem;
    text-align: center;
  }
  
  .load-more-btn {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 auto;
  }
  
  .load-more-btn:hover {
    background: #e5e7eb;
  }
  
  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  }
  
  .modal-content {
    background: white;
    border-radius: 0.5rem;
    max-width: 500px;
    width: 100%;
    margin: 1rem;
    max-height: 90vh;
    overflow-y: auto;
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
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }
  
  .close-btn:hover {
    color: #374151;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .form-group textarea {
    resize: vertical;
  }
  
  .modal-footer {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .btn.primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn.primary:hover {
    background: #2563eb;
  }
  
  .btn.secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }
  
  .btn.secondary:hover {
    background: #e5e7eb;
  }
  
  /* Loading and Error States */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
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
  
  .spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
    margin-bottom: 0;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .retry-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    margin-top: 1rem;
  }
  
  .retry-btn:hover {
    background: #2563eb;
  }
  
  .empty-state {
    text-align: center;
    color: #6b7280;
    padding: 2rem;
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .filters-row {
      flex-direction: column;
      align-items: stretch;
    }
    
    .filter-group {
      width: 100%;
    }
    
    .filter-group select,
    .filter-group input {
      min-width: auto;
    }
    
    .table-container {
      overflow-x: auto;
    }
    
    .reservations-table {
      min-width: 1000px;
    }
    
    .actions-cell {
      flex-direction: column;
    }
    
    .action-btn {
      width: 100%;
    }
  }
</style>