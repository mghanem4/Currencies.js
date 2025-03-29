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
        const response = await fetch('/admin/users/update', {
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
  
    // Event delegation for dynamic elements
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        handleDelete(e.target.dataset.username);
      }
      if (e.target.classList.contains('edit-btn')) {
        handleEdit(e.target.dataset.username);
      }
    });
  
    document.getElementById('saveEditBtn').addEventListener('click', handleSave);
  });