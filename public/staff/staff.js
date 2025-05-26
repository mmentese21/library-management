
// API Base URL
        const API_BASE = 'http://localhost:3000/api';

        // Global variables
        let currentData = {
            books: [],
            members: [],
            transactions: [],
            categories: [],
            authors: [],
            staff: []
        };

        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
            setupEventListeners();
        });

        function initializeApp() {
            loadDashboard();
            loadCategories();
            loadAuthors();
        }

        function setupEventListeners() {
            // Search functionality
            document.getElementById('bookSearch').addEventListener('input', filterBooks);
            document.getElementById('memberSearch').addEventListener('input', filterMembers);
            document.getElementById('staffSearch').addEventListener('input', filterStaff);

            // Form submissions
            document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
            document.getElementById('addBookForm').addEventListener('submit', handleAddBook);
            document.getElementById('borrowBookForm').addEventListener('submit', handleBorrowBook);
            document.getElementById('returnBookForm').addEventListener('submit', handleReturnBook);
            document.getElementById('addStaffForm').addEventListener('submit', handleAddStaff);

            // Modal close events
            document.querySelectorAll('.close').forEach(closeBtn => {
                closeBtn.addEventListener('click', function() {
                    this.closest('.modal').style.display = 'none';
                });
            });

            // Close modal when clicking outside
            window.addEventListener('click', function(event) {
                if (event.target.classList.contains('modal')) {
                    event.target.style.display = 'none';
                }
            });
        }

        // Tab management
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            
            // Load data for the selected tab
            switch(tabName) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'books':
                    loadBooks();
                    break;
                case 'members':
                    loadMembers();
                    break;
                case 'transactions':
                    loadTransactions();
                    break;
                case 'analytics':
                    loadAnalytics();
                    break;
                case 'staff':
                    loadStaff();
                    break;
            }
        }

        // API Functions
        async function apiCall(endpoint, options = {}) {
            try {
                const response = await fetch(`${API_BASE}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error('API call failed:', error);
                showAlert('Connection error. Please check if the server is running.', 'error');
                return null;
            }
        }

        // Dashboard functions
        async function loadDashboard() {
            try {
                const [books, members, transactions] = await Promise.all([
                    apiCall('/books'),
                    apiCall('/members'),
                    apiCall('/transactions')
                ]);

                if (books && members && transactions) {
                    displayStats(books, members, transactions);
                    displayRecentActivity(transactions);
                }
                
                const overdueBooks = await apiCall('/transactions/overdue');
                if (overdueBooks) {
                    displayOverdueBooks(overdueBooks);
                }
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }

        function displayStats(books, members, transactions) {
            const availableBooks = books.reduce((sum, book) => sum + book.AvailableCopies, 0);
            const totalBooks = books.reduce((sum, book) => sum + book.TotalCopies, 0);
            const activeTransactions = transactions.filter(t => t.Status === 'Active').length;
            const overdueCount = transactions.filter(t => t.Status === 'Active' && new Date(t.DueDate) < new Date()).length;
            
            const statsHTML = `
                <div class="stat-card">
                    <div class="stat-number">${totalBooks}</div>
                    <div class="stat-label">Total Books</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${availableBooks}</div>
                    <div class="stat-label">Available Books</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${members.length}</div>
                    <div class="stat-label">Total Members</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${activeTransactions}</div>
                    <div class="stat-label">Active Loans</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #f56565, #e53e3e);">
                    <div class="stat-number">${overdueCount}</div>
                    <div class="stat-label">Overdue Books</div>
                </div>
            `;
            
            document.getElementById('statsGrid').innerHTML = statsHTML;
        }

        function displayRecentActivity(transactions) {
            const recent = transactions.slice(0, 8);
            const activityHTML = recent.map(transaction => `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                    <strong>${transaction.MemberName}</strong> ${transaction.Status === 'Active' ? 'borrowed' : 'returned'} 
                    <em>"${transaction.BookTitle}"</em>
                    <br>
                    <small style="color: #666;">📅 ${new Date(transaction.TransactionDate).toLocaleDateString()}</small>
                    <span class="status-badge status-${transaction.Status.toLowerCase()}">${transaction.Status}</span>
                </div>
            `).join('');
            
            document.getElementById('recentActivity').innerHTML = activityHTML || '<p>No recent activity</p>';
        }

        function displayOverdueBooks(overdueBooks) {
            const overdueHTML = overdueBooks.map(item => `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px; background: #fff5f5;">
                    <strong>${item.MemberName}</strong> - <em>"${item.BookTitle}"</em>
                    <br>
                    <small style="color: #e53e3e;">⚠️ ${item.DaysOverdue} days overdue | Fine: ${item.CalculatedFine}</small>
                    <br>
                    <button class="btn btn-warning" style="padding: 5px 10px; font-size: 12px; margin-top: 5px;" 
                            onclick="sendOverdueNotice(${item.TransactionID})">📧 Send Notice</button>
                </div>
            `).join('');
            
            document.getElementById('overdueBooks').innerHTML = overdueHTML || '<p style="color: #48bb78;">✅ No overdue books!</p>';
        }

        // Book management functions
        async function loadBooks() {
            const books = await apiCall('/books');
            if (books) {
                currentData.books = books;
                displayBooks(books);
            }
        }

        function displayBooks(books) {
            const tableHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>📖 Title</th>
                            <th>👤 Author(s)</th>
                            <th>📋 Category</th>
                            <th>📊 ISBN</th>
                            <th>📅 Year</th>
                            <th>📚 Available/Total</th>
                            <th>⚙️ Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td><strong>${book.Title}</strong><br><small>${book.Publisher || 'N/A'}</small></td>
                                <td>${book.Authors || 'Unknown'}</td>
                                <td><span class="status-badge" style="background: #e6f3ff; color: #0066cc;">${book.CategoryName || 'Uncategorized'}</span></td>
                                <td>${book.ISBN}</td>
                                <td>${book.PublicationYear || 'N/A'}</td>
                                <td>
                                    <span class="${book.AvailableCopies > 0 ? 'status-active' : 'status-overdue'} status-badge">
                                        ${book.AvailableCopies}/${book.TotalCopies}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-primary" onclick="editBook(${book.BookID})" style="padding: 5px 10px; font-size: 12px;">✏️ Edit</button>
                                    <button class="btn btn-danger" onclick="deleteBook(${book.BookID})" style="padding: 5px 10px; font-size: 12px;">🗑️ Delete</button>
                                    <button class="btn btn-success" onclick="viewBookHistory(${book.BookID})" style="padding: 5px 10px; font-size: 12px;">📊 History</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('booksTable').innerHTML = tableHTML;
        }

        function filterBooks() {
            const searchTerm = document.getElementById('bookSearch').value.toLowerCase();
            const filteredBooks = currentData.books.filter(book => 
                book.Title.toLowerCase().includes(searchTerm) ||
                (book.Authors && book.Authors.toLowerCase().includes(searchTerm)) ||
                book.ISBN.toLowerCase().includes(searchTerm)
            );
            displayBooks(filteredBooks);
        }

        // Member management functions
        async function loadMembers() {
            const members = await apiCall('/members');
            if (members) {
                currentData.members = members;
                displayMembers(members);
            }
        }

        function displayMembers(members) {
            const tableHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>👤 Name</th>
                            <th>📧 Email</th>
                            <th>📞 Phone</th>
                            <th>🏠 Address</th>
                            <th>📅 Joined</th>
                            <th>🎫 Type</th>
                            <th>⚙️ Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => `
                            <tr>
                                <td><strong>${member.FirstName} ${member.LastName}</strong></td>
                                <td>${member.Email}</td>
                                <td>${member.Phone || 'N/A'}</td>
                                <td>${member.Address || 'N/A'}</td>
                                <td>${new Date(member.DateJoined).toLocaleDateString()}</td>
                                <td><span class="status-badge status-active">${member.MembershipType}</span></td>
                                <td>
                                    <button class="btn btn-primary" onclick="editMember(${member.MemberID})" style="padding: 5px 10px; font-size: 12px;">✏️ Edit</button>
                                    <button class="btn btn-danger" onclick="deleteMember(${member.MemberID})" style="padding: 5px 10px; font-size: 12px;">🗑️ Delete</button>
                                    <button class="btn btn-success" onclick="viewMemberHistory(${member.MemberID})" style="padding: 5px 10px; font-size: 12px;">📊 History</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('membersTable').innerHTML = tableHTML;
        }

        function filterMembers() {
            const searchTerm = document.getElementById('memberSearch').value.toLowerCase();
            const filteredMembers = currentData.members.filter(member => 
                `${member.FirstName} ${member.LastName}`.toLowerCase().includes(searchTerm) ||
                member.Email.toLowerCase().includes(searchTerm)
            );
            displayMembers(filteredMembers);
        }

        // Transaction management functions
        async function loadTransactions() {
            const transactions = await apiCall('/transactions');
            if (transactions) {
                currentData.transactions = transactions;
                displayTransactions(transactions);
            }
        }

        function displayTransactions(transactions) {
            const tableHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>🆔 ID</th>
                            <th>👤 Member</th>
                            <th>📖 Book</th>
                            <th>👨‍💼 Staff</th>
                            <th>📅 Borrowed</th>
                            <th>📅 Due Date</th>
                            <th>📅 Returned</th>
                            <th>💰 Fine</th>
                            <th>📊 Status</th>
                            <th>⚙️ Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(transaction => {
                            const isOverdue = transaction.Status === 'Active' && new Date(transaction.DueDate) < new Date();
                            const statusClass = isOverdue ? 'status-overdue' : `status-${transaction.Status.toLowerCase()}`;
                            
                            return `
                                <tr>
                                    <td>${transaction.TransactionID}</td>
                                    <td>${transaction.MemberName}</td>
                                    <td>${transaction.BookTitle}</td>
                                    <td>${transaction.StaffName}</td>
                                    <td>${new Date(transaction.TransactionDate).toLocaleDateString()}</td>
                                    <td>${new Date(transaction.DueDate).toLocaleDateString()}</td>
                                    <td>${transaction.ReturnDate ? new Date(transaction.ReturnDate).toLocaleDateString() : 'Not returned'}</td>
                                    <td>${transaction.Fine}</td>
                                    <td><span class="status-badge ${statusClass}">${isOverdue ? 'Overdue' : transaction.Status}</span></td>
                                    <td>
                                        ${transaction.Status === 'Active' ? `
                                            <button class="btn btn-primary" onclick="renewBook(${transaction.TransactionID})" style="padding: 5px 10px; font-size: 12px;">🔄 Renew</button>
                                        ` : ''}
                                        <button class="btn btn-success" onclick="viewTransactionDetails(${transaction.TransactionID})" style="padding: 5px 10px; font-size: 12px;">👁️ View</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('transactionsTable').innerHTML = tableHTML;
        }

        // Staff management functions
        async function loadStaff() {
            const staff = await apiCall('/staff');
            if (staff) {
                currentData.staff = staff;
                displayStaff(staff);
            }
        }

        function displayStaff(staff) {
            const tableHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>👤 Name</th>
                            <th>📧 Email</th>
                            <th>📞 Phone</th>
                            <th>💼 Position</th>
                            <th>💰 Salary</th>
                            <th>📅 Hire Date</th>
                            <th>⚙️ Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staff.map(member => `
                            <tr>
                                <td><strong>${member.FirstName} ${member.LastName}</strong></td>
                                <td>${member.Email}</td>
                                <td>${member.Phone || 'N/A'}</td>
                                <td><span class="status-badge" style="background: #ffeaa7; color: #2d3436;">${member.Position}</span></td>
                                <td>${member.Salary.toLocaleString()}</td>
                                <td>${new Date(member.HireDate).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-primary" onclick="editStaff(${member.StaffID})" style="padding: 5px 10px; font-size: 12px;">✏️ Edit</button>
                                    <button class="btn btn-danger" onclick="deleteStaff(${member.StaffID})" style="padding: 5px 10px; font-size: 12px;">🗑️ Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            document.getElementById('staffTable').innerHTML = tableHTML;
        }

        function filterStaff() {
            const searchTerm = document.getElementById('staffSearch').value.toLowerCase();
            const filteredStaff = currentData.staff.filter(staff => 
                `${staff.FirstName} ${staff.LastName}`.toLowerCase().includes(searchTerm) ||
                staff.Position.toLowerCase().includes(searchTerm)
            );
            displayStaff(filteredStaff);
        }

        // Analytics functions
        async function loadAnalytics() {
            try {
                const [categoryStats, activeBorrowers, neverBorrowed, monthlyTrends] = await Promise.all([
                    apiCall('/books/statistics'),
                    apiCall('/members/active-borrowers'),
                    apiCall('/books/never-borrowed'),
                    apiCall('/analytics/monthly-trends')
                ]);

                if (categoryStats) displayCategoryStats(categoryStats);
                if (activeBorrowers) displayActiveBorrowers(activeBorrowers);
                if (neverBorrowed) displayNeverBorrowedBooks(neverBorrowed);
                if (monthlyTrends) displayMonthlyTrends(monthlyTrends);
            } catch (error) {
                console.error('Error loading analytics:', error);
            }
        }

        function displayCategoryStats(stats) {
            const statsHTML = stats.map(stat => `
                <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px;">
                    <h4>${stat.CategoryName}</h4>
                    <p>📚 Books: ${stat.TotalBooks} | 📄 Avg Pages: ${Math.round(stat.AveragePages)} | 👤 Authors: ${stat.UniqueAuthors}</p>
                    <p>📊 Total Copies: ${stat.TotalCopies}</p>
                </div>
            `).join('');
            
            document.getElementById('categoryStats').innerHTML = statsHTML;
        }

        function displayActiveBorrowers(borrowers) {
            const borrowersHTML = borrowers.map(borrower => `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                    <strong>${borrower.MemberName}</strong> (${borrower.MembershipType})
                    <br>
                    <span class="status-badge status-active">📚 ${borrower.TotalBorrows} books borrowed</span>
                </div>
            `).join('');
            
            document.getElementById('activeBorrowers').innerHTML = borrowersHTML || '<p>No active borrowers above average</p>';
        }

        function displayNeverBorrowedBooks(books) {
            const booksHTML = books.slice(0, 10).map(book => `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                    <strong>${book.Title}</strong> by ${book.Author}
                    <br>
                    <small style="color: #666;">${book.CategoryName} | ${book.PublicationYear}</small>
                </div>
            `).join('');
            
            document.getElementById('neverBorrowedBooks').innerHTML = booksHTML || '<p>All books have been borrowed at least once!</p>';
        }

        function displayMonthlyTrends(trends) {
            const trendsHTML = trends.map(trend => `
                <div style="padding: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                    <strong>${trend.MonthName} ${trend.Year}</strong>
                    <br>
                    <small>📊 ${trend.TotalTransactions} transactions | 👥 ${trend.UniqueBorrowers} borrowers | 📚 ${trend.UniqueBooksIssued} books</small>
                    <br>
                    <small>📅 Avg loan: ${Math.round(trend.AvgBorrowDays)} days</small>
                </div>
            `).join('');
            
            document.getElementById('monthlyTrends').innerHTML = trendsHTML || '<p>No trend data available</p>';
        }

        // Form handling functions
        async function handleAddMember(event) {
            event.preventDefault();
            
            const memberData = {
                FirstName: document.getElementById('memberFirstName').value,
                LastName: document.getElementById('memberLastName').value,
                Email: document.getElementById('memberEmail').value,
                Phone: document.getElementById('memberPhone').value,
                Address: document.getElementById('memberAddress').value,
                MembershipType: document.getElementById('memberType').value
            };

            const result = await apiCall('/members', {
                method: 'POST',
                body: JSON.stringify(memberData)
            });

            if (result && result.success) {
                showAlert('Member added successfully!', 'success');
                closeModal('addMemberModal');
                document.getElementById('addMemberForm').reset();
                loadMembers();
            }
        }

        async function handleAddBook(event) {
            event.preventDefault();
            
            const bookData = {
                Title: document.getElementById('bookTitle').value,
                ISBN: document.getElementById('bookISBN').value,
                Publisher: document.getElementById('bookPublisher').value,
                PublicationYear: document.getElementById('bookYear').value,
                Pages: document.getElementById('bookPages').value,
                TotalCopies: document.getElementById('bookCopies').value,
                AvailableCopies: document.getElementById('bookCopies').value,
                CategoryID: document.getElementById('bookCategory').value
            };

            const result = await apiCall('/books', {
                method: 'POST',
                body: JSON.stringify(bookData)
            });

            if (result && result.success) {
                showAlert('Book added successfully!', 'success');
                closeModal('addBookModal');
                document.getElementById('addBookForm').reset();
                loadBooks();
            }
        }

        async function handleBorrowBook(event) {
            event.preventDefault();
            
            const borrowData = {
                MemberID: document.getElementById('borrowMember').value,
                BookID: document.getElementById('borrowBook').value,
                DueDate: document.getElementById('borrowDueDate').value,
                StaffID: 1 // Default staff ID
            };

            const result = await apiCall('/transactions', {
                method: 'POST',
                body: JSON.stringify(borrowData)
            });

            if (result && result.success) {
                showAlert('Book issued successfully!', 'success');
                closeModal('borrowBookModal');
                document.getElementById('borrowBookForm').reset();
                loadTransactions();
                loadBooks();
            }
        }

        async function handleReturnBook(event) {
            event.preventDefault();
            
            const transactionId = document.getElementById('returnTransaction').value;
            const fine = document.getElementById('returnFine').value;

            const result = await apiCall(`/transactions/${transactionId}/return`, {
                method: 'PUT',
                body: JSON.stringify({ Fine: fine })
            });

            if (result && result.success) {
                showAlert('Book returned successfully!', 'success');
                closeModal('returnBookModal');
                document.getElementById('returnBookForm').reset();
                loadTransactions();
                loadBooks();
            }
        }

        async function handleAddStaff(event) {
            event.preventDefault();
            
            const staffData = {
                FirstName: document.getElementById('staffFirstName').value,
                LastName: document.getElementById('staffLastName').value,
                Email: document.getElementById('staffEmail').value,
                Phone: document.getElementById('staffPhone').value,
                Position: document.getElementById('staffPosition').value,
                Salary: document.getElementById('staffSalary').value,
                HireDate: new Date().toISOString().split('T')[0]
            };

            const result = await apiCall('/staff', {
                method: 'POST',
                body: JSON.stringify(staffData)
            });

            if (result && result.success) {
                showAlert('Staff member added successfully!', 'success');
                closeModal('addStaffModal');
                document.getElementById('addStaffForm').reset();
                loadStaff();
            }
        }

        // Helper functions
        async function loadCategories() {
            const categories = await apiCall('/categories');
            if (categories) {
                currentData.categories = categories;
                const categorySelect = document.getElementById('bookCategory');
                categorySelect.innerHTML = '<option value="">Select Category</option>' +
                    categories.map(cat => `<option value="${cat.CategoryID}">${cat.CategoryName}</option>`).join('');
            }
        }

        async function loadAuthors() {
            const authors = await apiCall('/authors');
            if (authors) {
                currentData.authors = authors;
            }
        }

        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            modal.style.display = 'block';
            
            if (modalId === 'borrowBookModal') {
                populateBorrowModal();
            } else if (modalId === 'returnBookModal') {
                populateReturnModal();
            }
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        async function populateBorrowModal() {
            const members = await apiCall('/members');
            const memberSelect = document.getElementById('borrowMember');
            memberSelect.innerHTML = '<option value="">Select Member</option>' +
                members.map(member => `<option value="${member.MemberID}">${member.FirstName} ${member.LastName}</option>`).join('');

            const books = await apiCall('/books');
            const availableBooks = books.filter(book => book.AvailableCopies > 0);
            const bookSelect = document.getElementById('borrowBook');
            bookSelect.innerHTML = '<option value="">Select Book</option>' +
                availableBooks.map(book => `<option value="${book.BookID}">${book.Title} (${book.AvailableCopies} available)</option>`).join('');

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            document.getElementById('borrowDueDate').value = dueDate.toISOString().split('T')[0];
        }

        async function populateReturnModal() {
            const transactions = await apiCall('/transactions');
            const activeTransactions = transactions.filter(t => t.Status === 'Active');
            const transactionSelect = document.getElementById('returnTransaction');
            transactionSelect.innerHTML = '<option value="">Select Transaction</option>' +
                activeTransactions.map(t => `<option value="${t.TransactionID}">${t.MemberName} - ${t.BookTitle} (Due: ${new Date(t.DueDate).toLocaleDateString()})</option>`).join('');
        }

        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
            alertDiv.innerHTML = message;
            
            const activeTab = document.querySelector('.tab-content.active');
            activeTab.insertBefore(alertDiv, activeTab.firstChild);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }

        // Staff-specific functions
        function generateReport(type) {
            showAlert(`Generating ${type} report...`, 'success');
            // Implementation for report generation

        }

        function processOverdueFines() {
            showAlert('Processing overdue fines...', 'success');
            // Implementation for fine processing
        }

        function sendOverdueNotice(transactionId) {
            showAlert('Overdue notice sent successfully!', 'success');
            // Implementation for sending notices
        }

        function renewBook(transactionId) {
            showAlert('Book renewed successfully!', 'success');
            // Implementation for book renewal
        }

        function viewBookHistory(bookId) {
            showAlert('Viewing book history...', 'success');
            // Implementation for book history
        }

        function viewMemberHistory(memberId) {
            showAlert('Viewing member history...', 'success');
            // Implementation for member history
        }

        function viewTransactionDetails(transactionId) {
            showAlert('Viewing transaction details...', 'success');
            // Implementation for transaction details
        }

        function showBulkOperations() {
            showAlert('Bulk operations panel will be implemented', 'success');
        }

        function exportMembers() {
            showAlert('Exporting member list...', 'success');
        }

        function editBook(bookId) {
            showAlert('Edit functionality will be implemented', 'success');
        }

        function deleteBook(bookId) {
            if (confirm('Are you sure you want to delete this book?')) {
                showAlert('Delete functionality will be implemented', 'success');
            }
        }

        function editMember(memberId) {
            showAlert('Edit functionality will be implemented', 'success');
        }

        function deleteMember(memberId) {
            if (confirm('Are you sure you want to delete this member?')) {
                showAlert('Delete functionality will be implemented', 'success');
            }
        }

        function editStaff(staffId) {
            showAlert('Edit functionality will be implemented', 'success');
        }

        function deleteStaff(staffId) {
            if (confirm('Are you sure you want to delete this staff member?')) {
                apiCall(`/staff/${staffId}`, {
                    method: 'DELETE'
                }).then(result => {
                    if (result && result.success) {
                        showAlert('Staff member deleted successfully!', 'success');
                        loadStaff();
                    } else {
                        showAlert('Failed to delete staff member.', 'error');
                    }
                });
                showAlert('Delete functionality will be implemented', 'success');
            }
        }

        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = '/user';
            }
        }
    