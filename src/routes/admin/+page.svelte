<!-- src/routes/admin/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { authenticatedFetch } from '$lib/auth.js';
  import { user } from '$lib/stores/user.js';
  
  let stats = null;
  let loading = true;
  let error = null;
  let selectedDateRange = '30';
  let refreshInterval = null;
  
  // Reactive date calculations
  $: startDate = new Date(Date.now() - parseInt(selectedDateRange) * 24 * 60 * 60 * 1000).toISOString();
  $: endDate = new Date().toISOString();
  
  onMount(async () => {
    await loadStats();
    // Auto-refresh every 30 seconds
    refreshInterval = setInterval(loadStats, 30000);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });
  
  async function loadStats() {
    try {
      const response = await authenticatedFetch(`/api/admin/stats?startDate=${startDate}&endDate=${endDate}`);
      const data = await response.json();
      
      if (data.success) {
        stats = data.stats;
        error = null;
      } else {
        error = data.error || 'Failed to load statistics';
      }
    } catch (err) {
      console.error('Stats loading error:', err);
      error = 'Network error loading statistics';
    } finally {
      loading = false;
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
  
  function calculateApprovalRate() {
    if (!stats) return 0;
    const total = stats.totalReservations;
    if (total === 0) return 0;
    return Math.round((stats.activeReservations / total) * 100);
  }
  
  async function handleDateRangeChange() {
    loading = true;
    await loadStats();
  }
</script>

<svelte:head>
  <title>Admin Dashboard - Parking Management</title>
</svelte:head>

<div class="dashboard">
  <div class="dashboard-header">
    <div class="header-content">
      <h1>Admin Dashboard</h1>
      <div class="header-controls">
        <div class="date-range-selector">
          <label for="dateRange">Time Period:</label>
          <select id="dateRange" bind:value={selectedDateRange} on:change={handleDateRangeChange}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
        <button class="refresh-btn" on:click={loadStats} disabled={loading}>
          <span class="refresh-icon" class:spinning={loading}>🔄</span>
          Refresh
        </button>
      </div>
    </div>
  </div>

  {#if loading && !stats}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading dashboard statistics...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h3>Error</h3>
      <p>{error}</p>
      <button class="retry-btn" on:click={loadStats}>Try Again</button>
    </div>
  {:else if stats}
    <!-- Key Metrics -->
    <div class="metrics-grid">
      <div class="metric-card primary">
        <div class="metric-content">
          <h3>Total Reservations</h3>
          <div class="metric-value">{stats.totalReservations}</div>
          
        </div>
      </div>
      
      <div class="metric-card success">
        <div class="metric-content">
          <h3>Active Reservations</h3>
          <div class="metric-value">{stats.activeReservations}</div>
         
        </div>
      </div>
      
      <div class="metric-card warning">
        <div class="metric-content">
          <h3>Pending Approval</h3>
          <div class="metric-value">{stats.pendingReservations}</div>
          
        </div>
      </div>
      
      <div class="metric-card info">
        <div class="metric-content">
          <h3>Total Users</h3>
          <div class="metric-value">{stats.totalUsers}</div>
          
        </div>
      </div>
    </div>

    <!-- Status Breakdown -->
    <div class="section">
      <h2>Reservation Status Breakdown</h2>
      <div class="status-grid">
        <div class="status-card">
          <div class="status-header">
            <h4>Active</h4>
          </div>
          <div class="status-count">{stats.activeReservations}</div>
          <div class="status-bar">
            <div class="status-fill" style="width: {(stats.activeReservations / stats.totalReservations) * 100}%; background-color: #10b981;"></div>
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-header">
            <h4>Pending</h4>
          </div>
          <div class="status-count">{stats.pendingReservations}</div>
          <div class="status-bar">
            <div class="status-fill" style="width: {(stats.pendingReservations / stats.totalReservations) * 100}%; background-color: #f59e0b;"></div>
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-header">
            <h4>Cancelled</h4>
          </div>
          <div class="status-count">{stats.cancelledReservations}</div>
          <div class="status-bar">
            <div class="status-fill" style="width: {(stats.cancelledReservations / stats.totalReservations) * 100}%; background-color: #ef4444;"></div>
          </div>
        </div>
        
        <div class="status-card">
          <div class="status-header">
            <h4>Rejected</h4>
          </div>
          <div class="status-count">{stats.rejectedReservations}</div>
          <div class="status-bar">
            <div class="status-fill" style="width: {(stats.rejectedReservations / stats.totalReservations) * 100}%; background-color: #ef4444;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Shift Type Distribution -->
    <div class="section">
      <h2>Shift Type Distribution</h2>
      <div class="shift-grid">
        <div class="shift-card">
          <div class="shift-content">
            <h4>Morning Shift</h4>
            <div class="shift-time">8:00 - 14:00</div>
            <div class="shift-count">{stats.byShiftType.morning} reservations</div>
          </div>
        </div>
        
        <div class="shift-card">
          <div class="shift-content">
            <h4>Afternoon Shift</h4>
            <div class="shift-time">14:00 - 21:00</div>
            <div class="shift-count">{stats.byShiftType.afternoon} reservations</div>
          </div>
        </div>
        
        <div class="shift-card">
          <div class="shift-content">
            <h4>Full Day</h4>
            <div class="shift-time">9:30 - 18:30</div>
            <div class="shift-count">{stats.byShiftType.fullDay} reservations</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Two Column Layout -->
    <div class="two-column">
      <!-- Space Utilization -->
      <div class="section">
        <h2>Top Utilized Spaces</h2>
        <div class="space-list">
          {#each stats.spaceUtilization as space, index}
            <div class="space-item">
              <div class="space-rank">#{index + 1}</div>
              <div class="space-info">
                <div class="space-id">Space {space.spaceId}</div>
                <div class="space-count">{space.count} active reservations</div>
              </div>
              <div class="space-bar">
                <div class="space-fill" style="width: {(space.count / stats.spaceUtilization[0]?.count) * 100}%;"></div>
              </div>
            </div>
          {:else}
            <div class="empty-state">No space utilization data available</div>
          {/each}
        </div>
      </div>
      
      <!-- User Activity -->
      <div class="section">
        <h2>Most Active Users</h2>
        <div class="user-list">
          {#each stats.userActivity as user, index}
            <div class="user-item">
              <div class="user-rank">#{index + 1}</div>
              <div class="user-info">
                <div class="user-id">User {user.userId.substring(0, 8)}...</div>
                <div class="user-count">{user.count} total reservations</div>
              </div>
              <div class="user-bar">
                <div class="user-fill" style="width: {(user.count / stats.userActivity[0]?.count) * 100}%;"></div>
              </div>
            </div>
          {:else}
            <div class="empty-state">No user activity data available</div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="section">
      <h2>Recent Activity</h2>
      <div class="activity-list">
        {#each stats.recentActivity as activity}
          <div class="activity-item">
            <div class="activity-status">
              <span class="activity-status-text" style="color: {getStatusColor(activity.status)};">
                {activity.status.toUpperCase()}
              </span>
            </div>
            <div class="activity-content">
              <div class="activity-main">
                <strong>Space {activity.spaceId}</strong> - {activity.shiftType}
              </div>
              <div class="activity-meta">
                User: {activity.userId.substring(0, 8)}... | 
                {formatDate(activity.startDate)} to {formatDate(activity.endDate)}
              </div>
            </div>
            <div class="activity-time">
              {formatDate(activity.createdAt)}
            </div>
          </div>
        {:else}
          <div class="empty-state">No recent activity</div>
        {/each}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <h2>Quick Actions</h2>
      <div class="actions-grid">
        <a href="/admin/reservations?status=pending" class="action-card urgent">
          <div class="action-content">
            <h4>Review Pending</h4>
            <p>{stats.pendingReservations} reservations need approval</p>
          </div>
        </a>
        
        <a href="/admin/reservations" class="action-card">
          <div class="action-content">
            <h4>Manage Reservations</h4>
            <p>View and manage all reservations</p>
          </div>
        </a>
        
        <a href="/admin/users" class="action-card">
          <div class="action-content">
            <h4>User Management</h4>
            <p>Manage user accounts and permissions</p>
          </div>
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0;
  }
  
  .dashboard-header {
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
  
  .dashboard-header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .date-range-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .date-range-selector label {
    font-weight: 500;
    color: #6b7280;
  }
  
  .date-range-selector select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
  }
  
  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
  }
  
  .refresh-btn:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .refresh-icon {
    transition: transform 0.6s ease;
  }
  
  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
    text-align: center;
  }
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f4f6;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  .retry-btn {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .metric-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }
  
  .metric-card.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .metric-card.success {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }
  
  .metric-card.warning {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }
  
  .metric-card.info {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }
  
  .metric-icon {
    font-size: 2.5rem;
    opacity: 0.9;
  }
  
  .metric-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    opacity: 0.9;
    font-weight: 500;
  }
  
  .metric-value {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    line-height: 1;
  }
  
  .metric-sub {
    font-size: 0.875rem;
    opacity: 0.8;
  }
  
  .period-stat, .utilization-rate, .approval-rate {
    font-weight: 600;
  }
  
  .action-link {
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid currentColor;
    opacity: 0.9;
    transition: opacity 0.2s ease;
  }
  
  .action-link:hover {
    opacity: 1;
  }
  
  .section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .section h2 {
    margin: 0 0 1.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .status-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
  }
  
  .status-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .status-icon {
    font-size: 1.5rem;
  }
  
  .status-header h4 {
    margin: 0;
    color: #374151;
    font-weight: 600;
  }
  
  .status-count {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 1rem;
  }
  
  .status-bar {
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .status-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .shift-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .shift-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .shift-icon {
    font-size: 2rem;
  }
  
  .shift-content h4 {
    margin: 0 0 0.25rem 0;
    color: #1f2937;
    font-weight: 600;
  }
  
  .shift-time {
    color: #6b7280;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }
  
  .shift-count {
    color: #374151;
    font-weight: 500;
  }
  
  .two-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .space-list, .user-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .space-item, .user-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
  }
  
  .space-rank, .user-rank {
    width: 2rem;
    height: 2rem;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .space-info, .user-info {
    flex: 1;
  }
  
  .space-id, .user-id {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }
  
  .space-count, .user-count {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .space-bar, .user-bar {
    width: 60px;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .space-fill, .user-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    border-left: 4px solid #e5e7eb;
  }
  
  .activity-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 100px;
  }
  
  .activity-icon {
    font-size: 1.25rem;
  }
  
  .activity-status-text {
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .activity-content {
    flex: 1;
  }
  
  .activity-main {
    color: #1f2937;
    margin-bottom: 0.25rem;
  }
  
  .activity-meta {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .activity-time {
    color: #9ca3af;
    font-size: 0.875rem;
    text-align: right;
    min-width: 140px;
  }
  
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .action-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }
  
  .action-card:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
    transform: translateY(-2px);
  }
  
  .action-card.urgent {
    background: #fef3c7;
    border-color: #f59e0b;
  }
  
  .action-card.urgent:hover {
    background: #fde68a;
  }
  
  .action-icon {
    font-size: 2rem;
  }
  
  .action-content h4 {
    margin: 0 0 0.25rem 0;
    color: #1f2937;
    font-weight: 600;
  }
  
  .action-content p {
    margin: 0;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .empty-state {
    text-align: center;
    color: #9ca3af;
    padding: 2rem;
    font-style: italic;
  }
  
  @media (max-width: 768px) {
    .dashboard-header {
      padding: 1.5rem;
    }
    
    .header-content {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .dashboard-header h1 {
      font-size: 1.5rem;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    
    .two-column {
      grid-template-columns: 1fr;
    }
    
    .section {
      padding: 1.5rem;
    }
    
    .actions-grid {
      grid-template-columns: 1fr;
    }
    
    .activity-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .activity-time {
      text-align: left;
      min-width: auto;
    }
  }
</style>