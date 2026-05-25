/**
 * FlowTodo - Client Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // API Base URL
    const API_URL = '/tasks';

    // Application State
    let tasks = [];
    let currentFilter = 'all';

    // DOM Elements
    const todoForm = document.getElementById('todo-form');
    const todoInput = document.getElementById('todo-input');
    const taskList = document.getElementById('task-list');
    const statsCounter = document.getElementById('stats-counter');
    const statsPercent = document.getElementById('stats-percent');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const toastContainer = document.getElementById('toast-container');

    // Initialize application
    init();

    function init() {
        fetchTasks();
        setupEventListeners();
    }

    // Setup DOM event listeners
    function setupEventListeners() {
        // Form submit
        todoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = todoInput.value.trim();
            if (text) {
                addTask(text);
            }
        });

        // Filter tabs click
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.getAttribute('data-filter');
                renderTasks();
            });
        });
    }

    // --- API Calls ---

    // Fetch all tasks
    async function fetchTasks() {
        showLoadingState();
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch tasks');
            tasks = await response.json();
            renderTasks();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showErrorState('Could not load tasks from server. Please make sure the backend is running.');
            showToast('Error loading tasks', 'danger', 'fa-solid fa-circle-exclamation');
        }
    }

    // Add a new task
    async function addTask(text) {
        const newTask = {
            task: text,
            completed: false
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });

            if (!response.ok) throw new Error('Failed to add task');
            const createdTask = await response.json();
            
            tasks.push(createdTask);
            todoInput.value = '';
            todoInput.focus();
            renderTasks();
            showToast('Task added successfully!', 'success', 'fa-solid fa-circle-check');
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('Failed to add task', 'danger', 'fa-solid fa-circle-xmark');
        }
    }

    // Toggle completion status
    async function toggleTaskStatus(id, checked) {
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        const updatedDetails = {
            ...taskToUpdate,
            completed: checked
        };

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedDetails)
            });

            if (!response.ok) throw new Error('Failed to update task status');
            const result = await response.json();

            // Update local state
            taskToUpdate.completed = result.completed;
            updateStats();
            
            // Re-render only if filtered view changes
            if (currentFilter !== 'all') {
                renderTasks();
            } else {
                // Just toggle class directly on item
                const taskEl = document.querySelector(`[data-id="${id}"]`);
                if (taskEl) {
                    if (result.completed) {
                        taskEl.classList.add('completed-item');
                    } else {
                        taskEl.classList.remove('completed-item');
                    }
                }
            }

            if (result.completed) {
                showToast('Task completed! Keep it up.', 'success', 'fa-solid fa-star');
            } else {
                showToast('Task marked active.', 'info', 'fa-solid fa-circle-info');
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            showToast('Failed to update task', 'danger', 'fa-solid fa-circle-xmark');
            // Revert checkbox state
            const checkbox = document.querySelector(`[data-id="${id}"] .task-checkbox`);
            if (checkbox) checkbox.checked = !checked;
        }
    }

    // Save edited task text
    async function saveEditedTask(id, text) {
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        if (taskToUpdate.task === text) {
            // No changes, just cancel edit
            renderTasks();
            return;
        }

        const updatedDetails = {
            ...taskToUpdate,
            task: text
        };

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedDetails)
            });

            if (!response.ok) throw new Error('Failed to update task content');
            const result = await response.json();

            taskToUpdate.task = result.task;
            renderTasks();
            showToast('Task updated!', 'success', 'fa-solid fa-pen-to-square');
        } catch (error) {
            console.error('Error saving task text:', error);
            showToast('Failed to update task', 'danger', 'fa-solid fa-circle-xmark');
            renderTasks();
        }
    }

    // Delete a task
    async function deleteTask(id) {
        const taskEl = document.querySelector(`[data-id="${id}"]`);
        if (taskEl) {
            taskEl.classList.add('removing');
        }

        // Wait for the slide-out animation to complete
        setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Failed to delete task');

                tasks = tasks.filter(t => t.id !== id);
                renderTasks();
                showToast('Task removed.', 'info', 'fa-solid fa-trash-can');
            } catch (error) {
                console.error('Error deleting task:', error);
                showToast('Failed to delete task', 'danger', 'fa-solid fa-circle-xmark');
                if (taskEl) {
                    taskEl.classList.remove('removing');
                }
            }
        }, 300);
    }

    // --- UI Render Functions ---

    // Render list based on current state and filter
    function renderTasks() {
        taskList.innerHTML = '';
        updateStats();

        let filteredTasks = tasks;
        if (currentFilter === 'active') {
            filteredTasks = tasks.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(t => t.completed);
        }

        if (filteredTasks.length === 0) {
            showEmptyState();
            return;
        }

        // Sort: Active tasks first, then by ID (order added)
        filteredTasks.sort((a, b) => {
            if (a.completed === b.completed) return a.id - b.id;
            return a.completed ? 1 : -1;
        });

        filteredTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed-item' : ''}`;
            li.setAttribute('data-id', task.id);

            li.innerHTML = `
                <div class="task-left">
                    <label class="custom-checkbox">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="checkmark"><i class="fa-solid fa-check"></i></span>
                    </label>
                    <span class="task-text">${escapeHTML(task.task)}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-action btn-edit" title="Edit Task">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Delete Task">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Event listener for completion status toggle
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('change', (e) => {
                toggleTaskStatus(task.id, e.target.checked);
            });

            // Event listener for delete button
            const deleteBtn = li.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => {
                deleteTask(task.id);
            });

            // Event listener for edit button (inline editing)
            const editBtn = li.querySelector('.btn-edit');
            editBtn.addEventListener('click', () => {
                enableInlineEdit(li, task);
            });

            // Support double click to edit
            const taskTextSpan = li.querySelector('.task-text');
            taskTextSpan.addEventListener('dblclick', () => {
                enableInlineEdit(li, task);
            });

            taskList.appendChild(li);
        });
    }

    // Enable inline text editing for a task
    function enableInlineEdit(li, task) {
        const taskLeft = li.querySelector('.task-left');
        const taskTextSpan = li.querySelector('.task-text');
        const actionsDiv = li.querySelector('.task-actions');
        
        // Hide regular text and checkmark wrapper temporarily
        const checkLabel = li.querySelector('.custom-checkbox');
        checkLabel.style.display = 'none';
        taskTextSpan.style.display = 'none';

        // Create edit input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = task.task;
        taskLeft.appendChild(editInput);
        editInput.focus();
        editInput.select();

        // Swap action buttons
        actionsDiv.innerHTML = `
            <button class="btn-action btn-save" title="Save Changes">
                <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-action btn-edit" title="Cancel">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        const saveBtn = actionsDiv.querySelector('.btn-save');
        const cancelBtn = actionsDiv.querySelector('.btn-edit');

        // Handlers
        const finishEdit = () => {
            const value = editInput.value.trim();
            if (value) {
                saveEditedTask(task.id, value);
            } else {
                renderTasks();
            }
        };

        const cancelEdit = () => {
            renderTasks();
        };

        // Event listeners
        saveBtn.addEventListener('click', finishEdit);
        cancelBtn.addEventListener('click', cancelEdit);
        
        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishEdit();
            if (e.key === 'Escape') cancelEdit();
        });
    }

    // Update progress bar & counters
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        
        statsCounter.textContent = `${completed} / ${total} Completed`;
        
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        statsPercent.textContent = `${percentage}%`;
        progressBarFill.style.width = `${percentage}%`;
    }

    // Helper: Escape HTML to prevent XSS
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- State UI Rendering Helpers ---

    function showLoadingState() {
        taskList.innerHTML = `
            <li class="loading-state">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>Fetching tasks...</span>
            </li>
        `;
    }

    function showErrorState(message) {
        taskList.innerHTML = `
            <li class="empty-state">
                <i class="fa-solid fa-circle-exclamation" style="color: var(--danger)"></i>
                <span>${message}</span>
            </li>
        `;
    }

    function showEmptyState() {
        let iconClass = 'fa-regular fa-clipboard';
        let text = 'No tasks yet. Create one above to get started!';

        if (currentFilter === 'active') {
            iconClass = 'fa-solid fa-circle-check';
            text = "Awesome! You don't have any pending tasks.";
        } else if (currentFilter === 'completed') {
            iconClass = 'fa-regular fa-circle';
            text = "You haven't completed any tasks yet.";
        }

        taskList.innerHTML = `
            <li class="empty-state">
                <i class="${iconClass}"></i>
                <span>${text}</span>
            </li>
        `;
    }

    // --- Toast Alert Helper ---

    function showToast(message, type = 'info', icon = 'fa-solid fa-circle-info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Slide out after 3s
        setTimeout(() => {
            toast.classList.add('toast-out');
            // Remove from DOM after transition completes
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, 3000);
    }
});
