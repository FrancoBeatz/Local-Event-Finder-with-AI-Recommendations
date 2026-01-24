
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for frontend integration

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventpulse';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Event Schema
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  dateTime: { type: String, required: true }, // Storing as string to match frontend ISO format
  category: { 
    type: String, 
    required: true, 
    enum: ['Tech', 'Music', 'Fitness', 'Business', 'Art', 'Food', 'Sports', 'Hobbies'] 
  },
  organizer: { type: String, required: true },
  organizerId: { type: String, required: true },
  imageUrl: { type: String },
  status: { type: String, enum: ['approved', 'flagged', 'pending'], default: 'pending' }
}, { 
  timestamps: true,
  collection: 'events'
});

const Event = mongoose.model('Event', eventSchema);

// --- Endpoints ---

// GET /events - Fetch all events
app.get('/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /events - Create a new event
app.post('/events', async (req, res) => {
  try {
    const eventData = req.body;
    const newEvent = new Event(eventData);
    const savedEvent = await newEvent.save();
    res.status(201).json({ success: true, data: savedEvent });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Event ID already exists.' });
    } else {
      res.status(400).json({ success: false, message: error.message });
    }
  }
});

// PUT /events/:id - Update an event
app.put('/events/:id', async (req, res) => {
  try {
    const updatedEvent = await Event.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedEvent) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, data: updatedEvent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /events/:id - Delete an event
app.delete('/events/:id', async (req, res) => {
  try {
    const deletedEvent = await Event.findOneAndDelete({ id: req.params.id });
    if (!deletedEvent) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
