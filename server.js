const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_DATABASE || 'library_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}


// Advanced SQL Queries (Required for project)

// 1. Complex query with JOIN and GROUP BY - Books with author count and average pages by category
app.get('/api/books/statistics', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.CategoryName,
                COUNT(DISTINCT b.BookID) as TotalBooks,
                AVG(b.Pages) as AveragePages,
                SUM(b.TotalCopies) as TotalCopies,
                COUNT(DISTINCT ba.AuthorID) as UniqueAuthors
            FROM Categories c
            LEFT JOIN Books b ON c.CategoryID = b.CategoryID
            LEFT JOIN BookAuthors ba ON b.BookID = ba.BookID
            GROUP BY c.CategoryID, c.CategoryName
            HAVING TotalBooks > 0
            ORDER BY TotalBooks DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Nested query - Members who have borrowed more books than average
app.get('/api/members/active-borrowers', async (req, res) => {
    try {
        const query = `
            SELECT 
                m.MemberID,
                CONCAT(m.FirstName, ' ', m.LastName) as MemberName,
                m.MembershipType,
                COUNT(t.TransactionID) as TotalBorrows
            FROM Members m
            JOIN Transactions t ON m.MemberID = t.MemberID
            GROUP BY m.MemberID
            HAVING COUNT(t.TransactionID) > (
                SELECT AVG(borrowCount) 
                FROM (
                    SELECT COUNT(*) as borrowCount 
                    FROM Transactions 
                    GROUP BY MemberID
                ) as avgBorrows
            )
            ORDER BY TotalBorrows DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Complex query with multiple JOINs - Overdue books with member and staff details
app.get('/api/transactions/overdue', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.TransactionID,
                CONCAT(m.FirstName, ' ', m.LastName) as MemberName,
                m.Email as MemberEmail,
                b.Title as BookTitle,
                b.ISBN,
                CONCAT(s.FirstName, ' ', s.LastName) as StaffName,
                t.TransactionDate,
                t.DueDate,
                DATEDIFF(CURDATE(), t.DueDate) as DaysOverdue,
                (DATEDIFF(CURDATE(), t.DueDate) * 0.50) as CalculatedFine
            FROM Transactions t
            JOIN Members m ON t.MemberID = m.MemberID
            JOIN Books b ON t.BookID = b.BookID
            JOIN Staff s ON t.StaffID = s.StaffID
            WHERE t.Status = 'Active' AND t.DueDate < CURDATE()
            ORDER BY DaysOverdue DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Subquery with EXISTS - Books that have never been borrowed
app.get('/api/books/never-borrowed', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.BookID,
                b.Title,
                b.ISBN,
                CONCAT(a.FirstName, ' ', a.LastName) as Author,
                c.CategoryName,
                b.PublicationYear
            FROM Books b
            JOIN BookAuthors ba ON b.BookID = ba.BookID
            JOIN Authors a ON ba.AuthorID = a.AuthorID
            JOIN Categories c ON b.CategoryID = c.CategoryID
            WHERE NOT EXISTS (
                SELECT 1 FROM Transactions t WHERE t.BookID = b.BookID
            )
            ORDER BY b.Title
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Complex aggregation - Monthly borrowing trends
app.get('/api/analytics/monthly-trends', async (req, res) => {
    try {
        const query = `
            SELECT 
                YEAR(t.TransactionDate) as Year,
                MONTH(t.TransactionDate) as Month,
                MONTHNAME(t.TransactionDate) as MonthName,
                COUNT(*) as TotalTransactions,
                COUNT(DISTINCT t.MemberID) as UniqueBorrowers,
                COUNT(DISTINCT t.BookID) as UniqueBooksIssued,
                AVG(DATEDIFF(COALESCE(t.ReturnDate, CURDATE()), t.TransactionDate)) as AvgBorrowDays
            FROM Transactions t
            WHERE t.TransactionDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY YEAR(t.TransactionDate), MONTH(t.TransactionDate)
            ORDER BY Year DESC, Month DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Basic CRUD Operations

// Get all books with details
app.get('/api/books', async (req, res) => {
    try {
        const query = `
            SELECT 
                b.*,
                c.CategoryName,
                GROUP_CONCAT(CONCAT(a.FirstName, ' ', a.LastName) SEPARATOR ', ') as Authors
            FROM Books b
            LEFT JOIN Categories c ON b.CategoryID = c.CategoryID
            LEFT JOIN BookAuthors ba ON b.BookID = ba.BookID
            LEFT JOIN Authors a ON ba.AuthorID = a.AuthorID
            GROUP BY b.BookID
            ORDER BY b.Title
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all members
app.get('/api/members', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Members ORDER BY LastName, FirstName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Categories ORDER BY CategoryName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all authors
app.get('/api/authors', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Authors ORDER BY LastName, FirstName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.*,
                CONCAT(m.FirstName, ' ', m.LastName) as MemberName,
                b.Title as BookTitle,
                CONCAT(s.FirstName, ' ', s.LastName) as StaffName
            FROM Transactions t
            JOIN Members m ON t.MemberID = m.MemberID
            JOIN Books b ON t.BookID = b.BookID
            JOIN Staff s ON t.StaffID = s.StaffID
            ORDER BY t.TransactionDate DESC
        `;
        const [rows] = await pool.execute(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new member
app.post('/api/members', async (req, res) => {
    try {
        const { FirstName, LastName, Email, Phone, Address, MembershipType } = req.body;
        const query = `
            INSERT INTO Members (FirstName, LastName, Email, Phone, Address, DateJoined, MembershipType)
            VALUES (?, ?, ?, ?, ?, CURDATE(), ?)
        `;
        const [result] = await pool.execute(query, [FirstName, LastName, Email, Phone, Address, MembershipType]);
        res.json({ success: true, memberId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new book
app.post('/api/books', async (req, res) => {
    try {
        const { Title, ISBN, Publisher, PublicationYear, Pages, TotalCopies, AvailableCopies, CategoryID } = req.body;
        const query = `
            INSERT INTO Books (Title, ISBN, Publisher, PublicationYear, Pages, TotalCopies, AvailableCopies, CategoryID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.execute(query, [Title, ISBN, Publisher, PublicationYear, Pages, TotalCopies, AvailableCopies || TotalCopies, CategoryID]);
        res.json({ success: true, bookId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new transaction (borrow book)
app.post('/api/transactions', async (req, res) => {
    try {
        const { MemberID, BookID, StaffID, DueDate } = req.body;
        
        // Check if book is available
        const [bookCheck] = await pool.execute('SELECT AvailableCopies FROM Books WHERE BookID = ?', [BookID]);
        if (bookCheck.length === 0 || bookCheck[0].AvailableCopies <= 0) {
            return res.status(400).json({ error: 'Book is not available' });
        }
        
        const query = `
            INSERT INTO Transactions (MemberID, BookID, StaffID, TransactionDate, DueDate, Status)
            VALUES (?, ?, ?, CURDATE(), ?, 'Active')
        `;
        const [result] = await pool.execute(query, [MemberID, BookID, StaffID || 1, DueDate]);
        
        // Update book availability
        await pool.execute('UPDATE Books SET AvailableCopies = AvailableCopies - 1 WHERE BookID = ?', [BookID]);
        
        res.json({ success: true, transactionId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Return book
app.put('/api/transactions/:id/return', async (req, res) => {
    try {
        const { id } = req.params;
        const { Fine } = req.body;
        
        // Get transaction details
        const [transaction] = await pool.execute('SELECT BookID FROM Transactions WHERE TransactionID = ?', [id]);
        if (transaction.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        // Update transaction
        const query = `
            UPDATE Transactions 
            SET Status = 'Returned', ReturnDate = CURDATE(), Fine = ?
            WHERE TransactionID = ?
        `;
        await pool.execute(query, [Fine || 0, id]);
        
        // Update book availability
        await pool.execute('UPDATE Books SET AvailableCopies = AvailableCopies + 1 WHERE BookID = ?', [transaction[0].BookID]);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update member
app.put('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { FirstName, LastName, Email, Phone, Address, MembershipType } = req.body;
        const query = `
            UPDATE Members 
            SET FirstName = ?, LastName = ?, Email = ?, Phone = ?, Address = ?, MembershipType = ?
            WHERE MemberID = ?
        `;
        await pool.execute(query, [FirstName, LastName, Email, Phone, Address, MembershipType, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update book
app.put('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { Title, ISBN, Publisher, PublicationYear, Pages, TotalCopies, CategoryID } = req.body;
        const query = `
            UPDATE Books 
            SET Title = ?, ISBN = ?, Publisher = ?, PublicationYear = ?, Pages = ?, TotalCopies = ?, CategoryID = ?
            WHERE BookID = ?
        `;
        await pool.execute(query, [Title, ISBN, Publisher, PublicationYear, Pages, TotalCopies, CategoryID, id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete member
app.delete('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if member has active transactions
        const [activeTransactions] = await pool.execute(
            'SELECT COUNT(*) as count FROM Transactions WHERE MemberID = ? AND Status = "Active"',
            [id]
        );
        
        if (activeTransactions[0].count > 0) {
            return res.status(400).json({ error: 'Cannot delete member with active transactions' });
        }
        
        await pool.execute('DELETE FROM Members WHERE MemberID = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete book
app.delete('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if book has active transactions
        const [activeTransactions] = await pool.execute(
            'SELECT COUNT(*) as count FROM Transactions WHERE BookID = ? AND Status = "Active"',
            [id]
        );
        
        if (activeTransactions[0].count > 0) {
            return res.status(400).json({ error: 'Cannot delete book with active transactions' });
        }
        
        await pool.execute('DELETE FROM Books WHERE BookID = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get staff
app.get('/api/staff', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Staff ORDER BY LastName, FirstName');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search books
app.get('/api/books/search', async (req, res) => {
    try {
        const { q } = req.query;
        const query = `
            SELECT 
                b.*,
                c.CategoryName,
                GROUP_CONCAT(CONCAT(a.FirstName, ' ', a.LastName) SEPARATOR ', ') as Authors
            FROM Books b
            LEFT JOIN Categories c ON b.CategoryID = c.CategoryID
            LEFT JOIN BookAuthors ba ON b.BookID = ba.BookID
            LEFT JOIN Authors a ON ba.AuthorID = a.AuthorID
            WHERE b.Title LIKE ? OR b.ISBN LIKE ? OR CONCAT(a.FirstName, ' ', a.LastName) LIKE ?
            GROUP BY b.BookID
            ORDER BY b.Title
        `;
        const searchTerm = `%${q}%`;
        const [rows] = await pool.execute(query, [searchTerm, searchTerm, searchTerm]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get member transaction history
app.get('/api/members/:id/transactions', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                t.*,
                b.Title as BookTitle,
                CONCAT(s.FirstName, ' ', s.LastName) as StaffName
            FROM Transactions t
            JOIN Books b ON t.BookID = b.BookID
            JOIN Staff s ON t.StaffID = s.StaffID
            WHERE t.MemberID = ?
            ORDER BY t.TransactionDate DESC
        `;
        const [rows] = await pool.execute(query, [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get book transaction history
app.get('/api/books/:id/transactions', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                t.*,
                CONCAT(m.FirstName, ' ', m.LastName) as MemberName,
                CONCAT(s.FirstName, ' ', s.LastName) as StaffName
            FROM Transactions t
            JOIN Members m ON t.MemberID = m.MemberID
            JOIN Staff s ON t.StaffID = s.StaffID
            WHERE t.BookID = ?
            ORDER BY t.TransactionDate DESC
        `;
        const [rows] = await pool.execute(query, [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Extend deadline for a transaction
app.put('/api/transactions/:id/extend', async (req, res) => {
    try {
        const { id } = req.params;
        const { newDueDate } = req.body;

        // Validate new due date
        if (!newDueDate || isNaN(Date.parse(newDueDate))) {
            return res.status(400).json({ error: 'Invalid due date' });
        }

        const query = `
            UPDATE Transactions 
            SET DueDate = ?
            WHERE TransactionID = ? AND Status = 'Active'
        `;
        const [result] = await pool.execute(query, [newDueDate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transaction not found or not active' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// show first available date for a book
app.get('/api/books/:id/next-available-date', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT 
                MIN(DueDate) as NextAvailableDate
            FROM Transactions
            WHERE BookID = ? AND Status = 'Active'
        `;
        const [rows] = await pool.execute(query, [id]);
        
        if (rows.length === 0 || !rows[0].NextAvailableDate) {
            return res.status(404).json({ error: 'No active transactions found for this book' });
        }
        
        res.json({ nextAvailableDate: rows[0].NextAvailableDate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// request book for purchase

// Routes for different interfaces
app.get('/', (req, res) => {
    res.redirect('/user');
});

app.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff', 'index.html'));
});

app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user', 'index.html'));
});


// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👨‍💼 Staff Interface: http://localhost:${PORT}/staff`);
    console.log(`👤 User Interface: http://localhost:${PORT}/user`);
    await testConnection();
});

module.exports = app;