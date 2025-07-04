<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parking Reservation File Upload Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input, select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="file"] {
            padding: 5px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 4px;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .file-info {
            background-color: #e9ecef;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
        }
        .tabs {
            display: flex;
            margin-bottom: 20px;
        }
        .tab {
            flex: 1;
            padding: 10px;
            background-color: #e9ecef;
            border: 1px solid #ddd;
            cursor: pointer;
            text-align: center;
        }
        .tab.active {
            background-color: #007bff;
            color: white;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🅿️ Parking Reservation File Upload Test</h1>
        
        <div class="tabs">
            <div class="tab active" onclick={showTab('reservation')}>New Reservation</div>
            <div class="tab" onclick={showTab('upload')}>Upload Only</div>
            <div class="tab" onclick={showTab('update')}>Update Reservation</div>
        </div>

        <!-- New Reservation Tab -->
        <div id="reservation" class="tab-content active">
            <h3>Create New Reservation with File</h3>
            <form id="reservationForm">
                <div class="form-group">
                    <label for="authToken">Auth Token (Bearer token):</label>
                    <input type="text" id="authToken" placeholder="Enter your auth token" required>
                </div>
                <div class="form-group">
                    <label for="spaceId">Space ID:</label>
                    <input type="number" id="spaceId" placeholder="e.g., 1" min="1" max="20" required>
                </div>
                <div class="form-group">
                    <label for="startDate">Start Date:</label>
                    <input type="date" id="startDate" required>
                </div>
                <div class="form-group">
                    <label for="endDate">End Date:</label>
                    <input type="date" id="endDate" required>
                </div>
                <div class="form-group">
                    <label for="shiftType">Shift Type:</label>
                    <select id="shiftType" required>
                        <option value="">Select shift type</option>
                        <option value="8:00-14:00">Morning (8:00-14:00)</option>
                        <option value="14:00-21:00">Afternoon (14:00-21:00)</option>
                        <option value="9:30-18:30">Full Day (9:30-18:30)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="scheduleDocument">Schedule Document (PDF):</label>
                    <input type="file" id="scheduleDocument" accept=".pdf">
                    <div id="fileInfo" class="file-info" style="display: none;"></div>
                </div>
                <button type="submit" id="submitBtn">Create Reservation</button>
            </form>
        </div>

        <!-- Upload Only Tab -->
        <div id="upload" class="tab-content">
            <h3>Upload File Only</h3>
            <form id="uploadForm">
                <div class="form-group">
                    <label for="uploadAuthToken">Auth Token (Bearer token):</label>
                    <input type="text" id="uploadAuthToken" placeholder="Enter your auth token" required>
                </div>
                <div class="form-group">
                    <label for="uploadReservationId">Reservation ID (optional):</label>
                    <input type="text" id="uploadReservationId" placeholder="Enter reservation ID">
                </div>
                <div class="form-group">
                    <label for="uploadFile">PDF File:</label>
                    <input type="file" id="uploadFile" accept=".pdf" required>
                </div>
                <button type="submit" id="uploadBtn">Upload File</button>
            </form>
        </div>

        <!-- Update Reservation Tab -->
        <div id="update" class="tab-content">
            <h3>Update Existing Reservation</h3>
            <form id="updateForm">
                <div class="form-group">
                    <label for="updateAuthToken">Auth Token (Bearer token):</label>
                    <input type="text" id="updateAuthToken" placeholder="Enter your auth token" required>
                </div>
                <div class="form-group">
                    <label for="updateReservationId">Reservation ID:</label>
                    <input type="text" id="updateReservationId" placeholder="Enter reservation ID to update" required>
                </div>
                <div class="form-group">
                    <label for="updateStartDate">Start Date:</label>
                    <input type="date" id="updateStartDate">
                </div>
                <div class="form-group">
                    <label for="updateEndDate">End Date:</label>
                    <input type="date" id="updateEndDate">
                </div>
                <div class="form-group">
                    <label for="updateShiftType">Shift Type:</label>
                    <select id="updateShiftType">
                        <option value="">Keep current shift</option>
                        <option value="8:00-14:00">Morning (8:00-14:00)</option>
                        <option value="14:00-21:00">Afternoon (14:00-21:00)</option>
                        <option value="9:30-18:30">Full Day (9:30-18:30)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="updateDocument">New Schedule Document (PDF):</label>
                    <input type="file" id="updateDocument" accept=".pdf">
                </div>
                <button type="submit" id="updateBtn">Update Reservation</button>
            </form>
        </div>

        <div id="result"></div>
    </div>

    <script>
        // Set default dates
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        document.getElementById('startDate').valueAsDate = tomorrow;
        document.getElementById('endDate').valueAsDate = nextWeek;
        document.getElementById('updateStartDate').valueAsDate = tomorrow;
        document.getElementById('updateEndDate').valueAsDate = nextWeek;

        // Tab switching
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
        }

        // File info display
        document.getElementById('scheduleDocument').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const fileInfo = document.getElementById('fileInfo');
            if (file) {
                fileInfo.style.display = 'block';
                fileInfo.innerHTML = `
                    <strong>File Info:</strong><br>
                    Name: ${file.name}<br>
                    Size: ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
                    Type: ${file.type}
                `;
            } else {
                fileInfo.style.display = 'none';
            }
        });

        // Show result
        function showResult(message, isSuccess = true) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = `result ${isSuccess ? 'success' : 'error'}`;
            resultDiv.innerHTML = message;
            resultDiv.scrollIntoView({ behavior: 'smooth' });
        }

        // New Reservation Form
        document.getElementById('reservationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            const formData = new FormData();
            formData.append('spaceId', document.getElementById('spaceId').value);
            formData.append('startDate', document.getElementById('startDate').value);
            formData.append('endDate', document.getElementById('endDate').value);
            formData.append('shiftType', document.getElementById('shiftType').value);
            
            const fileInput = document.getElementById('scheduleDocument');
            if (fileInput.files[0]) {
                formData.append('scheduleDocument', fileInput.files[0]);
            }

            try {
                const response = await fetch('/api/parking/reservations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${document.getElementById('authToken').value}`
                    },
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showResult(`✅ Reservation created successfully!<br>
                        <strong>ID:</strong> ${result.reservation.id}<br>
                        <strong>Space:</strong> ${result.reservation.spaceId}<br>
                        <strong>Period:</strong> ${result.reservation.startDate} to ${result.reservation.endDate}<br>
                        <strong>Shift:</strong> ${result.reservation.shiftType}<br>
                        ${result.reservation.scheduleDocument ? `<strong>Document:</strong> ${result.reservation.scheduleDocument.filename}` : ''}
                    `);
                } else {
                    showResult(`❌ Error: ${result.error}`, false);
                }
            } catch (error) {
                showResult(`❌ Network error: ${error.message}`, false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Reservation';
            }
        });

        // Upload Only Form
        document.getElementById('uploadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const uploadBtn = document.getElementById('uploadBtn');
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';

            const formData = new FormData();
            formData.append('file', document.getElementById('uploadFile').files[0]);
            
            const reservationId = document.getElementById('uploadReservationId').value;
            if (reservationId) {
                formData.append('reservationId', reservationId);
            }

            try {
                const response = await fetch('/api/parking/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${document.getElementById('uploadAuthToken').value}`
                    },
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showResult(`✅ File uploaded successfully!<br>
                        <strong>Filename:</strong> ${result.data.filename}<br>
                        <strong>Size:</strong> ${(result.data.size / 1024 / 1024).toFixed(2)} MB<br>
                        <strong>Path:</strong> ${result.data.path}<br>
                        <strong>Public URL:</strong> <a href="${result.data.publicUrl}" target="_blank">View</a>
                    `);
                } else {
                    showResult(`❌ Error: ${result.error}`, false);
                }
            } catch (error) {
                showResult(`❌ Network error: ${error.message}`, false);
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload File';
            }
        });

        // Update Reservation Form
        document.getElementById('updateForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const updateBtn = document.getElementById('updateBtn');
            updateBtn.disabled = true;
            updateBtn.textContent = 'Updating...';

            const formData = new FormData();
            
            const startDate = document.getElementById('updateStartDate').value;
            const endDate = document.getElementById('updateEndDate').value;
            const shiftType = document.getElementById('updateShiftType').value;
            
            if (startDate) formData.append('startDate', startDate);
            if (endDate) formData.append('endDate', endDate);
            if (shiftType) formData.append('shiftType', shiftType);
            
            const fileInput = document.getElementById('updateDocument');
            if (fileInput.files[0]) {
                formData.append('scheduleDocument', fileInput.files[0]);
            }

            const reservationId = document.getElementById('updateReservationId').value;

            try {
                const response = await fetch(`/api/parking/reservations/${reservationId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${document.getElementById('updateAuthToken').value}`
                    },
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    showResult(`✅ Reservation updated successfully!<br>
                        <strong>ID:</strong> ${reservationId}<br>
                        <strong>Message:</strong> ${result.message}
                    `);
                } else {
                    showResult(`❌ Error: ${result.error}`, false);
                }
            } catch (error) {
                showResult(`❌ Network error: ${error.message}`, false);
            } finally {
                updateBtn.disabled = false;
                updateBtn.textContent = 'Update Reservation';
            }
        });
    </script>
</body>
</html>