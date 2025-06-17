-- Library Management System Database Schema
-- This script creates a database schema for a library management system
-- Create database
CREATE DATABASE IF NOT EXISTS library_management;
USE library_management;

-- Create Categories table
CREATE TABLE Categories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(50) UNIQUE NOT NULL,
    Description TEXT
);

-- Create Members table
CREATE TABLE Members (
    MemberID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15),
    Address TEXT,
    DateJoined DATE NOT NULL,
    MembershipType ENUM('Student', 'Faculty', 'Public') NOT NULL
);

-- Create Authors table
CREATE TABLE Authors (
    AuthorID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    DateOfBirth DATE,
    Nationality VARCHAR(50),
    Biography TEXT
);

-- Create Books table
CREATE TABLE Books (
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    ISBN VARCHAR(13) UNIQUE NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Publisher VARCHAR(100),
    PublicationYear INT,
    Pages INT,
    AvailableCopies INT NOT NULL DEFAULT 0,
    TotalCopies INT NOT NULL DEFAULT 0,
    CategoryID INT,
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID),
    CHECK (AvailableCopies <= TotalCopies AND AvailableCopies >= 0)
);

-- Create BookAuthors junction table
CREATE TABLE BookAuthors (
    BookID INT,
    AuthorID INT,
    PRIMARY KEY (BookID, AuthorID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID) ON DELETE CASCADE,
    FOREIGN KEY (AuthorID) REFERENCES Authors(AuthorID) ON DELETE CASCADE
);

-- Create Staff table
CREATE TABLE Staff (
    StaffID INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(15),
    Position VARCHAR(50) NOT NULL,
    Salary DECIMAL(10,2) CHECK (Salary > 0),
    HireDate DATE NOT NULL
);

-- Create Transactions table
CREATE TABLE Transactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT NOT NULL,
    BookID INT NOT NULL,
    StaffID INT NOT NULL,
    TransactionDate DATE NOT NULL,
    DueDate DATE NOT NULL,
    ReturnDate DATE,
    Fine DECIMAL(8,2) DEFAULT 0.00,
    Status ENUM('Active', 'Returned', 'Overdue') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (MemberID) REFERENCES Members(MemberID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID),
    FOREIGN KEY (StaffID) REFERENCES Staff(StaffID),
    CHECK (DueDate > TransactionDate)
);

-- Create Reservations table
CREATE TABLE Reservations (
    ReservationID INT AUTO_INCREMENT PRIMARY KEY,
    MemberID INT NOT NULL,
    BookID INT NOT NULL,
    ReservationDate DATE NOT NULL,
    Status ENUM('Active', 'Fulfilled', 'Cancelled') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (MemberID) REFERENCES Members(MemberID),
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);

-- Insert sample data

-- Categories
INSERT INTO Categories (CategoryName, Description) VALUES
('Fiction', 'Fictional literature including novels and short stories'),
('Non-Fiction', 'Factual books including biographies, history, and science'),
('Science', 'Scientific texts and research publications'),
('Technology', 'Computer science, engineering, and technical books'),
('History', 'Historical accounts and documentation'),
('Biography', 'Life stories of notable individuals'),
('Children', 'Books designed for children and young readers');

-- Authors
INSERT INTO Authors (FirstName, LastName, DateOfBirth, Nationality, Biography) VALUES
('George', 'Orwell', '1903-06-25', 'British', 'English novelist and essayist, journalist and critic'),
('J.K.', 'Rowling', '1965-07-31', 'British', 'British author, best known for the Harry Potter series'),
('Isaac', 'Asimov', '1920-01-02', 'American', 'American writer and professor of biochemistry, known for science fiction'),
('Agatha', 'Christie', '1890-09-15', 'British', 'English writer known for detective novels'),
('Stephen', 'King', '1947-09-21', 'American', 'American author of horror, supernatural fiction, and fantasy'),
('Jane', 'Austen', '1775-12-16', 'British', 'English novelist known for romantic fiction'),
('Mark', 'Twain', '1835-11-30', 'American', 'American writer, humorist, and lecturer');

-- Members
INSERT INTO Members (FirstName, LastName, Email, Phone, Address, DateJoined, MembershipType) VALUES
('John', 'Doe', 'john.doe@email.com', '555-0101', '123 Main St, City', '2024-01-15', 'Student'),
('Jane', 'Smith', 'jane.smith@email.com', '555-0102', '456 Oak Ave, City', '2024-02-01', 'Faculty'),
('Mike', 'Johnson', 'mike.johnson@email.com', '555-0103', '789 Pine Rd, City', '2024-01-20', 'Public'),
('Sarah', 'Brown', 'sarah.brown@email.com', '555-0104', '321 Elm St, City', '2024-03-10', 'Student'),
('David', 'Wilson', 'david.wilson@email.com', '555-0105', '654 Cedar Ave, City', '2024-02-15', 'Faculty');

