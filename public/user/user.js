
        // API Base URL
        const API_BASE = 'http://localhost:3000/api';

        // Global variables
        let currentData = {
            books: [],
            categories: [],
            authors: [],
            currentMember: null
        };

        // Initialize application
        document.addEventListener('DOMContentLoaded', function() {
            initializeApp();
            setupEventListeners();
        });

        function initializeApp() {
            loadLibraryStats();
            loadAllBooks();
            loadCategories();
        }

        function setupEventListeners() {
            // Search functionality
            document.getElementById('quickSearch').addEventListener('input', debounce(performQuickSearch, 300));
            
            // Filters
            document.getElementById('categoryFilter').addEventListener('change', applyFilters);
            document.getElementById('availabilityFilter').addEventListener('change', applyFilters);
            document.getElementById('sortBy').addEventListener('change', applyFilters);

            // Enter key support for member ID
            document.getElementById('memberIdInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    loadMemberAccount();
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
            
            // Load data for specific tabs
            if (tabName === 'search') {
                loadCategoriesForSearch();
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
                return null;
            }
        }

        // Load library statistics
        async function loadLibraryStats() {
            try {
                const [books, categories, authors] = await Promise.all([
                    apiCall('/books'),
                    apiCall('/categories'),
                    apiCall('/authors')
                ]);

                if (books) {
                    const availableBooks = books.reduce((sum, book) => sum + book.AvailableCopies, 0);
                    const totalBooks = books.reduce((sum, book) => sum + book.TotalCopies, 0);
                    
                    document.getElementById('totalBooksCount').textContent = totalBooks;
                    document.getElementById('availableBooksCount').textContent = availableBooks;
                }
                
                if (categories) {
                    document.getElementById('categoriesCount').textContent = categories.length;
                    currentData.categories = categories;
                }
                
                if (authors) {
                    document.getElementById('authorsCount').textContent = authors.length;
                    currentData.authors = authors;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        }

        // Load all books
        async function loadAllBooks() {
            const books = await apiCall('/books');
            if (books) {
                currentData.books = books;
                displayBooks(books);
                populateFilters(books);
            }
        }

        // Display books in grid format
        function displayBooks(books) {
            const container = document.getElementById('booksGrid');
            
            if (books.length === 0) {
                container.innerHTML = '<div class="no-results">No books found matching your criteria.</div>';
                return;
            }

            const booksHTML = books.map(book => {
                let availabilityClass, availabilityText;
                if (book.AvailableCopies === 0) {
                    availabilityClass = 'unavailable';
                    availabilityText = 'Unavailable';
                } else if (book.AvailableCopies <= 2) {
                    availabilityClass = 'limited';
                    availabilityText = `${book.AvailableCopies} Available`;
                } else {
                    availabilityClass = 'available';
                    availabilityText = `${book.AvailableCopies} Available`;
                }

                return `
                    <div class="book-card" onclick="showBookDetails(${book.BookID})">
                        <div class="book-title">${book.Title}</div>
                        <div class="book-author">by ${book.Authors || 'Unknown Author'}</div>
                        <div class="book-details">
                            <div style="margin-bottom: 8px;">
                                <span class="category-badge">${book.CategoryName || 'Uncategorized'}</span>
                            </div>
                            <div><strong>Publisher:</strong> ${book.Publisher || 'N/A'}</div>
                            <div><strong>Year:</strong> ${book.PublicationYear || 'N/A'}</div>
                            <div><strong>Pages:</strong> ${book.Pages || 'N/A'}</div>
                            <div><strong>ISBN:</strong> ${book.ISBN}</div>
                        </div>
                        <div class="book-availability">
                            <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
                            <small>${book.TotalCopies} Total Copies</small>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = booksHTML;
        }

        // Populate filter dropdowns
        function populateFilters(books) {
            const categoryFilter = document.getElementById('categoryFilter');
            const categories = [...new Set(books.map(book => book.CategoryName).filter(cat => cat))];
            
            categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }

        // Load categories for search
        async function loadCategoriesForSearch() {
            if (currentData.categories.length === 0) {
                const categories = await apiCall('/categories');
                if (categories) {
                    currentData.categories = categories;
                }
            }
            
            const searchCategorySelect = document.getElementById('searchCategory');
            searchCategorySelect.innerHTML = '<option value="">Select Category</option>' +
                currentData.categories.map(cat => `<option value="${cat.CategoryName}">${cat.CategoryName}</option>`).join('');
        }

        // Load categories for browse filter
        async function loadCategories() {
            const categories = await apiCall('/categories');
            if (categories) {
                currentData.categories = categories;
                const categoryFilter = document.getElementById('categoryFilter');
                categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                    categories.map(cat => `<option value="${cat.CategoryName}">${cat.CategoryName}</option>`).join('');
            }
        }

        // Quick search functionality
        async function performQuickSearch() {
            const searchTerm = document.getElementById('quickSearch').value.trim();
            
            if (searchTerm === '') {
                loadAllBooks();
                return;
            }

            const results = await apiCall(`/books/search?q=${encodeURIComponent(searchTerm)}`);
            if (results) {
                displayBooks(results);
            }
        }

        // Advanced search functionality
        async function performAdvancedSearch() {
            const criteria = {
                title: document.getElementById('searchTitle').value.trim(),
                author: document.getElementById('searchAuthor').value.trim(),
                isbn: document.getElementById('searchISBN').value.trim(),
                category: document.getElementById('searchCategory').value,
                year: document.getElementById('searchYear').value,
                publisher: document.getElementById('searchPublisher').value.trim()
            };

            // Filter books based on criteria
            let filteredBooks = [...currentData.books];

            if (criteria.title) {
                filteredBooks = filteredBooks.filter(book => 
                    book.Title.toLowerCase().includes(criteria.title.toLowerCase())
                );
            }

            if (criteria.author) {
                filteredBooks = filteredBooks.filter(book => 
                    book.Authors && book.Authors.toLowerCase().includes(criteria.author.toLowerCase())
                );
            }

            if (criteria.isbn) {
                filteredBooks = filteredBooks.filter(book => 
                    book.ISBN.includes(criteria.isbn)
                );
            }

            if (criteria.category) {
                filteredBooks = filteredBooks.filter(book => 
                    book.CategoryName === criteria.category
                );
            }

            if (criteria.year) {
                filteredBooks = filteredBooks.filter(book => 
                    book.PublicationYear == criteria.year
                );
            }

            if (criteria.publisher) {
                filteredBooks = filteredBooks.filter(book => 
                    book.Publisher && book.Publisher.toLowerCase().includes(criteria.publisher.toLowerCase())
                );
            }

            displaySearchResults(filteredBooks);
        }

        // Display search results
        function displaySearchResults(books) {
            const container = document.getElementById('searchResults');
            
            if (books.length === 0) {
                container.innerHTML = '<div class="no-results">No books found matching your search criteria.</div>';
                return;
            }

            const resultsHTML = `
                <h3>Search Results (${books.length} books found)</h3>
                <div class="book-grid">
                    ${books.map(book => {
                        let availabilityClass, availabilityText;
                        if (book.AvailableCopies === 0) {
                            availabilityClass = 'unavailable';
                            availabilityText = 'Unavailable';
                        } else if (book.AvailableCopies <= 2) {
                            availabilityClass = 'limited';
                            availabilityText = `${book.AvailableCopies} Available`;
                        } else {
                            availabilityClass = 'available';
                            availabilityText = `${book.AvailableCopies} Available`;
                        }

                        return `
                            <div class="book-card" onclick="showBookDetails(${book.BookID})">
                                <div class="book-title">${book.Title}</div>
                                <div class="book-author">by ${book.Authors || 'Unknown Author'}</div>
                                <div class="book-details">
                                    <div style="margin-bottom: 8px;">
                                        <span class="category-badge">${book.CategoryName || 'Uncategorized'}</span>
                                    </div>
                                    <div><strong>Publisher:</strong> ${book.Publisher || 'N/A'}</div>
                                    <div><strong>Year:</strong> ${book.PublicationYear || 'N/A'}</div>
                                    <div><strong>Pages:</strong> ${book.Pages || 'N/A'}</div>
                                    <div><strong>ISBN:</strong> ${book.ISBN}</div>
                                </div>
                                <div class="book-availability">
                                    <span class="availability-badge ${availabilityClass}">${availabilityText}</span>
                                    <small>${book.TotalCopies} Total Copies</small>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            container.innerHTML = resultsHTML;
        }

        // Clear search form
        function clearSearch() {
            document.getElementById('searchTitle').value = '';
            document.getElementById('searchAuthor').value = '';
            document.getElementById('searchISBN').value = '';
            document.getElementById('searchCategory').value = '';
            document.getElementById('searchYear').value = '';
            document.getElementById('searchPublisher').value = '';
            document.getElementById('searchResults').innerHTML = '<div class="no-results">Enter search criteria above to find specific books</div>';
        }

        // Apply filters
        function applyFilters() {
            const categoryFilter = document.getElementById('categoryFilter').value;
            const availabilityFilter = document.getElementById('availabilityFilter').value;
            const sortBy = document.getElementById('sortBy').value;

            let filteredBooks = [...currentData.books];

            // Apply category filter
            if (categoryFilter) {
                filteredBooks = filteredBooks.filter(book => book.CategoryName === categoryFilter);
            }

            // Apply availability filter
            if (availabilityFilter === 'available') {
                filteredBooks = filteredBooks.filter(book => book.AvailableCopies > 0);
            } else if (availabilityFilter === 'unavailable') {
                filteredBooks = filteredBooks.filter(book => book.AvailableCopies === 0);
            }

            // Apply sorting
            filteredBooks.sort((a, b) => {
                switch (sortBy) {
                    case 'title':
                        return a.Title.localeCompare(b.Title);
                    case 'author':
                        return (a.Authors || '').localeCompare(b.Authors || '');
                    case 'year':
                        return (b.PublicationYear || 0) - (a.PublicationYear || 0);
                    case 'category':
                        return (a.CategoryName || '').localeCompare(b.CategoryName || '');
                    default:
                        return 0;
                }
            });

            displayBooks(filteredBooks);
        }

        // Load member account
        async function loadMemberAccount() {
            const memberId = document.getElementById('memberIdInput').value;
            
            if (!memberId) {
                alert('Please enter your member ID');
                return;
            }

            try {
                // Load member details
                const members = await apiCall('/members');
                const member = members?.find(m => m.MemberID == memberId);
                
                if (!member) {
                    alert('Member ID not found. Please check your ID and try again.');
                    return;
                }

                currentData.currentMember = member;
                displayMemberDetails(member);

                // Load member transactions
                const transactions = await apiCall(`/members/${memberId}/transactions`);
                if (transactions) {
                    displayMemberTransactions(transactions);
                    displayMemberStats(transactions);
                }

                document.getElementById('accountInfo').style.display = 'block';
            } catch (error) {
                console.error('Error loading member account:', error);
                alert('Error loading account information. Please try again.');
            }
        }

        // Display member details
        function displayMemberDetails(member) {
            const container = document.getElementById('memberDetails');
            container.innerHTML = `
                <div class="info-item">
                    <div class="info-label">👤 Name</div>
                    <div class="info-value">${member.FirstName} ${member.LastName}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🆔 Member ID</div>
                    <div class="info-value">${member.MemberID}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📧 Email</div>
                    <div class="info-value">${member.Email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📞 Phone</div>
                    <div class="info-value">${member.Phone || 'Not provided'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">🎫 Membership Type</div>
                    <div class="info-value">${member.MembershipType}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">📅 Member Since</div>
                    <div class="info-value">${new Date(member.DateJoined).toLocaleDateString()}</div>
                </div>
            `;
        }

        // Display member statistics
        function displayMemberStats(transactions) {
            const currentBorrowings = transactions.filter(t => t.Status === 'Active');
            const totalBorrowings = transactions.length;
            const overdueBooks = currentBorrowings.filter(t => new Date(t.DueDate) < new Date());
            const totalFines = transactions.reduce((sum, t) => sum + (parseFloat(t.Fine) || 0), 0);

            const container = document.getElementById('memberStats');
            container.innerHTML = `
                <div class="quick-stat">
                    <div class="quick-stat-number">${currentBorrowings.length}</div>
                    <div class="quick-stat-label">Current Borrowings</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-number">${totalBorrowings}</div>
                    <div class="quick-stat-label">Total Borrowed</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-number">${overdueBooks.length}</div>
                    <div class="quick-stat-label">Overdue Books</div>
                </div>
                <div class="quick-stat">
                    <div class="quick-stat-number">${totalFines.toFixed(2)}</div>
                    <div class="quick-stat-label">Total Fines</div>
                </div>
            `;
        }

        // Display member transactions
        function displayMemberTransactions(transactions) {
            const currentBorrowings = transactions.filter(t => t.Status === 'Active');
            const history = transactions.filter(t => t.Status !== 'Active');

            // Current borrowings
            const currentContainer = document.getElementById('currentBorrowings');
            if (currentBorrowings.length === 0) {
                currentContainer.innerHTML = '<p style="text-align: center; color: #636e72; font-style: italic;">No current borrowings</p>';
            } else {
                const currentHTML = `
                    <table class="transaction-table">
                        <thead>
                            <tr>
                                <th>📖 Book Title</th>
                                <th>📅 Borrowed Date</th>
                                <th>📅 Due Date</th>
                                <th>📊 Status</th>
                                <th>💰 Fine</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentBorrowings.map(transaction => {
                                const isOverdue = new Date(transaction.DueDate) < new Date();
                                const statusClass = isOverdue ? 'status-overdue' : 'status-active';
                                const statusText = isOverdue ? 'Overdue' : 'Active';
                                
                                return `
                                    <tr>
                                        <td><strong>${transaction.BookTitle}</strong><br><small>ISBN: ${transaction.ISBN}</small></td>
                                        <td>${new Date(transaction.TransactionDate).toLocaleDateString()}</td>
                                        <td>${new Date(transaction.DueDate).toLocaleDateString()}</td>
                                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                        <td>${transaction.Fine || '0.00'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
                currentContainer.innerHTML = currentHTML;
            }

            // Borrowing history
            const historyContainer = document.getElementById('borrowingHistory');
            if (history.length === 0) {
                historyContainer.innerHTML = '<p style="text-align: center; color: #636e72; font-style: italic;">No borrowing history</p>';
            } else {
                const historyHTML = `
                    <table class="transaction-table">
                        <thead>
                            <tr>
                                <th>📖 Book Title</th>
                                <th>📅 Borrowed Date</th>
                                <th>📅 Due Date</th>
                                <th>📅 Returned Date</th>
                                <th>📊 Status</th>
                                <th>💰 Fine</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.slice(0, 10).map(transaction => `
                                <tr>
                                    <td><strong>${transaction.BookTitle}</strong><br><small>ISBN: ${transaction.ISBN}</small></td>
                                    <td>${new Date(transaction.TransactionDate).toLocaleDateString()}</td>
                                    <td>${new Date(transaction.DueDate).toLocaleDateString()}</td>
                                    <td>${transaction.ReturnDate ? new Date(transaction.ReturnDate).toLocaleDateString() : 'N/A'}</td>
                                    <td><span class="status-badge status-returned">${transaction.Status}</span></td>
                                    <td>${transaction.Fine || '0.00'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ${history.length > 10 ? `<p style="text-align: center; margin-top: 15px; color: #636e72;">Showing last 10 transactions of ${history.length} total</p>` : ''}
                `;
                historyContainer.innerHTML = historyHTML;
            }
        }

        // Show book details (placeholder function)
        function showBookDetails(bookId) {
            const book = currentData.books.find(b => b.BookID === bookId);
            if (book) {
                alert(`Book Details:\n\nTitle: ${book.Title}\nAuthor: ${book.Authors || 'Unknown'}\nISBN: ${book.ISBN}\nPublisher: ${book.Publisher || 'N/A'}\nYear: ${book.PublicationYear || 'N/A'}\nPages: ${book.Pages || 'N/A'}\nCategory: ${book.CategoryName || 'Uncategorized'}\nAvailable Copies: ${book.AvailableCopies}/${book.TotalCopies}\n\nTo borrow this book, please visit the library or contact staff.`);
            }
        }

        // Switch to staff interface
        function switchToStaff() {
            if (confirm('Switch to staff interface?')) {
                window.location.href = '/staff';
            }
        }

        // Utility function for debouncing
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
