const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const cors = require('cors'); // Import CORS middleware
const userRoutes = require('./routes/userRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const leaseRoutes = require('./routes/leaseRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const rentInvoiceRoutes = require('./routes/rentInvoiceRoutes');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable CORS for all origins (adjust as necessary for security)
app.use(cors());

// Body parser middleware to handle JSON request bodies
app.use(express.json());

// Multer for file uploads (receipts, ID proofs, etc.)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'receipt') {
      cb(null, 'receipts/');
    } else if (file.fieldname === 'idProof') {
      cb(null, 'uploads/ids/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Routes for file uploads (ID Proofs, Receipts)
app.post('/api/upload/receipt', upload.single('receipt'), (req, res) => {
  res.json({ filePath: `/receipts/${req.file.filename}` });
});

app.post('/api/upload/idProof', upload.single('idProof'), (req, res) => {
  res.json({ filePath: `/uploads/ids/${req.file.filename}` });
});

// Static folder for file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/receipts', express.static(path.join(__dirname, 'receipts'))); // Serve receipts

// API routes
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/invoices', rentInvoiceRoutes); // Rent invoice routes

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handler middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({ message: err.message });
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