-- Staff
INSERT INTO Staff (FirstName, LastName, Email, Phone, Position, Salary, HireDate) VALUES
('Alice', 'Manager', 'alice.manager@library.com', '555-1001', 'Head Librarian', 55000.00, '2020-01-15'),
('Bob', 'Assistant', 'bob.assistant@library.com', '555-1002', 'Assistant Librarian', 40000.00, '2021-03-01'),
('Carol', 'Clerk', 'carol.clerk@library.com', '555-1003', 'Library Clerk', 30000.00, '2022-06-15');

-- Books
INSERT INTO Books (ISBN, Title, Publisher, PublicationYear, Pages, AvailableCopies, TotalCopies, CategoryID) VALUES
('9780451524935', '1984', 'Signet Classics', 1949, 328, 3, 5, 1),
('9780439708180', 'Harry Potter and the Sorcerers Stone', 'Scholastic', 1997, 309, 2, 4, 1),
('9780553293357', 'Foundation', 'Bantam Spectra', 1951, 244, 1, 3, 3),
('9780062073488', 'And Then There Were None', 'William Morrow', 1939, 264, 2, 3, 1),
('9781501142970', 'The Shining', 'Scribner', 1977, 447, 1, 2, 1),
('9780141439518', 'Pride and Prejudice', 'Penguin Classics', 1813, 432, 3, 4, 1),
('9780486280615', 'The Adventures of Tom Sawyer', 'Dover Publications', 1876, 224, 2, 3, 7);

-- BookAuthors relationships
INSERT INTO BookAuthors (BookID, AuthorID) VALUES
(1, 1), -- 1984 by George Orwell
(2, 2), -- Harry Potter by J.K. Rowling
(3, 3), -- Foundation by Isaac Asimov
(4, 4), -- And Then There Were None by Agatha Christie
(5, 5), -- The Shining by Stephen King
(6, 6), -- Pride and Prejudice by Jane Austen
(7, 7); -- Tom Sawyer by Mark Twain

-- Sample Transactions
INSERT INTO Transactions (MemberID, BookID, StaffID, TransactionDate, DueDate, Status) VALUES
(1, 1, 1, '2024-04-01', '2024-04-15', 'Active'),
(2, 2, 2, '2024-04-05', '2024-04-19', 'Active'),
(3, 3, 1, '2024-03-20', '2024-04-03', 'Returned'),
(1, 4, 3, '2024-04-10', '2024-04-24', 'Active');

-- Update ReturnDate for returned transaction
UPDATE Transactions SET ReturnDate = '2024-04-02' WHERE TransactionID = 3;

-- Sample Reservations
INSERT INTO Reservations (MemberID, BookID, ReservationDate, Status) VALUES
(4, 5, '2024-04-12', 'Active'),
(5, 2, '2024-04-13', 'Active');

-- Create indexes for better performance
CREATE INDEX idx_books_title ON Books(Title);
CREATE INDEX idx_books_isbn ON Books(ISBN);
CREATE INDEX idx_members_email ON Members(Email);
CREATE INDEX idx_transactions_member ON Transactions(MemberID);
CREATE INDEX idx_transactions_book ON Transactions(BookID);
CREATE INDEX idx_transactions_date ON Transactions(TransactionDate);

-- Create views for common queries
CREATE VIEW BookDetails AS
SELECT 
    b.BookID,
    b.ISBN,
    b.Title,
    b.Publisher,
    b.PublicationYear,
    b.Pages,
    b.AvailableCopies,
    b.TotalCopies,
    c.CategoryName,
    GROUP_CONCAT(CONCAT(a.FirstName, ' ', a.LastName) SEPARATOR ', ') AS Authors
FROM Books b
LEFT JOIN Categories c ON b.CategoryID = c.CategoryID
LEFT JOIN BookAuthors ba ON b.BookID = ba.BookID
LEFT JOIN Authors a ON ba.AuthorID = a.AuthorID
GROUP BY b.BookID;

CREATE VIEW ActiveTransactions AS
SELECT 
    t.TransactionID,
    CONCAT(m.FirstName, ' ', m.LastName) AS MemberName,
    b.Title AS BookTitle,
    t.TransactionDate,
    t.DueDate,
    t.Status,
    DATEDIFF(CURDATE(), t.DueDate) AS DaysOverdue
FROM Transactions t
JOIN Members m ON t.MemberID = m.MemberID
JOIN Books b ON t.BookID = b.BookID
WHERE t.Status IN ('Active', 'Overdue');

-- Trigger to update book availability when transaction is created
DELIMITER //
CREATE TRIGGER UpdateBookAvailability_Insert
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    IF NEW.Status = 'Active' THEN
        UPDATE Books 
        SET AvailableCopies = AvailableCopies - 1 
        WHERE BookID = NEW.BookID AND AvailableCopies > 0;
    END IF;
END//

CREATE TRIGGER UpdateBookAvailability_Update
AFTER UPDATE ON Transactions
FOR EACH ROW
BEGIN
    -- If book is returned
    IF OLD.Status = 'Active' AND NEW.Status = 'Returned' THEN
        UPDATE Books 
        SET AvailableCopies = AvailableCopies + 1 
        WHERE BookID = NEW.BookID;
    END IF;
END//
DELIMITER ;