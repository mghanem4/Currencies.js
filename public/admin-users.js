// Admin Users Management Script
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modal
    const editModal = new bootstrap.Modal('#editUserModal');
    let currentEditUser = null;
  
    // Delete user handler
    const handleDelete = async (username) => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      
      try {
        const response = await fetch('/admin/users/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        
        if (response.ok) {
          window.location.reload();
        } else {
          throw new Error('Failed to delete user');
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert(error.message);
      }
    };
  
    // Edit user handler
    const handleEdit = (username) => {
      currentEditUser = username;
      document.getElementById('editUsername').value = username;
      document.getElementById('editPassword').value = '';
      editModal.show();
    };
  
    // Save edited user
    const handleSave = async () => {
      const newUsername = document.getElementById('editUsername').value.trim();
      const newPassword = document.getElementById('editPassword').value.trim();
  
      if (!newUsername) {
        alert('Username is required');
        return;
      }
  
      try {
        const response = await fetch('/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldUsername: currentEditUser,
            newUsername,
            newPassword: newPassword || undefined
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update user');
        }
        window.location.reload();
      } catch (error) {
        console.error('Update error:', error);
        alert(error.message);
      }
    };

    // Example fetch request from admin panel
async function createUser(username, password, role) {
  try {
      const response = await fetch('/admin/users/create', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${btoa('admin:password')}`
          },
          body: JSON.stringify({ username, password, role })
      });

      const result = await response.json();
      if (!result.success) {
          alert(`Error: ${result.message}`);
          return false;
      }
      return true;
  } catch (error) {
      console.error('Create user failed:', error);
      return false;
  }
}
  
    // Event delegation for dynamic elements
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        handleDelete(e.target.dataset.username);
      }
      if (e.target.classList.contains('edit-btn')) {
        handleEdit(e.target.dataset.username);
      }
      if (e.target.classList.contains('create-btn')) {
        const username = prompt('Enter new username:');
        const password = prompt('Enter new password:');
        const role = prompt('Enter user role (user/admin):');
        if (username && password && role) {
          createUser(username, password, role)
            .then(success => {
              if (success) {
                window.location.reload();
              }
            });
        }
      }
    });



    document.getElementById('saveEditBtn').addEventListener('click', handleSave);
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize the modal
    const addUserModal = new bootstrap.Modal('#addUserModal');
    const addUserForm = document.getElementById('addUserForm');
    
    // Form submission handler
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const role = document.getElementById('newRole').value;
        
        // Client-side validation
        if (username.length < 3 || password.length < 8) {
            return; // Let HTML5 validation handle it
        }
        
        // Disable button during request
        const saveBtn = document.getElementById('saveUserBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        try {
            const response = await fetch('/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include your auth header if needed
                },
                body: JSON.stringify({ username, password, role })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to create user');
            }
            
            // Success - close modal and refresh user list
            addUserModal.hide();
            window.location.reload(); // Or update table dynamically
            
        } catch (error) {
            console.error('Error creating user:', error);
            alert(`Error: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
    
    // Reset form when modal closes
    document.getElementById('addUserModal').addEventListener('hidden.bs.modal', () => {
        addUserForm.reset();
        // Remove any validation classes
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    });
    
    // Real-time validation
    document.getElementById('newUsername').addEventListener('input', function() {
        this.classList.toggle('is-invalid', this.value.length > 0 && this.value.length < 3);
    });
    
    document.getElementById('newPassword').addEventListener('input', function() {
        this.classList.toggle('is-invalid', this.value.length > 0 && this.value.length < 8);
    });
});